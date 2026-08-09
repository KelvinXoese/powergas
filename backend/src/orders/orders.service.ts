import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getDistance } from 'geolib';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './entities/order.entity';
import { OrderItem, OrderStatusHistory, OrderTrackingEvent } from './entities/order-items.entity';
import { CylinderInventory } from '../inventory/entities/cylinder-inventory.entity';
import { GasStation } from '../stations/entities/gas-station.entity';
import { RidersService } from '../riders/riders.service';
import { Rider } from '../riders/entities/rider.entity';
import { TrackingService } from '../tracking/tracking.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, OrderType, DeliveryTier, UserRole, RiderStatus, VerificationStatus } from '../common/enums';
import { PaginationDto, paginate } from '../common/utils/pagination.util';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private readonly statusHistoryRepo: Repository<OrderStatusHistory>,
    @InjectRepository(CylinderInventory)
    private readonly inventoryRepo: Repository<CylinderInventory>,
    @InjectRepository(GasStation)
    private readonly stationRepo: Repository<GasStation>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly ridersService: RidersService,
    private readonly trackingService: TrackingService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      // Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // Generate delivery OTP
      const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // Calculate pricing
      const pricing = await this.calculatePricing(dto);

      const order = manager.create(Order, {
        orderNumber,
        customerId,
        stationId: dto.stationId,
        type: dto.type,
        deliveryTier: dto.deliveryTier ?? DeliveryTier.STANDARD,
        deliveryAddress: dto.deliveryAddress,
        deliveryLat: dto.deliveryLat,
        deliveryLng: dto.deliveryLng,
        subtotal: pricing.subtotal,
        deliveryFee: pricing.deliveryFee,
        emergencySurcharge: pricing.emergencySurcharge,
        total: pricing.total,
        paymentMethod: dto.paymentMethod,
        deliveryOtp,
        idempotencyKey: dto.idempotencyKey,
      });

      const savedOrder = await manager.save(Order, order);

      // Reserve inventory (atomic operation)
      await this.reserveInventory(manager, dto.stationId, dto.items, savedOrder.id);

      // Create order items
      const orderItems = dto.items.map((item) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          cylinderTypeId: item.cylinderTypeId,
          cylinderTypeName: item.cylinderTypeName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
        }),
      );
      await manager.save(OrderItem, orderItems);

      // Log initial status
      await manager.save(OrderStatusHistory, {
        orderId: savedOrder.id,
        fromStatus: null,
        toStatus: OrderStatus.PENDING,
        changedBy: customerId,
        notes: 'Order created',
      });

      this.logger.log(`Order created: ${savedOrder.orderNumber}`);
      this.eventEmitter.emit('order.created', { order: savedOrder, items: orderItems });

      return savedOrder;
    });
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    notes?: string,
    metadata?: Record<string, any>,
  ): Promise<Order> {
    const order = await this.findById(orderId);

    if (!this.isValidTransition(order.status, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${newStatus}`,
      );
    }

    // Proximity is mandatory, not optional — a rider physically must be at
    // the relevant location to mark these checkpoints. No location data
    // means the checkpoint is rejected outright, same as being too far away.
    await this.enforceProximityIfRequired(order, newStatus);

    const oldStatus = order.status;
    const timestamps: Partial<Order> = this.getStatusTimestamps(newStatus);

    await this.orderRepo.update(orderId, { status: newStatus, ...timestamps });

    await this.statusHistoryRepo.save({
      orderId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedBy,
      notes,
      metadata,
    });

    const updatedOrder = await this.findById(orderId);
    this.eventEmitter.emit(`order.${newStatus.toLowerCase()}`, { order: updatedOrder });

    return updatedOrder;
  }

  /** Geofence radius for every proximity-gated checkpoint. Not derived from
   *  real GPS-accuracy data yet — 100m is a reasonable V1 starting point,
   *  loose enough to tolerate normal GPS drift, tight enough to actually
   *  mean something. */
  private readonly PROXIMITY_THRESHOLD_METERS = 100;

  /** Dispatches to the correct target location (customer vs station)
   *  based on which checkpoint is being entered, and rejects the
   *  transition outright if the rider isn't verifiably there. */
  private async enforceProximityIfRequired(order: Order, newStatus: OrderStatus): Promise<void> {
    let target: { lat: number; lng: number } | null = null;

    if (newStatus === OrderStatus.RIDER_ARRIVED_PICKUP || newStatus === OrderStatus.RIDER_ARRIVED_DELIVERY || newStatus === OrderStatus.DELIVERED) {
      if (order.deliveryLat == null || order.deliveryLng == null) {
        throw new BadRequestException('Order has no delivery coordinates — cannot verify proximity');
      }
      target = { lat: Number(order.deliveryLat), lng: Number(order.deliveryLng) };
    } else if (newStatus === OrderStatus.AT_STATION) {
      const station = await this.stationRepo.findOne({ where: { id: order.stationId } });
      if (!station || station.latitude == null || station.longitude == null) {
        throw new BadRequestException('Station has no coordinates — cannot verify proximity');
      }
      target = { lat: Number(station.latitude), lng: Number(station.longitude) };
    } else {
      return; // this transition isn't proximity-gated (e.g. "en route" statuses)
    }

    await this.verifyProximity(order.id, target.lat, target.lng);
  }

  /**
   * Rejects unless the rider's most recent tracked position is within
   * PROXIMITY_THRESHOLD_METERS of the target. No tracking data at all is
   * treated the same as being too far away — proximity is mandatory, per
   * "the rider must be at the location to click delivered/arrived," not a
   * soft warning. This is what stops a rider claiming to be somewhere
   * they're not, which the customer would otherwise have no way to catch.
   */
  private async verifyProximity(orderId: string, targetLat: number, targetLng: number): Promise<void> {
    const latest = await this.trackingService.getLatestPosition(orderId);
    if (!latest) {
      throw new ForbiddenException(
        'No location data for this rider yet — cannot confirm you are at this location',
      );
    }

    const distanceMeters = getDistance(
      { latitude: Number(latest.latitude), longitude: Number(latest.longitude) },
      { latitude: targetLat, longitude: targetLng },
    );

    if (distanceMeters > this.PROXIMITY_THRESHOLD_METERS) {
      throw new ForbiddenException(
        `You're ${distanceMeters}m away — must be within ${this.PROXIMITY_THRESHOLD_METERS}m to confirm this`,
      );
    }
  }

  /**
   * Race-safe: claims a rider AND an order together in one transaction.
   *
   * `claimRider` distinguishes two genuinely different situations that
   * were previously conflated (a real bug, found and fixed here):
   *
   * - claimRider: true (default) — this is a NEW job for this rider.
   *   Requires the rider to currently be AVAILABLE, atomically flips them
   *   to BUSY as part of the same transaction as the order claim. If
   *   another concurrent call already claimed this rider, this fails
   *   cleanly and nothing is left half-assigned.
   *
   * - claimRider: false — this rider is ALREADY committed (from the same
   *   accept() call or the same batch loop, moments earlier in the same
   *   execution, not a separate concurrent request) and this is an
   *   ADDITIONAL order being bundled onto them — e.g. STANDARD batching.
   *   Skips the rider-status gate entirely, since re-checking AVAILABLE
   *   here would incorrectly reject a rider we already legitimately own.
   *
   * Previously, the rider side was NOT atomically gated at all — two
   * concurrent flows could both read the same rider as AVAILABLE and both
   * successfully assign them separate, unrelated orders, since only the
   * ORDER claim was atomic. That's the actual double-booking risk flagged
   * earlier as "known, not fixed" — fixed now.
   */
  async assignRider(
    orderId: string,
    riderId: string,
    assignedBy: string | null,
    options: { claimRider?: boolean } = {},
  ): Promise<Order> {
    const claimRider = options.claimRider ?? true;

    return this.dataSource.transaction(async (manager) => {
      if (claimRider) {
        const riderClaim = await manager
          .createQueryBuilder()
          .update(Rider)
          .set({ status: RiderStatus.BUSY })
          .where('id = :riderId', { riderId })
          .andWhere('status = :status', { status: RiderStatus.AVAILABLE })
          .execute();

        if (riderClaim.affected === 0) {
          throw new ConflictException('Rider is no longer available — already claimed for another job');
        }
      }

      const orderClaim = await manager
        .createQueryBuilder()
        .update(Order)
        .set({ riderId, status: OrderStatus.RIDER_ASSIGNED, assignedAt: new Date() })
        .where('id = :orderId', { orderId })
        .andWhere('status = :status', { status: OrderStatus.PREPARING })
        .andWhere('rider_id IS NULL')
        .execute();

      if (orderClaim.affected === 0) {
        // Rolls back the rider-BUSY flip above too, if claimRider was true —
        // this is exactly why both claims live in one transaction.
        throw new ConflictException('Order is no longer available — already claimed, cancelled, or not ready yet');
      }

      await manager.save(OrderStatusHistory, {
        orderId,
        fromStatus: OrderStatus.PREPARING,
        toStatus: OrderStatus.RIDER_ASSIGNED,
        changedBy: assignedBy,
        notes: `Rider ${riderId} assigned`,
      });

      const updatedOrder = await manager.findOne(Order, { where: { id: orderId } });
      this.eventEmitter.emit('order.rider_assigned', { order: updatedOrder, riderId });

      return updatedOrder as Order;
    });
  }

  /**
   * Max orders one rider carries at once under STANDARD batching. Kept
   * deliberately small — gas cylinders need careful handling, not stacked
   * like food deliveries. Not derived from real data yet; adjust once
   * there's operational experience to tune it against.
   */
  private readonly MAX_ORDERS_PER_RIDER_BATCH = 3;

  /**
   * The rider-facing "accept" action — this is the actual race: whichever
   * rider's accept() call lands first wins, via assignRider's atomic
   * conditional update. For STANDARD orders, a successful accept
   * immediately tries to bundle in other nearby unclaimed orders headed to
   * the SAME station — this is what "still available for orders going to
   * the same gas station" means in practice, not an open-ended availability.
   * EXPRESS orders are single-order only: the rider goes straight to BUSY
   * with no bundling attempt.
   *
   * Verification is enforced here, not just modeled as a field — an
   * unverified rider (no Ghana Card/liveness/tricycle check passed yet)
   * could previously accept jobs with nothing stopping them, since
   * verificationStatus existed on the entity but nothing anywhere actually
   * read it before allowing an action.
   */
  async acceptOrder(orderId: string, riderId: string): Promise<Order> {
    const rider = await this.ridersService.findById(riderId);
    if (rider.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Your account is not yet verified — complete verification before accepting jobs');
    }

    const order = await this.assignRider(orderId, riderId, null);

    if (order.deliveryTier === DeliveryTier.STANDARD) {
      await this.attachNearbySameStationOrders(order, riderId);
    }

    return order;
  }

  /** Best-effort bundling — failures to claim a specific candidate (another
   *  rider won that race) are expected and simply skipped, not errors. */
  private async attachNearbySameStationOrders(anchorOrder: Order, riderId: string): Promise<void> {
    const alreadyOnRider = await this.orderRepo.count({
      where: { riderId, status: OrderStatus.RIDER_ASSIGNED },
    });
    let slotsLeft = this.MAX_ORDERS_PER_RIDER_BATCH - alreadyOnRider;
    if (slotsLeft <= 0) return;

    const candidates = await this.orderRepo.find({
      where: {
        stationId: anchorOrder.stationId,
        deliveryTier: DeliveryTier.STANDARD,
        status: OrderStatus.PREPARING,
      },
    });

    const eligible = candidates
      .filter((o) => o.id !== anchorOrder.id && o.deliveryLat != null && o.deliveryLng != null)
      .map((o) => ({
        order: o,
        distanceKm: this.haversineKm(
          Number(anchorOrder.deliveryLat),
          Number(anchorOrder.deliveryLng),
          Number(o.deliveryLat),
          Number(o.deliveryLng),
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    for (const candidate of eligible) {
      if (slotsLeft <= 0) break;
      try {
        await this.assignRider(candidate.order.id, riderId, null, { claimRider: false });
        slotsLeft--;
      } catch (err) {
        // Another rider claimed it first, or it changed state — expected, just move on.
        this.logger.log(`Bundling: could not claim ${candidate.order.orderNumber} (${(err as Error).message})`);
      }
    }
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Orders a rider can currently race to accept() — unclaimed and ready. */
  async findAvailableNearby(lat: number, lng: number, radiusKm = 10): Promise<Order[]> {
    return this.orderRepo.query(
      `SELECT *, (6371 * acos(cos(radians($1)) * cos(radians(delivery_lat)) *
       cos(radians(delivery_lng) - radians($2)) + sin(radians($1)) * sin(radians(delivery_lat)))) AS distance
       FROM orders WHERE status = 'PREPARING' AND rider_id IS NULL
       AND delivery_lat IS NOT NULL AND deleted_at IS NULL
       HAVING (6371 * acos(cos(radians($1)) * cos(radians(delivery_lat)) *
       cos(radians(delivery_lng) - radians($2)) + sin(radians($1)) * sin(radians(delivery_lat)))) < $3
       ORDER BY distance ASC LIMIT 30`,
      [lat, lng, radiusKm],
    );
  }

  /**
   * Frees a rider back to AVAILABLE once they have no other active orders.
   * Called when an order reaches DELIVERED or CANCELLED — the rider may
   * still be carrying other orders from the same batch, so this checks
   * before flipping their status back.
   */
  async releaseRiderIfFree(riderId: string): Promise<void> {
    const activeStatuses = [
      OrderStatus.RIDER_ASSIGNED,
      OrderStatus.RIDER_EN_ROUTE_PICKUP,
      OrderStatus.RIDER_ARRIVED_PICKUP,
      OrderStatus.CYLINDER_PICKED_UP,
      OrderStatus.RIDER_EN_ROUTE_STATION,
      OrderStatus.AT_STATION,
      OrderStatus.RIDER_EN_ROUTE_DELIVERY,
      OrderStatus.RIDER_ARRIVED_DELIVERY,
    ];
    const stillActive = await this.orderRepo.count({
      where: { riderId, status: In(activeStatuses) },
    });
    if (stillActive === 0) {
      await this.ridersService.setAvailability(riderId, RiderStatus.AVAILABLE);
    }
  }

  /**
   * Customer-side OTP confirmation. Doesn't run its own proximity check —
   * it doesn't need to, since DELIVERED (a precondition here) can only be
   * reached after RIDER_ARRIVED_DELIVERY, which is itself proximity-gated
   * in updateStatus(). Proximity is inherited transitively through the
   * state machine, not re-verified redundantly at every step.
   */
  async confirmDelivery(orderId: string, customerId: string, otp: string, proofUrl?: string): Promise<Order> {
    const order = await this.findById(orderId);

    if (order.customerId !== customerId) {
      throw new ForbiddenException('Not authorized to confirm this order');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order must be in DELIVERED status');
    }

    if (order.deliveryOtp !== otp) {
      throw new BadRequestException('Invalid delivery OTP');
    }

    await this.orderRepo.update(orderId, {
      status: OrderStatus.CUSTOMER_CONFIRMED,
      otpVerified: true,
      proofOfDeliveryUrl: proofUrl || order.proofOfDeliveryUrl,
    });

    await this.statusHistoryRepo.save({
      orderId,
      fromStatus: OrderStatus.DELIVERED,
      toStatus: OrderStatus.CUSTOMER_CONFIRMED,
      changedBy: customerId,
      notes: 'Customer confirmed delivery with OTP',
    });

    const updatedOrder = await this.findById(orderId);
    this.eventEmitter.emit('order.customer_confirmed', { order: updatedOrder });

    return updatedOrder;
  }

  async cancel(orderId: string, userId: string, reason: string, userRole: UserRole): Promise<Order> {
    const order = await this.findById(orderId);

    // Matches the concept doc exactly: free cancellation right up through
    // the rider arriving for pickup — blocked only once the cylinder is
    // actually in their hands (CYLINDER_PICKED_UP onward), because at that
    // point the rider has committed real time/travel to this specific
    // order. This previously stopped allowing cancellation as early as
    // RIDER_ASSIGNED, which was stricter than intended — a customer
    // couldn't cancel even before the rider had started traveling.
    const cancellableStatuses = [
      OrderStatus.PENDING,
      OrderStatus.ACCEPTED,
      OrderStatus.INVENTORY_RESERVED,
      OrderStatus.PREPARING,
      OrderStatus.RIDER_ASSIGNED,
      OrderStatus.RIDER_EN_ROUTE_PICKUP,
      OrderStatus.RIDER_ARRIVED_PICKUP,
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage — the cylinder has already been picked up');
    }

    // Only customer can cancel their own order; admin can cancel any
    if (userRole === UserRole.CUSTOMER && order.customerId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this order');
    }

    return this.dataSource.transaction(async (manager) => {
      // Release inventory reservation
      await this.releaseInventoryReservation(manager, order);

      await manager.update(Order, orderId, {
        status: OrderStatus.CANCELLED,
        cancellationReason: reason,
      });

      await manager.save(OrderStatusHistory, {
        orderId,
        fromStatus: order.status,
        toStatus: OrderStatus.CANCELLED,
        changedBy: userId,
        notes: reason,
      });

      const updatedOrder = await this.findById(orderId);
      this.eventEmitter.emit('order.cancelled', { order: updatedOrder });

      return updatedOrder;
    });
  }

  async findById(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async findByCustomer(customerId: string, pagination: PaginationDto) {
    const [items, total] = await this.orderRepo.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }

  async findByStation(stationId: string, pagination: PaginationDto) {
    const [items, total] = await this.orderRepo.findAndCount({
      where: { stationId },
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }

  /** A rider's own orders — used by the rider app to restore an in-progress
   *  delivery on load/resume, not just a history list. */
  async findByRider(riderId: string, pagination: PaginationDto) {
    const [items, total] = await this.orderRepo.findAndCount({
      where: { riderId },
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }

  async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    return this.statusHistoryRepo.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  private async reserveInventory(
    manager: any,
    stationId: string,
    items: CreateOrderDto['items'],
    orderId: string,
  ): Promise<void> {
    for (const item of items) {
      const inventory = await manager.findOne(CylinderInventory, {
        where: { stationId, cylinderTypeId: item.cylinderTypeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(`Inventory not found for cylinder type ${item.cylinderTypeId}`);
      }

      const available = inventory.filledCount - inventory.reservedCount;
      if (available < item.quantity) {
        throw new ConflictException(`Insufficient stock for cylinder type ${item.cylinderTypeName}`);
      }

      await manager.update(CylinderInventory, inventory.id, {
        reservedCount: inventory.reservedCount + item.quantity,
        version: inventory.version + 1,
      });
    }
  }

  private async releaseInventoryReservation(manager: any, order: Order): Promise<void> {
    const items = await this.orderItemRepo.find({ where: { orderId: order.id } });

    for (const item of items) {
      const inventory = await manager.findOne(CylinderInventory, {
        where: { stationId: order.stationId, cylinderTypeId: item.cylinderTypeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (inventory && inventory.reservedCount >= item.quantity) {
        await manager.update(CylinderInventory, inventory.id, {
          reservedCount: Math.max(0, inventory.reservedCount - item.quantity),
        });
      }
    }
  }

  private async calculatePricing(dto: CreateOrderDto) {
    // TODO: fetch live pricing from inventory
    const subtotal = dto.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const deliveryFee = 10; // base fee
    const emergencySurcharge = dto.deliveryTier === DeliveryTier.EXPRESS ? subtotal * 0.2 : 0;
    return { subtotal, deliveryFee, emergencySurcharge, total: subtotal + deliveryFee + emergencySurcharge };
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.orderRepo.count();
    return `PG-${date}-${String(count + 1).padStart(4, '0')}`;
  }

  private isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
      [OrderStatus.ACCEPTED]: [OrderStatus.INVENTORY_RESERVED, OrderStatus.CANCELLED],
      [OrderStatus.INVENTORY_RESERVED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.RIDER_ASSIGNED],
      [OrderStatus.RIDER_ASSIGNED]: [OrderStatus.RIDER_EN_ROUTE_PICKUP],
      [OrderStatus.RIDER_EN_ROUTE_PICKUP]: [OrderStatus.RIDER_ARRIVED_PICKUP],
      [OrderStatus.RIDER_ARRIVED_PICKUP]: [OrderStatus.CYLINDER_PICKED_UP],
      [OrderStatus.CYLINDER_PICKED_UP]: [OrderStatus.RIDER_EN_ROUTE_STATION],
      [OrderStatus.RIDER_EN_ROUTE_STATION]: [OrderStatus.AT_STATION],
      [OrderStatus.AT_STATION]: [OrderStatus.RIDER_EN_ROUTE_DELIVERY],
      [OrderStatus.RIDER_EN_ROUTE_DELIVERY]: [OrderStatus.RIDER_ARRIVED_DELIVERY],
      [OrderStatus.RIDER_ARRIVED_DELIVERY]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.CUSTOMER_CONFIRMED],
      [OrderStatus.CUSTOMER_CONFIRMED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };
    return transitions[from]?.includes(to) ?? false;
  }

  private getStatusTimestamps(status: OrderStatus): Partial<Order> {
    const now = new Date();
    switch (status) {
      case OrderStatus.ACCEPTED: return { acceptedAt: now };
      case OrderStatus.RIDER_ASSIGNED: return { assignedAt: now };
      case OrderStatus.RIDER_ARRIVED_PICKUP: return { arrivedPickupAt: now };
      case OrderStatus.CYLINDER_PICKED_UP: return { pickedUpAt: now };
      case OrderStatus.AT_STATION: return { arrivedStationAt: now };
      case OrderStatus.RIDER_ARRIVED_DELIVERY: return { arrivedDeliveryAt: now };
      case OrderStatus.DELIVERED: return { deliveredAt: now };
      case OrderStatus.COMPLETED: return { completedAt: now };
      default: return {};
    }
  }
}
