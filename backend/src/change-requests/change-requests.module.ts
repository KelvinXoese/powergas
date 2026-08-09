import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequestsController } from './change-requests.controller';
import { OrderChangeRequest } from './entities/order-change-request.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentsModule } from '../payments/payments.module';
import { StationsModule } from '../stations/stations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderChangeRequest, Order]),
    PaymentsModule,
    StationsModule,
  ],
  controllers: [ChangeRequestsController],
  providers: [ChangeRequestsService],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
