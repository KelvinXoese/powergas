import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProvider, InitiatePaymentParams, InitiatePaymentResult, VerifyPaymentResult } from './payment-provider.interface';
import { PaymentMethod } from '../../common/enums';

@Injectable()
export class MobileMoneyProvider implements IPaymentProvider {
  readonly name = 'mobile_money';
  readonly supportedMethods = [PaymentMethod.MOBILE_MONEY];
  private readonly logger = new Logger(MobileMoneyProvider.name);

  async initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    this.logger.log(`Initiating Mobile Money charge: ${params.reference} on ${params.customerPhone}`);
    return { success: true, providerReference: `momo_${params.reference}`, raw: { prompt: 'sent' } };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    return { success: true, status: 'completed', amount: 0, providerReference: reference, raw: {} };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}
