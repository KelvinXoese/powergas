import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PaymentMethod, PaymentStatus } from '../../common/enums';

@Entity('payments')
@Index(['orderId'])
@Index(['customerId'])
@Index(['reference'], { unique: true })
export class Payment extends BaseEntity {
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  reference: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'idempotency_key' })
  idempotencyKey: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'GHS' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentMethod, name: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null; // 'paystack', 'momo', etc.

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'provider_reference' })
  providerReference: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'provider_response' })
  providerResponse: Record<string, any> | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason: string | null;
}

@Entity('payment_webhooks')
@Index(['provider'])
@Index(['processedAt'])
export class PaymentWebhook extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'event_type' })
  eventType: string | null;

  @Column({ type: 'jsonb', name: 'raw_payload' })
  rawPayload: Record<string, any>;

  @Column({ type: 'boolean', default: false, name: 'is_processed' })
  isProcessed: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'processed_at' })
  processedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'processing_error' })
  processingError: string | null;
}
