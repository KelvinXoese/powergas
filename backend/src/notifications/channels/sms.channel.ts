import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);
  constructor(private readonly config: ConfigService) {}
  async send(phone: string, message: string): Promise<boolean> {
    // Real integration: Twilio client.messages.create()
    this.logger.log(`[SMS] → ${phone}: ${message.slice(0, 40)}`);
    return true;
  }
}
