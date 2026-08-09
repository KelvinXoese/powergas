import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../common/utils/pagination.util';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async getMine(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.notificationsService.getForUser(user.id, pagination);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread count' })
  async unreadCount(@CurrentUser() user: User) {
    return { count: await this.notificationsService.getUnreadCount(user.id) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    await this.notificationsService.markAsRead(user.id, id);
    return { message: 'Marked as read' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  async markAllRead(@CurrentUser() user: User) {
    await this.notificationsService.markAllAsRead(user.id);
    return { message: 'All marked as read' };
  }
}
