import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Order } from '../entities/order.entity';
import { SettlementService } from '../settlement.service';
import { OrdersService } from '../orders.service';

/**
 * Event-driven order processing.
 * Decouples notifications, inventory, and financial side-effects from the core order flow.
 */
@Injectable()
export class OrderEventListener {
  private readonly logger = new Logger(OrderEventListener.name);

  constructor(
    private readonly settlementService: SettlementService,
    private readonly ordersService: OrdersService,
  ) {}

  @OnEvent('order.created')
  handleOrderCreated(payload: { order: Order }) {
    this.logger.log(`[Event] Order created: ${payload.order.orderNumber}`);
    // → trigger station notification, payment initiation
  }

  /** Orders becomes visible in the rider job feed (findAvailableNearby) the
   *  moment they enter PREPARING — no silent server-side assignment for
   *  either tier anymore. Riders race to accept() it themselves, first one
   *  wins. STANDARD orders left unclaimed get picked up by BatchingService's
   *  periodic sweep as a fallback. */
  @OnEvent('order.preparing')
  handlePreparing(payload: { order: Order }) {
    this.logger.log(
      `[Event] Order preparing: ${payload.order.orderNumber} (${payload.order.deliveryTier}) — now available for riders to accept`,
    );
    // → push notification to nearby riders would go here
  }

  @OnEvent('order.rider_assigned')
  handleRiderAssigned(payload: { order: Order; riderId: string }) {
    this.logger.log(`[Event] Rider ${payload.riderId} assigned to ${payload.order.orderNumber}`);
    // → notify rider + customer
  }

  @OnEvent('order.delivered')
  async handleDelivered(payload: { order: Order }) {
    this.logger.log(`[Event] Order delivered: ${payload.order.orderNumber}`);
    if (payload.order.riderId) {
      await this.ordersService.releaseRiderIfFree(payload.order.riderId);
    }
    // → request customer confirmation
  }

  /** On confirmation, settle financials and complete the order. */
  @OnEvent('order.customer_confirmed')
  async handleConfirmed(payload: { order: Order }) {
    this.logger.log(`[Event] Order confirmed: ${payload.order.orderNumber}`);
    try {
      await this.settlementService.settle(payload.order.id);
    } catch (err) {
      this.logger.error(`Settlement failed for ${payload.order.orderNumber}`, (err as Error).stack);
      // In production this would push to a dead-letter queue for retry.
    }
  }

  @OnEvent('order.cancelled')
  async handleCancelled(payload: { order: Order }) {
    this.logger.log(`[Event] Order cancelled: ${payload.order.orderNumber}`);
    if (payload.order.riderId) {
      await this.ordersService.releaseRiderIfFree(payload.order.riderId);
    }
    // → process refund if paid, release inventory (already done in service)
  }
}
