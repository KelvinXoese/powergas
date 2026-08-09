import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Cylinder, CylinderType } from './entities/cylinder.entity';
import { CylinderInventory } from './entities/cylinder-inventory.entity';
import { PricingHistory } from './entities/pricing-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cylinder, CylinderType, CylinderInventory, PricingHistory])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
