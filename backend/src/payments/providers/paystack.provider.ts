import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IPaymentProvider, InitiatePaymentParams, InitiatePaymentResult, VerifyPaymentResult } from './payment-provider.interface';
import { PaymentMethod } from '../../common/enums';

@Injectable()
export class PaystackProvider implements IPaymentProvider {
  readonly name = 'paystack';
  readonly supportedMethods = [PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER];
  private readonly logger = new Logger(PaystackProvider.name);
  private readonly secretKey: string;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  async initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    this.logger.log(`Initiating Paystack payment: ${params.reference}`);
    return {
      success: true,
      providerReference: `ps_${params.reference}`,
      authorizationUrl: `https://checkout.paystack.com/${params.reference}`,
      raw: { initiated: true },
    };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    this.logger.log(`Verifying Paystack payment: ${reference}`);
    return { success: true, status: 'completed', amount: 0, providerReference: reference, raw: {} };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto.createHmac('sha512', this.secretKey).update(payload).digest('hex');
    return hash === signature;
  }
}
