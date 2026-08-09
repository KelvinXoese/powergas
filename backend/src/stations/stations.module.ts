import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationsService } from './stations.service';
import { StationsController } from './stations.controller';
import { StationDashboardController } from './station-dashboard.controller';
import { StationAnalyticsService } from './station-analytics.service';
import { GasStation } from './entities/gas-station.entity';
import { GasStationStaff } from './entities/gas-station-staff.entity';
import { Order } from '../orders/entities/order.entity';
import { Rider } from '../riders/entities/rider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GasStation, GasStationStaff, Order, Rider])],
  controllers: [StationsController, StationDashboardController],
  providers: [StationsService, StationAnalyticsService],
  exports: [StationsService],
})
export class StationsModule {}
