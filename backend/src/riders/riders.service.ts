import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Rider } from './entities/rider.entity';
import { RiderWallet } from './entities/rider-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { RiderStatus, WalletTransactionType, WalletTransactionReason, VerificationStatus } from '../common/enums';
import { PaginationDto, paginate } from '../common/utils/pagination.util';

@Injectable()
export class RidersService {
  private readonly logger = new Logger(RidersService.name);

  constructor(
    @InjectRepository(Rider) private readonly riderRepo: Repository<Rider>,
    @InjectRepository(RiderWallet) private readonly walletRepo: Repository<RiderWallet>,
    @InjectRepository(WalletTransaction) private readonly txRepo: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async createProfile(userId: string, stationId?: string): Promise<Rider> {
    const rider = await this.riderRepo.save(this.riderRepo.create({ userId, stationId }));
    await this.walletRepo.save(this.walletRepo.create({ riderId: rider.id }));
    return rider;
  }

  async findByUserId(userId: string): Promise<Rider> {
    const rider = await this.riderRepo.findOne({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider profile not found');
    return rider;
  }

  async findById(riderId: string): Promise<Rider> {
    const rider = await this.riderRepo.findOne({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    return rider;
  }

  /** Admin-facing list — previously there was no way to even browse
   *  riders at all, let alone review their verification. */
  async findAll(pagination: PaginationDto) {
    const [items, total] = await this.riderRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }

  /**
   * Admin reviews a rider's Ghana Card, liveness scan, and tricycle
   * registration, and approves or rejects. This was entirely missing —
   * combined with acceptOrder() and findNearestAvailable() both now
   * requiring VERIFIED (added earlier), there was previously no way for
   * ANY rider to ever become verified, meaning no rider could ever accept
   * a single job. This is what actually closes that loop.
   */
  async reviewVerification(
    riderId: string,
    status: VerificationStatus.VERIFIED | VerificationStatus.REJECTED,
  ): Promise<Rider> {
    await this.riderRepo.update(riderId, { verificationStatus: status });
    return this.findById(riderId);
  }

  async setAvailability(riderId: string, status: RiderStatus): Promise<Rider> {
    await this.riderRepo.update(riderId, { status });
    return this.riderRepo.findOneOrFail({ where: { id: riderId } });
  }

  async updateLocation(riderId: string, lat: number, lng: number): Promise<void> {
    await this.riderRepo.update(riderId, {
      currentLat: lat, currentLng: lng, locationUpdatedAt: new Date(),
    });
  }

  /** Find nearest available riders for assignment using Haversine in SQL. */
  /** Only VERIFIED riders are matchable — an unverified rider (Ghana Card,
   *  liveness, tricycle registration not yet all confirmed) shouldn't be
   *  handed jobs by the system any more than they should be able to
   *  accept() one themselves (see OrdersService.acceptOrder). */
  async findNearestAvailable(lat: number, lng: number, radiusKm = 10, limit = 5): Promise<Rider[]> {
    return this.riderRepo.query(
      `SELECT *, (6371 * acos(cos(radians($1)) * cos(radians(current_lat)) *
       cos(radians(current_lng) - radians($2)) + sin(radians($1)) * sin(radians(current_lat)))) AS distance
       FROM riders WHERE status = 'AVAILABLE' AND verification_status = 'VERIFIED'
       AND current_lat IS NOT NULL AND deleted_at IS NULL
       HAVING (6371 * acos(cos(radians($1)) * cos(radians(current_lat)) *
       cos(radians(current_lng) - radians($2)) + sin(radians($1)) * sin(radians(current_lat)))) < $3
       ORDER BY distance ASC LIMIT $4`,
      [lat, lng, radiusKm, limit],
    );
  }

  async getWallet(riderId: string): Promise<RiderWallet> {
    const wallet = await this.walletRepo.findOne({ where: { riderId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  /** Credit rider earnings atomically with optimistic locking. */
  async creditWallet(riderId: string, amount: number, orderId: string, reason: WalletTransactionReason): Promise<WalletTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(RiderWallet, { where: { riderId }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const newBalance = Number(wallet.availableBalance) + amount;
      await manager.update(RiderWallet, wallet.id, {
        availableBalance: newBalance,
        totalEarned: Number(wallet.totalEarned) + amount,
        version: wallet.version + 1,
      });

      return manager.save(WalletTransaction, manager.create(WalletTransaction, {
        walletId: wallet.id, riderId, type: WalletTransactionType.CREDIT,
        reason, amount, balanceAfter: newBalance, orderId,
      }));
    });
  }

  async requestWithdrawal(riderId: string, amount: number): Promise<WalletTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(RiderWallet, { where: { riderId }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (Number(wallet.availableBalance) < amount) throw new BadRequestException('Insufficient balance');

      const newBalance = Number(wallet.availableBalance) - amount;
      await manager.update(RiderWallet, wallet.id, {
        availableBalance: newBalance,
        totalWithdrawn: Number(wallet.totalWithdrawn) + amount,
        version: wallet.version + 1,
      });

      return manager.save(WalletTransaction, manager.create(WalletTransaction, {
        walletId: wallet.id, riderId, type: WalletTransactionType.DEBIT,
        reason: WalletTransactionReason.WITHDRAWAL, amount, balanceAfter: newBalance,
      }));
    });
  }

  async getTransactions(riderId: string): Promise<WalletTransaction[]> {
    return this.txRepo.find({ where: { riderId }, order: { createdAt: 'DESC' }, take: 100 });
  }
}
