import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { Cylinder, CylinderType } from './entities/cylinder.entity';
import { CylinderInventory } from './entities/cylinder-inventory.entity';
import { PricingHistory } from './entities/pricing-history.entity';
import { CylinderStatus } from '../common/enums';
import { SetPricingDto } from './dto/set-pricing.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Cylinder) private readonly cylinderRepo: Repository<Cylinder>,
    @InjectRepository(CylinderType) private readonly typeRepo: Repository<CylinderType>,
    @InjectRepository(CylinderInventory) private readonly inventoryRepo: Repository<CylinderInventory>,
    @InjectRepository(PricingHistory) private readonly pricingHistoryRepo: Repository<PricingHistory>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Pricing Management ──
  /** Set/update prices for a cylinder type at a station, recording history. */
  async setPricing(stationId: string, dto: SetPricingDto, changedBy: string): Promise<CylinderInventory> {
    const inventory = await this.upsertInventory(stationId, dto.cylinderTypeId, {
      exchangePrice: dto.exchangePrice,
      newPrice: dto.newPrice,
      refillPrice: dto.refillPrice,
      emergencySurcharge: dto.emergencySurcharge,
    });

    // Record an immutable pricing-history row for audit + analytics
    await this.pricingHistoryRepo.save(this.pricingHistoryRepo.create({
      stationId,
      cylinderTypeId: dto.cylinderTypeId,
      exchangePrice: dto.exchangePrice,
      newPrice: dto.newPrice,
      refillPrice: dto.refillPrice,
      emergencySurcharge: dto.emergencySurcharge,
      changedBy,
    }));

    this.logger.log(`Pricing updated for station ${stationId}, type ${dto.cylinderTypeId}`);
    return inventory;
  }

  async getPricingHistory(stationId: string): Promise<PricingHistory[]> {
    return this.pricingHistoryRepo.find({
      where: { stationId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }


  // ── Cylinder Types ──
  async createType(name: string, weightKg: number, description?: string): Promise<CylinderType> {
    return this.typeRepo.save(this.typeRepo.create({ name, weightKg, description }));
  }

  async getTypes(): Promise<CylinderType[]> {
    return this.typeRepo.find({ where: { isActive: true } });
  }

  // ── Individual Cylinders (with QR) ──
  async registerCylinder(data: { serialNumber: string; cylinderTypeId: string; stationId?: string; brand?: string }): Promise<Cylinder> {
    const existing = await this.cylinderRepo.findOne({ where: { serialNumber: data.serialNumber } });
    if (existing) throw new ConflictException('Cylinder serial number already registered');

    const qrPayload = JSON.stringify({ serial: data.serialNumber, id: uuidv4() });
    const qrCode = await QRCode.toDataURL(qrPayload);

    return this.cylinderRepo.save(this.cylinderRepo.create({
      ...data, qrCode, status: CylinderStatus.STATION_OWNED,
    }));
  }

  async updateCylinderStatus(cylinderId: string, status: CylinderStatus, notes?: string): Promise<Cylinder> {
    await this.cylinderRepo.update(cylinderId, { status, notes });
    const cylinder = await this.cylinderRepo.findOne({ where: { id: cylinderId } });
    if (!cylinder) throw new NotFoundException('Cylinder not found');
    return cylinder;
  }

  async getCylinderBySerial(serialNumber: string): Promise<Cylinder> {
    const cylinder = await this.cylinderRepo.findOne({ where: { serialNumber } });
    if (!cylinder) throw new NotFoundException('Cylinder not found');
    return cylinder;
  }

  // ── Aggregate Inventory ──
  async getStationInventory(stationId: string): Promise<CylinderInventory[]> {
    return this.inventoryRepo.find({ where: { stationId } });
  }

  async upsertInventory(stationId: string, cylinderTypeId: string, data: Partial<CylinderInventory>): Promise<CylinderInventory> {
    let inventory = await this.inventoryRepo.findOne({ where: { stationId, cylinderTypeId } });
    if (inventory) {
      await this.inventoryRepo.update(inventory.id, data);
      return this.inventoryRepo.findOneOrFail({ where: { id: inventory.id } });
    }
    return this.inventoryRepo.save(this.inventoryRepo.create({ stationId, cylinderTypeId, ...data }));
  }

  /** Atomic stock adjustment with low-stock alerting. */
  async adjustStock(stationId: string, cylinderTypeId: string, filledDelta: number, emptyDelta: number): Promise<CylinderInventory> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(CylinderInventory, {
        where: { stationId, cylinderTypeId }, lock: { mode: 'pessimistic_write' },
      });
      if (!inventory) throw new NotFoundException('Inventory record not found');

      const newFilled = inventory.filledCount + filledDelta;
      const newEmpty = inventory.emptyCount + emptyDelta;
      if (newFilled < 0 || newEmpty < 0) throw new ConflictException('Stock cannot go negative');

      await manager.update(CylinderInventory, inventory.id, {
        filledCount: newFilled, emptyCount: newEmpty, version: inventory.version + 1,
      });

      const updated = await manager.findOneOrFail(CylinderInventory, { where: { id: inventory.id } });
      if (updated.filledCount - updated.reservedCount <= updated.lowStockThreshold) {
        this.eventEmitter.emit('inventory.low_stock', { stationId, cylinderTypeId, available: updated.filledCount - updated.reservedCount });
        this.logger.warn(`Low stock alert: station ${stationId}, type ${cylinderTypeId}`);
      }
      return updated;
    });
  }

  /** Convert reserved → sold on delivery confirmation. */
  async commitReservation(stationId: string, cylinderTypeId: string, quantity: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(CylinderInventory, {
        where: { stationId, cylinderTypeId }, lock: { mode: 'pessimistic_write' },
      });
      if (!inventory) throw new NotFoundException('Inventory record not found');
      await manager.update(CylinderInventory, inventory.id, {
        filledCount: inventory.filledCount - quantity,
        reservedCount: Math.max(0, inventory.reservedCount - quantity),
        version: inventory.version + 1,
      });
    });
  }

  async getLowStockReport(): Promise<CylinderInventory[]> {
    return this.inventoryRepo.query(
      `SELECT * FROM cylinder_inventory WHERE (filled_count - reserved_count) <= low_stock_threshold AND deleted_at IS NULL`,
    );
  }
}
