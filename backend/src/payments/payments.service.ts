import { Injectable, NotFoundException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentWebhook } from './entities/payment.entity';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentMethod, PaymentStatus } from '../common/enums';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentWebhook) private readonly webhookRepo: Repository<PaymentWebhook>,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Initiate payment with idempotency protection. */
  async initiate(dto: InitiatePaymentDto, customerEmail: string, customerPhone: string): Promise<Payment> {
    // Idempotency: return existing payment if key already used
    if (dto.idempotencyKey) {
      const existing = await this.paymentRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
      if (existing) return existing;
    }

    const reference = `PAY-${uuidv4()}`;
    const provider = this.providerFactory.getProviderForMethod(dto.paymentMethod);

    const payment = await this.paymentRepo.save(this.paymentRepo.create({
      orderId: dto.orderId,
      customerId: dto.customerId,
      reference,
      idempotencyKey: dto.idempotencyKey,
      amount: dto.amount,
      currency: dto.currency || 'GHS',
      paymentMethod: dto.paymentMethod,
      status: PaymentStatus.PENDING,
      provider: provider.name,
    }));

    const result = await provider.initiate({
      reference, amount: dto.amount, currency: payment.currency,
      customerEmail, customerPhone, metadata: { orderId: dto.orderId },
    });

    await this.paymentRepo.update(payment.id, {
      status: PaymentStatus.PROCESSING,
      providerReference: result.providerReference,
      providerResponse: result.raw,
    });

    return this.paymentRepo.findOneOrFail({ where: { id: payment.id } });
  }

  /** Always verify server-side — never trust frontend. */
  async verify(reference: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { reference } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.COMPLETED) return payment;

    const provider = this.providerFactory.getProviderByName(payment.provider!);
    const result = await provider.verify(payment.providerReference || reference);

    if (result.status === 'completed') {
      await this.paymentRepo.update(payment.id, {
        status: PaymentStatus.COMPLETED, paidAt: new Date(), providerResponse: result.raw,
      });
      this.eventEmitter.emit('payment.completed', { paymentId: payment.id, orderId: payment.orderId, reference: payment.reference });
    } else if (result.status === 'failed') {
      await this.paymentRepo.update(payment.id, { status: PaymentStatus.FAILED });
      this.eventEmitter.emit('payment.failed', { paymentId: payment.id, orderId: payment.orderId });
    }

    return this.paymentRepo.findOneOrFail({ where: { id: payment.id } });
  }

  /** Process incoming webhook with signature verification and idempotency. */
  async handleWebhook(providerName: string, rawPayload: any, rawBody: string, signature: string): Promise<void> {
    const provider = this.providerFactory.getProviderByName(providerName);

    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn(`Invalid webhook signature from ${providerName}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    const webhook = await this.webhookRepo.save(this.webhookRepo.create({
      provider: providerName, eventType: rawPayload?.event, rawPayload,
    }));

    try {
      const reference = rawPayload?.data?.reference;
      if (reference) await this.verify(reference);
      await this.webhookRepo.update(webhook.id, { isProcessed: true, processedAt: new Date() });
    } catch (err) {
      await this.webhookRepo.update(webhook.id, { processingError: (err as Error).message });
      throw err;
    }
  }

  /** Retry failed payments (called by background job). */
  async retryFailedPayments(): Promise<number> {
    const failed = await this.paymentRepo.find({
      where: { status: PaymentStatus.FAILED },
      take: 50,
    });
    let retried = 0;
    for (const p of failed) {
      if (p.retryCount >= 3) continue;
      await this.paymentRepo.update(p.id, { retryCount: p.retryCount + 1 });
      try {
        await this.verify(p.reference);
        retried++;
      } catch (e) {
        this.logger.error(`Retry failed for ${p.reference}`);
      }
    }
    return retried;
  }

  async findByOrder(orderId: string): Promise<Payment[]> {
    return this.paymentRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } });
  }
}
