import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('pricing_history')
@Index(['stationId'])
@Index(['cylinderTypeId'])
export class PricingHistory extends BaseEntity {
  @Column({ type: 'uuid', name: 'station_id' })
  stationId: string;

  @Column({ type: 'uuid', name: 'cylinder_type_id' })
  cylinderTypeId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'exchange_price' })
  exchangePrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'new_price' })
  newPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'refill_price' })
  refillPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'emergency_surcharge' })
  emergencySurcharge: number;

  @Column({ type: 'uuid', nullable: true, name: 'changed_by' })
  changedBy: string | null;
}
