import { Entity, Column, Index } from 'typeorm';
import { AuditableEntity } from '../../common/entities/base.entity';

/**
 * Platform-wide key/value settings managed by super admin.
 * Examples: default_commission_percent, otp_expiry_minutes, support_email.
 */
@Entity('system_settings')
@Index(['key'], { unique: true })
export class SystemSetting extends AuditableEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'jsonb' })
  value: any;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, default: 'general' })
  category: string;
}
