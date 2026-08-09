import { Controller, Get, Patch, Body, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get my profile' })
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.findByIdOrFail(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update my profile' })
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(user.id, dto);
  }

  @Patch('fcm-token')
  @ApiOperation({ summary: 'Update FCM push token' })
  async updateFcmToken(@CurrentUser() user: User, @Body('token') token: string) {
    await this.usersService.updateFcmToken(user.id, token);
    return { message: 'Token updated' };
  }

  @Patch(':id/suspend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend a user (admin)' })
  async suspend(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.suspend(id);
    return { message: 'User suspended' };
  }
}
