import { Entity, Column, Index } from 'typeorm';
import { AuditableEntity } from '../../common/entities/base.entity';

/**
 * Commission rules. A null stationId means the platform-wide default;
 * a set stationId overrides commission for that specific station.
 */
@Entity('platform_commissions')
@Index(['stationId'])
export class PlatformCommission extends AuditableEntity {
  @Column({ type: 'uuid', name: 'station_id', nullable: true })
  stationId: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'commission_percent' })
  commissionPercent: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
