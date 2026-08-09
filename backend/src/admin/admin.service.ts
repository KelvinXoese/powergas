import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { GasStation } from '../stations/entities/gas-station.entity';
import { User } from '../users/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AuditLog } from '../notifications/entities/notification.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { PlatformCommission } from './entities/platform-commission.entity';
import { OrderStatus, PaymentStatus } from '../common/enums';
import { PaginationDto, paginate } from '../common/utils/pagination.util';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(GasStation) private readonly stationRepo: Repository<GasStation>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(SystemSetting) private readonly settingRepo: Repository<SystemSetting>,
    @InjectRepository(PlatformCommission) private readonly commissionRepo: Repository<PlatformCommission>,
  ) {}

  // ── Commission Management ──
  async getCommissions() {
    return this.commissionRepo.find({ order: { createdAt: 'DESC' } });
  }

  async setCommission(commissionPercent: number, stationId: string | null, changedBy: string) {
    if (commissionPercent < 0 || commissionPercent > 100) {
      throw new Error('Commission must be between 0 and 100');
    }
    // Deactivate the previous rule for the SAME scope only. Using `null`
    // here (not `undefined`) matters: TypeORM translates a `null` where-value
    // to `IS NULL` correctly, but silently DROPS `undefined` conditions
    // entirely — meaning the old `stationId ?? undefined` version would
    // deactivate every commission rule in the table (including unrelated
    // station-specific overrides) any time a new platform-wide default was set.
    await this.commissionRepo.update({ stationId: stationId, isActive: true }, { isActive: false });
    return this.commissionRepo.save(this.commissionRepo.create({
      stationId, commissionPercent, isActive: true, createdBy: changedBy,
    }));
  }

  // ── System Settings ──
  async getSettings() {
    return this.settingRepo.find({ order: { category: 'ASC', key: 'ASC' } });
  }

  async upsertSetting(key: string, value: any, category: string, changedBy: string) {
    const existing = await this.settingRepo.findOne({ where: { key } });
    if (existing) {
      await this.settingRepo.update(existing.id, { value, category, updatedBy: changedBy });
      return this.settingRepo.findOneOrFail({ where: { id: existing.id } });
    }
    return this.settingRepo.save(this.settingRepo.create({ key, value, category, createdBy: changedBy }));
  }

  /** Platform-wide analytics dashboard. */
  async getPlatformAnalytics() {
    const [totalUsers, totalStations, totalOrders, completedOrders] = await Promise.all([
      this.userRepo.count(),
      this.stationRepo.count({ where: { isActive: true } }),
      this.orderRepo.count(),
      this.orderRepo.count({ where: { status: OrderStatus.COMPLETED } }),
    ]);

    const revenue = await this.paymentRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const commission = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.platform_commission)', 'total')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    return {
      totalUsers,
      totalStations,
      totalOrders,
      completedOrders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      totalRevenue: parseFloat(revenue?.total || '0'),
      platformCommission: parseFloat(commission?.total || '0'),
    };
  }

  async getFinancialReport(startDate: string, endDate: string) {
    return this.orderRepo
      .createQueryBuilder('o')
      .select('DATE(o.created_at)', 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(o.total)', 'revenue')
      .addSelect('SUM(o.platform_commission)', 'commission')
      .addSelect('SUM(o.station_earning)', 'stationEarnings')
      .addSelect('SUM(o.rider_earning)', 'riderEarnings')
      .where('o.created_at BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('o.status = :status', { status: OrderStatus.COMPLETED })
      .groupBy('DATE(o.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async getAuditLogs(pagination: PaginationDto) {
    const [items, total] = await this.auditRepo.findAndCount({
      order: { createdAt: 'DESC' }, take: pagination.limit, skip: pagination.skip,
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }

  async getAllUsers(pagination: PaginationDto) {
    const [items, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' }, take: pagination.limit, skip: pagination.skip,
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }

  async getStationRevenue(stationId: string) {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.station_earning)', 'totalEarnings')
      .addSelect('COUNT(*)', 'totalOrders')
      .where('o.station_id = :id', { id: stationId })
      .andWhere('o.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();
    return {
      totalEarnings: parseFloat(result?.totalEarnings || '0'),
      totalOrders: parseInt(result?.totalOrders || '0', 10),
    };
  }
}
