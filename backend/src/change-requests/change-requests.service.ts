import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { OrderChangeRequest } from './entities/order-change-request.entity';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { Order } from '../orders/entities/order.entity';
import { PaymentsService } from '../payments/payments.service';
import { ChangeRequestStatus, PaymentMethod } from '../common/enums';

@Injectable()
export class ChangeRequestsService {
  constructor(
    @InjectRepository(OrderChangeRequest) private readonly repo: Repository<OrderChangeRequest>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly paymentsService: PaymentsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Station raises a change request — e.g. "the rubber needs changing". Photo is required. */
  async create(dto: CreateChangeRequestDto, stationId: string, raisedBy: string): Promise<OrderChangeRequest> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.stationId !== stationId) {
      throw new BadRequestException('This order does not belong to your station');
    }

    const changeRequest = await this.repo.save(this.repo.create({
      orderId: dto.orderId,
      stationId,
      raisedBy,
      description: dto.description,
      photoUrl: dto.photoUrl,
      additionalAmount: dto.additionalAmount,
      status: ChangeRequestStatus.PENDING,
    }));

    this.eventEmitter.emit('change_request.raised', { changeRequest, order });
    return changeRequest;
  }

  async findByOrder(orderId: string): Promise<OrderChangeRequest[]> {
    return this.repo.find({ where: { orderId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<OrderChangeRequest> {
    const cr = await this.repo.findOne({ where: { id } });
    if (!cr) throw new NotFoundException('Change request not found');
    return cr;
  }

  /**
   * Customer approves. Approval IS payment — one action, not two steps.
   * This kicks off the Paystack charge; the request only flips to APPROVED
   * once payment.completed fires for this reference (see handlePaymentCompleted below).
   * The approved amount folds into order.total, which SettlementService later
   * splits into platform commission / rider earning / station earning as a
   * whole — same escrow, same split logic, no separate treatment needed.
   */
  async approve(
    id: string,
    customerId: string,
    paymentMethod: PaymentMethod,
    customerEmail: string,
    customerPhone: string,
  ): Promise<OrderChangeRequest> {
    const changeRequest = await this.findById(id);
    if (changeRequest.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException(`Change request is already ${changeRequest.status}`);
    }

    const payment = await this.paymentsService.initiate(
      {
        orderId: changeRequest.orderId,
        customerId,
        amount: changeRequest.additionalAmount,
        paymentMethod,
        idempotencyKey: `change-request-${id}`,
      },
      customerEmail,
      customerPhone,
    );

    await this.repo.update(id, { paymentReference: payment.reference });
    return this.findById(id);
  }

  async reject(id: string, reason: string): Promise<OrderChangeRequest> {
    const changeRequest = await this.findById(id);
    if (changeRequest.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException(`Change request is already ${changeRequest.status}`);
    }
    await this.repo.update(id, {
      status: ChangeRequestStatus.REJECTED,
      respondedAt: new Date(),
    });
    const updated = await this.findById(id);
    this.eventEmitter.emit('change_request.rejected', { changeRequest: updated, reason });
    return updated;
  }

  /** Listens for the same payment.completed event the rest of the app uses,
   *  and flips this change request to APPROVED only if the reference matches
   *  the one stored when the customer's Confirm & Pay was initiated — this
   *  is what stops the ORIGINAL order payment from accidentally approving
   *  an unrelated pending change request on the same order. */
  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: { paymentId: string; orderId: string; reference: string }): Promise<void> {
    const pending = await this.repo.findOne({
      where: {
        orderId: payload.orderId,
        status: ChangeRequestStatus.PENDING,
        paymentReference: payload.reference,
      },
    });
    if (!pending) return;

    await this.repo.update(pending.id, {
      status: ChangeRequestStatus.APPROVED,
      respondedAt: new Date(),
    });

    // Add the approved amount to the order total. Do NOT set stationEarning/
    // platformCommission/riderEarning here — SettlementService recomputes
    // that full three-way split from `total` when the order completes, so
    // writing it here would just get silently overwritten later. The
    // change-request amount is folded into the same escrowed total that
    // commission, delivery, and station earning are all calculated from.
    const order = await this.orderRepo.findOne({ where: { id: payload.orderId } });
    if (order) {
      await this.orderRepo.update(order.id, {
        subtotal: Number(order.subtotal) + Number(pending.additionalAmount),
        total: Number(order.total) + Number(pending.additionalAmount),
      });
    }

    this.eventEmitter.emit('change_request.approved', { changeRequestId: pending.id, orderId: payload.orderId });
  }
}
