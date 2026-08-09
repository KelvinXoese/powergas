import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentWebhook } from './entities/payment.entity';
import { PaystackProvider } from './providers/paystack.provider';
import { MobileMoneyProvider } from './providers/mobile-money.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentWebhook])],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaystackProvider, MobileMoneyProvider, PaymentProviderFactory],
  exports: [PaymentsService],
})
export class PaymentsModule {}
