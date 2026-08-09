import { Entity, Column, Index, Unique } from 'typeorm';
import { AuditableEntity } from '../../common/entities/base.entity';
import { UserRole } from '../../common/enums';

/**
 * Links a staff user (STATION_STAFF or STATION_MANAGER) to the station they work at.
 * A user can belong to one station; a station has many staff.
 * This is the authoritative mapping used to scope every station-dashboard request.
 */
@Entity('gas_station_staff')
@Unique(['userId', 'stationId'])
@Index(['userId'])
@Index(['stationId'])
export class GasStationStaff extends AuditableEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'station_id' })
  stationId: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole; // STATION_STAFF | STATION_MANAGER

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;
}
