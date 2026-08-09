import { Injectable, BadRequestException } from '@nestjs/common';
import { PaystackProvider } from './paystack.provider';
import { MobileMoneyProvider } from './mobile-money.provider';
import { IPaymentProvider } from './payment-provider.interface';
import { PaymentMethod } from '../../common/enums';

@Injectable()
export class PaymentProviderFactory {
  private readonly providers: IPaymentProvider[];

  constructor(paystack: PaystackProvider, momo: MobileMoneyProvider) {
    this.providers = [paystack, momo];
  }

  getProviderForMethod(method: PaymentMethod): IPaymentProvider {
    const provider = this.providers.find((p) => p.supportedMethods.includes(method));
    if (!provider) throw new BadRequestException(`No provider for payment method ${method}`);
    return provider;
  }

  getProviderByName(name: string): IPaymentProvider {
    const provider = this.providers.find((p) => p.name === name);
    if (!provider) throw new BadRequestException(`Unknown provider ${name}`);
    return provider;
  }
}
