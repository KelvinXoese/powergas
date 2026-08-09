import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { CylinderStatus } from '../../common/enums';

@Entity('cylinder_types')
export class CylinderType extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string; // e.g. "6kg", "12.5kg", "50kg"

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'weight_kg' })
  weightKg: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;
}

@Entity('cylinders')
@Index(['serialNumber'], { unique: true })
@Index(['stationId'])
@Index(['status'])
export class Cylinder extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true, name: 'serial_number' })
  serialNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'qr_code' })
  qrCode: string | null;

  @Column({ type: 'uuid', name: 'cylinder_type_id' })
  cylinderTypeId: string;

  @Column({ type: 'uuid', name: 'station_id', nullable: true })
  stationId: string | null;

  @Column({ type: 'uuid', name: 'owner_id', nullable: true }) // customer or station
  ownerId: string | null;

  @Column({ type: 'varchar', length: 20, name: 'owner_type', nullable: true }) // 'customer' | 'station'
  ownerType: string | null;

  @Column({ type: 'enum', enum: CylinderStatus, default: CylinderStatus.FILLED })
  status: CylinderStatus;

  @Column({ type: 'date', nullable: true, name: 'manufacture_date' })
  manufactureDate: Date | null;

  @Column({ type: 'date', nullable: true, name: 'last_inspection_date' })
  lastInspectionDate: Date | null;

  @Column({ type: 'date', nullable: true, name: 'next_inspection_date' })
  nextInspectionDate: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
