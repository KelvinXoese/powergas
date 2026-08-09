import { Controller, Get, Post, Patch, Body, Param, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChangeRequestsService } from './change-requests.service';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ApproveChangeRequestDto } from './dto/approve-change-request.dto';
import { StationsService } from '../stations/stations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';

@ApiTags('change-requests')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'change-requests', version: '1' })
export class ChangeRequestsController {
  constructor(
    private readonly changeRequestsService: ChangeRequestsService,
    private readonly stationsService: StationsService,
  ) {}

  @Post()
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Station raises a change request (e.g. rubber needs changing) — photo required' })
  async create(@Body() dto: CreateChangeRequestDto, @CurrentUser() user: User) {
    const stationId = await this.stationsService.resolveStationForUser(user.id);
    if (!stationId) throw new BadRequestException('You are not assigned to a station');
    return this.changeRequestsService.create(dto, stationId, user.id);
  }

  @Get('order/:orderId')
  @Roles(UserRole.CUSTOMER, UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List change requests for an order' })
  async findByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.changeRequestsService.findByOrder(orderId);
  }

  @Patch(':id/approve')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer approves — this is Confirm & Pay in one action, not a separate approval step' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveChangeRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.changeRequestsService.approve(id, user.id, dto.paymentMethod, user.email, user.phone);
  }

  @Patch(':id/reject')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer rejects the change request' })
  async reject(@Param('id', ParseUUIDPipe) id: string, @Body() body: { reason: string }) {
    return this.changeRequestsService.reject(id, body.reason);
  }
}
