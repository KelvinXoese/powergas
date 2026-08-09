import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RidersService } from './riders.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, RiderStatus } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../common/utils/pagination.util';

@ApiTags('riders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'riders', version: '1' })
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all riders (admin) — previously no way to browse riders existed at all' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.ridersService.findAll(pagination);
  }

  @Get('me')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Get my rider profile' })
  async me(@CurrentUser() user: User) {
    return this.ridersService.findByUserId(user.id);
  }

  @Patch('availability')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Toggle availability' })
  async setAvailability(@CurrentUser() user: User, @Body('status') status: RiderStatus) {
    const rider = await this.ridersService.findByUserId(user.id);
    return this.ridersService.setAvailability(rider.id, status);
  }

  @Get('wallet')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Get my wallet' })
  async getWallet(@CurrentUser() user: User) {
    const rider = await this.ridersService.findByUserId(user.id);
    return this.ridersService.getWallet(rider.id);
  }

  @Get('wallet/transactions')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Get wallet transactions' })
  async getTransactions(@CurrentUser() user: User) {
    const rider = await this.ridersService.findByUserId(user.id);
    return this.ridersService.getTransactions(rider.id);
  }

  @Post('wallet/withdraw')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Request a withdrawal' })
  async withdraw(@CurrentUser() user: User, @Body('amount') amount: number) {
    const rider = await this.ridersService.findByUserId(user.id);
    return this.ridersService.requestWithdrawal(rider.id, amount);
  }

  @Get('nearest')
  @Roles(UserRole.STATION_STAFF, UserRole.STATION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Find nearest available riders' })
  async findNearest(@Query('lat') lat: number, @Query('lng') lng: number, @Query('radius') radius?: number) {
    return this.ridersService.findNearestAvailable(Number(lat), Number(lng), radius ? Number(radius) : 10);
  }

  @Patch(':id/verification')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Admin approves or rejects a rider's Ghana Card/liveness/tricycle verification" })
  async reviewVerification(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewVerificationDto) {
    return this.ridersService.reviewVerification(id, dto.status as any);
  }
}
