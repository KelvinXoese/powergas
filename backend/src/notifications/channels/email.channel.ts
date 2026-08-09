import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);
  constructor(private readonly config: ConfigService) {}
  async send(email: string, subject: string, html: string): Promise<boolean> {
    // Real integration: nodemailer transport.sendMail()
    this.logger.log(`[EMAIL] → ${email}: ${subject}`);
    return true;
  }
}
