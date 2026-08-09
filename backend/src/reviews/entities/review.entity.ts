import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('reviews')
@Unique(['orderId', 'reviewerId'])
@Index(['stationId'])
@Index(['riderId'])
export class Review extends BaseEntity {
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'reviewer_id' })
  reviewerId: string;

  @Column({ type: 'uuid', nullable: true, name: 'station_id' })
  stationId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'rider_id' })
  riderId: string | null;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_anonymous' })
  isAnonymous: boolean;
}
