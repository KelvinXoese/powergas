import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { HealthController } from './health.controller';
import { Order } from '../orders/entities/order.entity';
import { GasStation } from '../stations/entities/gas-station.entity';
import { User } from '../users/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AuditLog } from '../notifications/entities/notification.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { PlatformCommission } from './entities/platform-commission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, GasStation, User, Payment, AuditLog, SystemSetting, PlatformCommission])],
  controllers: [AdminController, HealthController],
  providers: [AdminService],
})
export class AdminModule {}
