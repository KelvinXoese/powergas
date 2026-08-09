import { PaymentMethod } from '../../common/enums';

export interface InitiatePaymentParams {
  reference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone: string;
  metadata?: Record<string, any>;
}

export interface InitiatePaymentResult {
  success: boolean;
  providerReference: string;
  authorizationUrl?: string;
  raw: Record<string, any>;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: 'completed' | 'failed' | 'pending';
  amount: number;
  providerReference: string;
  raw: Record<string, any>;
}

/**
 * Payment abstraction layer.
 * New providers implement this interface and plug in via the factory — no core rewrites.
 */
export interface IPaymentProvider {
  readonly name: string;
  readonly supportedMethods: PaymentMethod[];
  initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verify(reference: string): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
