import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { OrderTrackingEvent } from '../orders/entities/order-items.entity';
import { RidersModule } from '../riders/riders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderTrackingEvent]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_ACCESS_SECRET') }),
      inject: [ConfigService],
    }),
    RidersModule,
  ],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
