import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification, AuditLog } from './entities/notification.entity';
import { PushChannel } from './channels/push.channel';
import { SmsChannel } from './channels/sms.channel';
import { EmailChannel } from './channels/email.channel';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, AuditLog])],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushChannel, SmsChannel, EmailChannel],
  exports: [NotificationsService],
})
export class NotificationsModule {}
