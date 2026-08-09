import { Entity, Column } from 'typeorm';
import { AuditableEntity } from '../../common/entities/base.entity';
import { BatchStatus } from '../../common/enums';

/**
 * A cluster of nearby STANDARD orders assigned to a single rider's loop —
 * this is what actually implements "standard delivery" from the concept
 * doc: spreading one trip's cost across several customers instead of a
 * dedicated trip per order (which is what EXPRESS is for).
 * Orders belong to a batch via Order.batchId.
 */
@Entity('delivery_batches')
export class DeliveryBatch extends AuditableEntity {
  @Column({ type: 'uuid', nullable: true, name: 'rider_id' })
  riderId: string | null;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.PENDING })
  status: BatchStatus;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'centroid_lat' })
  centroidLat: number; // average location of orders in this batch — used to find the nearest rider

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'centroid_lng' })
  centroidLng: number;

  @Column({ type: 'int', name: 'order_count' })
  orderCount: number;
}
