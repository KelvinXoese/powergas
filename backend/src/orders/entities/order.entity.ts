import { Entity, Column, Index } from 'typeorm';
import { AuditableEntity } from '../../common/entities/base.entity';
import { OrderStatus, OrderType, DeliveryTier, PaymentMethod, PaymentStatus } from '../../common/enums';

@Entity('orders')
@Index(['customerId'])
@Index(['stationId'])
@Index(['riderId'])
@Index(['status'])
@Index(['createdAt'])
export class Order extends AuditableEntity {
  @Column({ type: 'varchar', length: 20, unique: true, name: 'order_number' })
  orderNumber: string; // e.g. PG-20240101-0001

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @Column({ type: 'uuid', name: 'station_id' })
  stationId: string;

  @Column({ type: 'uuid', name: 'rider_id', nullable: true })
  riderId: string | null;

  @Column({ type: 'enum', enum: OrderType })
  type: OrderType;

  @Column({ type: 'enum', enum: DeliveryTier, default: DeliveryTier.STANDARD, name: 'delivery_tier' })
  deliveryTier: DeliveryTier; // independent of type — any order can be standard or express

  @Column({ type: 'uuid', nullable: true, name: 'batch_id' })
  batchId: string | null; // set for STANDARD orders once grouped by the batching job

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  // Delivery address snapshot
  @Column({ type: 'text', name: 'delivery_address' })
  deliveryAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true, name: 'delivery_lat' })
  deliveryLat: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true, name: 'delivery_lng' })
  deliveryLng: number | null;

  // Financials
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'subtotal' })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'delivery_fee' })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'emergency_surcharge' })
  emergencySurcharge: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'platform_commission' })
  platformCommission: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'station_earning' })
  stationEarning: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'rider_earning' })
  riderEarning: number;

  // Payment
  @Column({ type: 'enum', enum: PaymentMethod, nullable: true, name: 'payment_method' })
  paymentMethod: PaymentMethod | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING, name: 'payment_status' })
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'payment_reference' })
  paymentReference: string | null;

  // Delivery proof
  @Column({ type: 'varchar', length: 10, nullable: true, name: 'delivery_otp' })
  deliveryOtp: string | null;

  @Column({ type: 'boolean', default: false, name: 'otp_verified' })
  otpVerified: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'proof_of_delivery_url' })
  proofOfDeliveryUrl: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'proof_of_pickup_url' })
  proofOfPickupUrl: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true, name: 'delivery_proof_lat' })
  deliveryProofLat: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true, name: 'delivery_proof_lng' })
  deliveryProofLng: number | null;

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  cancellationReason: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'accepted_at' })
  acceptedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'assigned_at' })
  assignedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'arrived_pickup_at' })
  arrivedPickupAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'picked_up_at' })
  pickedUpAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'arrived_station_at' })
  arrivedStationAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'arrived_delivery_at' })
  arrivedDeliveryAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'delivered_at' })
  deliveredAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'idempotency_key' })
  idempotencyKey: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
