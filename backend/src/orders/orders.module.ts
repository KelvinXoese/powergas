import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SettlementService } from './settlement.service';
import { Order } from './entities/order.entity';
import { DeliveryBatch } from './entities/delivery-batch.entity';
import { OrderItem, OrderStatusHistory, OrderTrackingEvent } from './entities/order-items.entity';
import { CylinderInventory } from '../inventory/entities/cylinder-inventory.entity';
import { GasStation } from '../stations/entities/gas-station.entity';
import { PlatformCommission } from '../admin/entities/platform-commission.entity';
import { OrderEventListener } from './events/order-event.listener';
import { PaymentEventListener } from './events/payment-event.listener';
import { BatchingService } from './batching.service';
import { RidersModule } from '../riders/riders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      DeliveryBatch,
      OrderItem,
      OrderStatusHistory,
      OrderTrackingEvent,
      CylinderInventory,
      GasStation,
      PlatformCommission,
    ]),
    RidersModule,
    InventoryModule,
    TrackingModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, SettlementService, OrderEventListener, PaymentEventListener, BatchingService],
  exports: [OrdersService, BatchingService],
})
export class OrdersModule {}
