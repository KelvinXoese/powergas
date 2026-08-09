import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { OrderItem, OrderStatusHistory } from './entities/order-items.entity';
import { GasStation } from '../stations/entities/gas-station.entity';
import { PlatformCommission } from '../admin/entities/platform-commission.entity';
import { RidersService } from '../riders/riders.service';
import { InventoryService } from '../inventory/inventory.service';
import { OrderStatus, WalletTransactionReason } from '../common/enums';

/**
 * Order settlement.
 * On customer confirmation: split the order total into platform commission,
 * station earning, and rider earning; credit the rider wallet; record station
 * revenue; commit the reserved inventory; and advance the order to COMPLETED.
 * Everything runs in one transaction so no money is lost on partial failure.
 */
@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);
  private readonly fallbackCommissionPercent: number;
  private readonly riderSharePercent = 70; // rider keeps 70% of delivery fee

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory) private readonly historyRepo: Repository<OrderStatusHistory>,
    @InjectRepository(GasStation) private readonly stationRepo: Repository<GasStation>,
    @InjectRepository(PlatformCommission) private readonly commissionRepo: Repository<PlatformCommission>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly ridersService: RidersService,
    private readonly inventoryService: InventoryService,
  ) {
    // Last-resort fallback only — used if no PlatformCommission rule exists
    // at all (e.g. a fresh install before an admin has configured anything).
    this.fallbackCommissionPercent = this.config.get<number>('PLATFORM_COMMISSION_PERCENT', 10);
  }

  /**
   * Previously this whole lookup didn't exist — settle() used a single
   * hardcoded env value for every order, completely ignoring
   * PlatformCommission. That made the admin CommissionManagement page
   * purely cosmetic: an admin could set a custom rate for a station, see
   * it saved, and it would never actually apply to a real settlement.
   * Station-specific rule takes priority; falls back to the platform-wide
   * default rule (stationId IS NULL); falls back to the env config only
   * if no rule exists in the database at all.
   */
  private async getCommissionPercent(stationId: string): Promise<number> {
    const stationRule = await this.commissionRepo.findOne({
      where: { stationId, isActive: true },
    });
    if (stationRule) return Number(stationRule.commissionPercent);

    const defaultRule = await this.commissionRepo.findOne({
      where: { stationId: null as any, isActive: true },
    });
    if (defaultRule) return Number(defaultRule.commissionPercent);

    return this.fallbackCommissionPercent;
  }

  async settle(orderId: string): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      this.logger.warn(`Settlement skipped: order ${orderId} not found`);
      return;
    }
    if (order.status === OrderStatus.COMPLETED) {
      return; // idempotent — already settled
    }
    if (order.status !== OrderStatus.CUSTOMER_CONFIRMED) {
      this.logger.warn(`Settlement skipped: order ${order.orderNumber} not confirmed`);
      return;
    }

    // ── Compute the split ──
    const commissionPercent = await this.getCommissionPercent(order.stationId);
    const total = Number(order.total);
    const deliveryFee = Number(order.deliveryFee);
    const platformCommission = Number((total * (commissionPercent / 100)).toFixed(2));
    const riderEarning = Number((deliveryFee * (this.riderSharePercent / 100)).toFixed(2));
    const stationEarning = Number((total - platformCommission - riderEarning).toFixed(2));

    await this.dataSource.transaction(async (manager) => {
      // 1. Persist the financial split + complete the order
      await manager.update(Order, order.id, {
        platformCommission,
        stationEarning,
        riderEarning,
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      });

      // 2. Status history
      await manager.save(OrderStatusHistory, manager.create(OrderStatusHistory, {
        orderId: order.id,
        fromStatus: OrderStatus.CUSTOMER_CONFIRMED,
        toStatus: OrderStatus.COMPLETED,
        changedBy: null,
        notes: `Settled: commission ${platformCommission}, station ${stationEarning}, rider ${riderEarning}`,
      }));

      // 3. Station revenue
      const station = await manager.findOne(GasStation, {
        where: { id: order.stationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (station) {
        await manager.update(GasStation, station.id, {
          totalRevenue: Number(station.totalRevenue) + stationEarning,
        });
      }

      // 4. Commit reserved inventory → actual stock decrement
      const items = await manager.find(OrderItem, { where: { orderId: order.id } });
      for (const item of items) {
        await this.inventoryService.commitReservation(order.stationId, item.cylinderTypeId, item.quantity);
      }
    });

    // 5. Credit the rider wallet (own transaction with pessimistic lock inside RidersService)
    if (order.riderId && riderEarning > 0) {
      await this.ridersService.creditWallet(
        order.riderId,
        riderEarning,
        order.id,
        WalletTransactionReason.DELIVERY_EARNING,
      );
    }

    this.logger.log(`Order ${order.orderNumber} settled and completed`);
  }
}
