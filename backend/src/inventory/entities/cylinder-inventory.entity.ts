import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('cylinder_inventory')
@Unique(['stationId', 'cylinderTypeId'])
export class CylinderInventory extends BaseEntity {
  @Column({ type: 'uuid', name: 'station_id' })
  @Index()
  stationId: string;

  @Column({ type: 'uuid', name: 'cylinder_type_id' })
  cylinderTypeId: string;

  @Column({ type: 'int', default: 0, name: 'filled_count' })
  filledCount: number;

  @Column({ type: 'int', default: 0, name: 'empty_count' })
  emptyCount: number;

  @Column({ type: 'int', default: 0, name: 'reserved_count' })
  reservedCount: number;

  @Column({ type: 'int', default: 0, name: 'damaged_count' })
  damagedCount: number;

  @Column({ type: 'int', default: 0, name: 'in_transit_count' })
  inTransitCount: number;

  @Column({ type: 'int', default: 5, name: 'low_stock_threshold' })
  lowStockThreshold: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'exchange_price' })
  exchangePrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'new_price' })
  newPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'refill_price' })
  refillPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'emergency_surcharge' })
  emergencySurcharge: number;

  @Column({ type: 'int', default: 1, name: 'version' }) // Optimistic locking
  version: number;

  get availableForSale(): number {
    return this.filledCount - this.reservedCount;
  }

  get isLowStock(): boolean {
    return this.availableForSale <= this.lowStockThreshold;
  }
}
