import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushChannel {
  private readonly logger = new Logger(PushChannel.name);
  async send(fcmToken: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    // Real integration: Firebase Admin SDK messaging().send()
    this.logger.log(`[PUSH] → ${fcmToken?.slice(0, 12)}...: ${title}`);
    return true;
  }
}
