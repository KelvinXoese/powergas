import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('rider_wallets')
export class RiderWallet extends BaseEntity {
  @Column({ type: 'uuid', name: 'rider_id', unique: true })
  @Index()
  riderId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'available_balance' })
  availableBalance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'pending_balance' })
  pendingBalance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_earned' })
  totalEarned: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_withdrawn' })
  totalWithdrawn: number;

  @Column({ type: 'varchar', length: 10, default: 'GHS' })
  currency: string;

  @Column({ type: 'int', default: 1, name: 'version' }) // Optimistic locking
  version: number;
}
