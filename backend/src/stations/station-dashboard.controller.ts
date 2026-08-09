import { Controller, Get, Query, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StationAnalyticsService } from './station-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { PaginationDto } from '../common/utils/pagination.util';

@ApiTags('station-dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'station-dashboard', version: '1' })
export class StationDashboardController {
  constructor(private readonly analytics: StationAnalyticsService) {}

  @Get(':stationId/overview')
  @ApiOperation({ summary: "This station's headline metrics" })
  async overview(@Param('stationId', ParseUUIDPipe) stationId: string) {
    return this.analytics.getOverview(stationId);
  }

  @Get(':stationId/revenue-series')
  @ApiOperation({ summary: "This station's daily revenue series" })
  async revenue(@Param('stationId', ParseUUIDPipe) stationId: string, @Query('days') days?: number) {
    return this.analytics.getRevenueSeries(stationId, days ? Number(days) : 7);
  }

  @Get(':stationId/riders')
  @ApiOperation({ summary: "Riders attached to this station" })
  async riders(@Param('stationId', ParseUUIDPipe) stationId: string) {
    return this.analytics.getRiders(stationId);
  }

  @Get(':stationId/customers')
  @ApiOperation({ summary: "Customers who ordered from this station" })
  async customers(@Param('stationId', ParseUUIDPipe) stationId: string, @Query() pagination: PaginationDto) {
    return this.analytics.getCustomers(stationId, pagination);
  }
}
