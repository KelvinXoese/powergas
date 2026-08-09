import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { NotificationType } from '../../common/enums';

@Entity('notifications')
@Index(['userId'])
@Index(['isRead'])
@Index(['createdAt'])
export class Notification extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  readAt: Date | null;

  @Column({ type: 'boolean', default: false, name: 'push_sent' })
  pushSent: boolean;

  @Column({ type: 'boolean', default: false, name: 'sms_sent' })
  smsSent: boolean;

  @Column({ type: 'boolean', default: false, name: 'email_sent' })
  emailSent: boolean;
}

@Entity('audit_logs')
@Index(['userId'])
@Index(['action'])
@Index(['resourceType'])
@Index(['createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  @Column({ type: 'varchar', length: 100 })
  action: string; // e.g. 'ORDER_CREATED', 'USER_BANNED'

  @Column({ type: 'varchar', length: 100, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'uuid', nullable: true, name: 'resource_id' })
  resourceId: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'old_value' })
  oldValue: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'new_value' })
  newValue: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
