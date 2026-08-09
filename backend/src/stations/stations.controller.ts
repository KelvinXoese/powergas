import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStockStatusDto } from './dto/update-stock-status.dto';
import { UpdateOpenStatusDto } from './dto/update-open-status.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../common/utils/pagination.util';

@ApiTags('stations')
@Controller({ path: 'stations', version: '1' })
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all active stations' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.stationsService.findAll(pagination);
  }

  @Public()
  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby stations' })
  async findNearby(@Query('lat') lat: number, @Query('lng') lng: number, @Query('radius') radius?: number) {
    return this.stationsService.findNearby(Number(lat), Number(lng), radius ? Number(radius) : 15);
  }

  @Get('my-station')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Resolve the station the current staff user belongs to' })
  async myStation(@CurrentUser() user: User) {
    const stationId = await this.stationsService.resolveStationForUser(user.id);
    if (!stationId) return { stationId: null, station: null };
    const station = await this.stationsService.findById(stationId);
    return { stationId, station };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get station details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stationsService.findById(id);
  }

  @Get(':id/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List staff assigned to a station' })
  async getStaff(@Param('id', ParseUUIDPipe) id: string) {
    return this.stationsService.getStaff(id);
  }

  @Post(':id/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign a staff/manager user to a station' })
  async assignStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { userId: string; role: UserRole },
    @CurrentUser() user: User,
  ) {
    return this.stationsService.assignStaff(id, body.userId, body.role, user.id);
  }

  @Delete(':id/staff/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a staff member from a station' })
  async removeStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ) {
    await this.stationsService.removeStaff(id, userId, user.id);
    return { message: 'Staff removed' };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a station' })
  async create(@Body() dto: CreateStationDto, @CurrentUser() user: User) {
    return this.stationsService.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a station' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateStationDto>, @CurrentUser() user: User) {
    return this.stationsService.update(id, dto, user.id);
  }

  @Patch(':id/stock-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update station stock status (Available / Shortage / Out of Stock) — separate from open/closed' })
  async updateStockStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.stationsService.updateStockStatus(id, dto.stockStatus, user.id);
  }

  @Patch(':id/open-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle the station open/closed — separate from stock status' })
  async updateOpenStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpenStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.stationsService.updateOpenStatus(id, dto.isActive, user.id);
  }

  @Patch(':id/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin approves or rejects a station\'s submitted safety/licensing documents' })
  async reviewVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewVerificationDto,
    @CurrentUser() user: User,
  ) {
    return this.stationsService.reviewVerification(id, dto.status as any, user.id);
  }

  @Post(':id/false-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Rider reports arriving to find no stock despite an AVAILABLE listing' })
  async reportFalseAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.stationsService.reportFalseAvailability(id);
  }
}
