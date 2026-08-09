import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, AuditLog } from './entities/notification.entity';
import { PushChannel } from './channels/push.channel';
import { SmsChannel } from './channels/sms.channel';
import { EmailChannel } from './channels/email.channel';
import { NotificationType } from '../common/enums';
import { PaginationDto, paginate } from '../common/utils/pagination.util';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels?: { push?: boolean; sms?: boolean; email?: boolean };
  fcmToken?: string;
  phone?: string;
  email?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    private readonly push: PushChannel,
    private readonly sms: SmsChannel,
    private readonly email: EmailChannel,
  ) {}

  async send(params: SendNotificationParams): Promise<Notification> {
    const notification = await this.notificationRepo.save(this.notificationRepo.create({
      userId: params.userId, type: params.type, title: params.title, body: params.body, data: params.data,
    }));

    const channels = params.channels || { push: true };
    const result: Partial<Notification> = {};

    if (channels.push && params.fcmToken) {
      result.pushSent = await this.push.send(params.fcmToken, params.title, params.body, params.data);
    }
    if (channels.sms && params.phone) {
      result.smsSent = await this.sms.send(params.phone, params.body);
    }
    if (channels.email && params.email) {
      result.emailSent = await this.email.send(params.email, params.title, params.body);
    }

    await this.notificationRepo.update(notification.id, result);
    return this.notificationRepo.findOneOrFail({ where: { id: notification.id } });
  }

  async getForUser(userId: string, pagination: PaginationDto) {
    const [items, total] = await this.notificationRepo.findAndCount({
      where: { userId }, order: { createdAt: 'DESC' },
      take: pagination.limit, skip: pagination.skip,
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationRepo.update({ id: notificationId, userId }, { isRead: true, readAt: new Date() });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true, readAt: new Date() });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({ where: { userId, isRead: false } });
  }

  /** Write an audit log entry. */
  async audit(data: Partial<AuditLog>): Promise<void> {
    await this.auditRepo.save(this.auditRepo.create(data));
  }
}
