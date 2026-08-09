import { Entity, Column, Index } from 'typeorm';
import { AuditableEntity } from '../../common/entities/base.entity';
import { ChangeRequestStatus } from '../../common/enums';

/**
 * A station-raised scope/price change mid-order — e.g. during inspection the
 * station finds the rubber needs changing, something the customer didn't
 * know about when they booked. Requires a photo. The customer's approval
 * IS the payment (single Confirm & Pay action, see payments flow) — there is
 * no separate "approve" step before payment; approving triggers the charge.
 */
@Entity('order_change_requests')
@Index(['orderId'])
@Index(['status'])
export class OrderChangeRequest extends AuditableEntity {
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'station_id' })
  stationId: string;

  @Column({ type: 'uuid', name: 'raised_by' })
  raisedBy: string; // station staff user id

  @Column({ type: 'text' })
  description: string; // e.g. "Rubber seal is worn and needs replacing"

  @Column({ type: 'varchar', length: 500, name: 'photo_url' })
  photoUrl: string; // required — see concept doc, photo is mandatory evidence

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'additional_amount' })
  additionalAmount: number;

  @Column({ type: 'enum', enum: ChangeRequestStatus, default: ChangeRequestStatus.PENDING })
  status: ChangeRequestStatus;

  // Set once the customer's Confirm & Pay succeeds for this change request
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'payment_reference' })
  paymentReference: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'responded_at' })
  respondedAt: Date | null;
}
