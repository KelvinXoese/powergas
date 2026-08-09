import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, DisputeStatus } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../common/utils/pagination.util';

@ApiTags('disputes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'disputes', version: '1' })
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Open a dispute' })
  async create(@CurrentUser() user: User, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(user.id, dto);
  }

  @Get('mine')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get my disputes' })
  async mine(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.disputesService.findByCustomer(user.id, pagination);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all disputes' })
  async findAll(@Query() pagination: PaginationDto, @Query('status') status?: DisputeStatus) {
    return this.disputesService.findAll(pagination, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.disputesService.findById(id);
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign dispute to admin' })
  async assign(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.disputesService.assignAdmin(id, user.id);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Resolve a dispute' })
  async resolve(@Param('id', ParseUUIDPipe) id: string, @Body() body: { resolution: string; refundAmount?: number }, @CurrentUser() user: User) {
    return this.disputesService.resolve(id, user.id, body.resolution, body.refundAmount);
  }
}
