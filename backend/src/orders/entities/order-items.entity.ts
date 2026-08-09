import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { OrderStatus } from '../../common/enums';

@Entity('order_items')
@Index(['orderId'])
export class OrderItem extends BaseEntity {
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'cylinder_type_id' })
  cylinderTypeId: string;

  @Column({ type: 'varchar', length: 100, name: 'cylinder_type_name' })
  cylinderTypeName: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_price' })
  totalPrice: number;

  @Column({ type: 'uuid', nullable: true, name: 'cylinder_id' }) // assigned cylinder
  cylinderId: string | null;
}

@Entity('order_status_history')
@Index(['orderId'])
export class OrderStatusHistory extends BaseEntity {
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'enum', enum: OrderStatus, name: 'from_status', nullable: true })
  fromStatus: OrderStatus | null;

  @Column({ type: 'enum', enum: OrderStatus, name: 'to_status' })
  toStatus: OrderStatus;

  @Column({ type: 'uuid', nullable: true, name: 'changed_by' })
  changedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}

@Entity('order_tracking_events')
@Index(['orderId'])
@Index(['riderId'])
export class OrderTrackingEvent extends BaseEntity {
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'rider_id' })
  riderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  speed: number | null; // km/h

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  heading: number | null; // degrees

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'distance_to_destination' })
  distanceToDestination: number | null; // meters

  @Column({ type: 'int', nullable: true, name: 'eta_seconds' })
  etaSeconds: number | null;
}
