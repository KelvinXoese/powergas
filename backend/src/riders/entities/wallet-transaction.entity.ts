import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { WalletTransactionType, WalletTransactionReason } from '../../common/enums';

@Entity('wallet_transactions')
@Index(['walletId'])
@Index(['riderId'])
export class WalletTransaction extends BaseEntity {
  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId: string;

  @Column({ type: 'uuid', name: 'rider_id' })
  riderId: string;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type: WalletTransactionType;

  @Column({ type: 'enum', enum: WalletTransactionReason })
  reason: WalletTransactionReason;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'uuid', nullable: true, name: 'order_id' })
  orderId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'reference' })
  reference: string | null;
}
