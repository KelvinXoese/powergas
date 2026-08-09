import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { BatchingService } from './batching.service';
import { RidersService } from '../riders/riders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { toCustomerOrderView, toCustomerOrderViews, toStationOrderViews } from './utils/order-view.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, OrderStatus } from '../common/enums';
import { PaginationDto } from '../common/utils/pagination.util';
import { User } from '../users/entities/user.entity';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly batchingService: BatchingService,
    private readonly ridersService: RidersService,
  ) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Create a new order' })
  async create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    const order = await this.ordersService.create(user.id, dto);
    return toCustomerOrderView(order);
  }

  @Get()
  @ApiOperation({ summary: 'Get my orders (role-based)' })
  async findMine(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    if (user.role === UserRole.CUSTOMER) {
      const result = await this.ordersService.findByCustomer(user.id, pagination);
      return { ...result, items: toCustomerOrderViews(result.items) };
    }
    if (user.role === UserRole.RIDER) {
      const rider = await this.ridersService.findByUserId(user.id);
      return this.ordersService.findByRider(rider.id, pagination);
    }
    return { message: 'Use role-specific endpoints' };
  }

  @Get('station/:stationId')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get orders for a station' })
  async findByStation(
    @Param('stationId', ParseUUIDPipe) stationId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.ordersService.findByStation(stationId, pagination);
    const isStationRole = user.role === UserRole.STATION_STAFF || user.role === UserRole.STATION_MANAGER;
    return isStationRole ? { ...result, items: toStationOrderViews(result.items) } : result;
  }

  @Get('available/nearby')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Browse unclaimed nearby orders to accept — like a Bolt driver\'s incoming job feed' })
  async findAvailableNearby(@Query('lat') lat: number, @Query('lng') lng: number, @Query('radius') radius?: number) {
    return this.ordersService.findAvailableNearby(Number(lat), Number(lng), radius ? Number(radius) : 10);
  }

  @Post('batches/run')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually trigger a batching cycle now (normally runs every 5 minutes) — for testing' })
  async runBatchingNow() {
    await this.batchingService.runBatchingCycle();
    return { triggered: true };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const order = await this.ordersService.findById(id);
    if (user.role === UserRole.CUSTOMER) return toCustomerOrderView(order);
    if (user.role === UserRole.STATION_STAFF || user.role === UserRole.STATION_MANAGER) {
      return toStationOrderViews([order])[0];
    }
    return order;
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get order status history' })
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getOrderStatusHistory(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update order status. RIDER_ARRIVED_PICKUP, AT_STATION, RIDER_ARRIVED_DELIVERY, and DELIVERED are proximity-gated — rejected if the rider is not verifiably at the relevant location.' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: OrderStatus,
    @Body('notes') notes: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateStatus(id, status, user.id, notes);
  }

  @Post(':id/confirm-delivery')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Confirm delivery with OTP' })
  async confirmDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('otp') otp: string,
    @Body('proofUrl') proofUrl: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.confirmDelivery(id, user.id, otp, proofUrl);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Rider accepts an order — first to accept wins (race), like Bolt. For STANDARD orders, also auto-bundles nearby unclaimed orders headed to the same station, up to a small cap.' })
  async accept(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const rider = await this.ridersService.findByUserId(user.id);
    return this.ordersService.acceptOrder(id, rider.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.cancel(id, user.id, reason, user.role);
  }

  @Patch(':id/assign-rider')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a rider to an order' })
  async assignRider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('riderId') riderId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.assignRider(id, riderId, user.id);
  }
}
