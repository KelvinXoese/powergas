import { Controller, Get, Post, Patch, Put, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole, CylinderStatus } from '../common/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SetPricingDto } from './dto/set-pricing.dto';

@ApiTags('inventory')
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Public()
  @Get('types')
  @ApiOperation({ summary: 'List cylinder types' })
  async getTypes() {
    return this.inventoryService.getTypes();
  }

  @Post('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a cylinder type' })
  async createType(@Body() body: { name: string; weightKg: number; description?: string }) {
    return this.inventoryService.createType(body.name, body.weightKg, body.description);
  }

  @Post('cylinders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a cylinder' })
  async registerCylinder(@Body() body: { serialNumber: string; cylinderTypeId: string; stationId?: string; brand?: string }) {
    return this.inventoryService.registerCylinder(body);
  }

  @Get('cylinders/:serial')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lookup cylinder by serial / QR' })
  async getCylinder(@Param('serial') serial: string) {
    return this.inventoryService.getCylinderBySerial(serial);
  }

  @Patch('cylinders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update cylinder status' })
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: CylinderStatus, @Body('notes') notes?: string) {
    return this.inventoryService.updateCylinderStatus(id, status, notes);
  }

  @Get('station/:stationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get station inventory' })
  async getStationInventory(@Param('stationId', ParseUUIDPipe) stationId: string) {
    return this.inventoryService.getStationInventory(stationId);
  }

  @Patch('station/:stationId/adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Adjust stock levels' })
  async adjustStock(@Param('stationId', ParseUUIDPipe) stationId: string, @Body() body: { cylinderTypeId: string; filledDelta: number; emptyDelta: number }) {
    return this.inventoryService.adjustStock(stationId, body.cylinderTypeId, body.filledDelta, body.emptyDelta);
  }

  @Get('reports/low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Low stock report' })
  async lowStock() {
    return this.inventoryService.getLowStockReport();
  }

  @Put('station/:stationId/pricing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Set pricing for a cylinder type at this station' })
  async setPricing(
    @Param('stationId', ParseUUIDPipe) stationId: string,
    @Body() dto: SetPricingDto,
    @CurrentUser() user: User,
  ) {
    return this.inventoryService.setPricing(stationId, dto, user.id);
  }

  @Get('station/:stationId/pricing-history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Pricing change history for a station' })
  async pricingHistory(@Param('stationId', ParseUUIDPipe) stationId: string) {
    return this.inventoryService.getPricingHistory(stationId);
  }
}
