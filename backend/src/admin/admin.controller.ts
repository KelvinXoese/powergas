import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { PaginationDto } from '../common/utils/pagination.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Platform analytics dashboard' })
  async analytics() {
    return this.adminService.getPlatformAnalytics();
  }

  @Get('financial-report')
  @ApiOperation({ summary: 'Financial report by date range' })
  async financialReport(@Query('start') start: string, @Query('end') end: string) {
    return this.adminService.getFinancialReport(start, end);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'View audit logs' })
  async auditLogs(@Query() pagination: PaginationDto) {
    return this.adminService.getAuditLogs(pagination);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async users(@Query() pagination: PaginationDto) {
    return this.adminService.getAllUsers(pagination);
  }

  @Get('stations/:id/revenue')
  @ApiOperation({ summary: 'Station revenue summary' })
  async stationRevenue(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getStationRevenue(id);
  }

  // ── Commission Management ──
  @Get('commissions')
  @ApiOperation({ summary: 'List commission rules' })
  async commissions() {
    return this.adminService.getCommissions();
  }

  @Post('commissions')
  @ApiOperation({ summary: 'Set platform or per-station commission' })
  async setCommission(
    @Body() body: { commissionPercent: number; stationId?: string },
    @CurrentUser() user: User,
  ) {
    return this.adminService.setCommission(body.commissionPercent, body.stationId ?? null, user.id);
  }

  // ── System Settings ──
  @Get('settings')
  @ApiOperation({ summary: 'List system settings' })
  async settings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Create or update a system setting' })
  async upsertSetting(
    @Body() body: { key: string; value: any; category?: string },
    @CurrentUser() user: User,
  ) {
    return this.adminService.upsertSetting(body.key, body.value, body.category ?? 'general', user.id);
  }
}
