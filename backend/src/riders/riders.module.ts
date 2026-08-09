import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidersService } from './riders.service';
import { RidersController } from './riders.controller';
import { Rider } from './entities/rider.entity';
import { RiderWallet } from './entities/rider-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rider, RiderWallet, WalletTransaction])],
  controllers: [RidersController],
  providers: [RidersService],
  exports: [RidersService],
})
export class RidersModule {}
