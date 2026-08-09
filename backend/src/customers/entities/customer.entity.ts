import { Entity, Column, OneToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('customers')
export class Customer extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id', unique: true })
  @Index()
  userId: string;

  @OneToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'average_rating' })
  averageRating: number;

  @Column({ type: 'int', default: 0, name: 'total_orders' })
  totalOrders: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_spent' })
  totalSpent: number;

  @Column({ type: 'boolean', default: true, name: 'receive_sms' })
  receiveSms: boolean;

  @Column({ type: 'boolean', default: true, name: 'receive_email' })
  receiveEmail: boolean;

  @Column({ type: 'boolean', default: true, name: 'receive_push' })
  receivePush: boolean;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: Record<string, any> | null;
}
