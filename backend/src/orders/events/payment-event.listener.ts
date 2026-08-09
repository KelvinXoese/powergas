import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { PaymentStatus } from '../../common/enums';

/**
 * Reacts to payment lifecycle events to keep order.paymentStatus in sync.
 * Payments are verified server-side; this listener only mirrors the result.
 */
@Injectable()
export class PaymentEventListener {
  private readonly logger = new Logger(PaymentEventListener.name);

  constructor(@InjectRepository(Order) private readonly orderRepo: Repository<Order>) {}

  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: { paymentId: string; orderId: string }) {
    await this.orderRepo.update(payload.orderId, { paymentStatus: PaymentStatus.COMPLETED });
    this.logger.log(`[Event] Payment completed for order ${payload.orderId}`);
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(payload: { paymentId: string; orderId: string }) {
    await this.orderRepo.update(payload.orderId, { paymentStatus: PaymentStatus.FAILED });
    this.logger.warn(`[Event] Payment failed for order ${payload.orderId}`);
  }
}
