import { Entity, Column, Index } from 'typeorm';
import { AuditableEntity } from '../../common/entities/base.entity';
import { DisputeStatus, DisputeType } from '../../common/enums';

@Entity('disputes')
@Index(['orderId'])
@Index(['customerId'])
@Index(['status'])
export class Dispute extends AuditableEntity {
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @Column({ type: 'uuid', nullable: true, name: 'assigned_admin_id' })
  assignedAdminId: string | null;

  @Column({ type: 'enum', enum: DisputeType })
  type: DisputeType;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'refund_amount' })
  refundAmount: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'evidence_urls' })
  evidenceUrls: string[] | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null;
}
