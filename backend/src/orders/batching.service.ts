import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Order } from './entities/order.entity';
import { DeliveryBatch } from './entities/delivery-batch.entity';
import { OrdersService } from './orders.service';
import { RidersService } from '../riders/riders.service';
import { DeliveryTier, OrderStatus, BatchStatus } from '../common/enums';

/**
 * Implements STANDARD delivery from the concept doc: instead of a dedicated
 * trip per order (that's EXPRESS), nearby STANDARD orders get grouped into
 * one rider's loop, spreading the trip cost across several customers.
 *
 * Runs on a schedule rather than instantly on order creation, because
 * batching needs several orders to accumulate before grouping makes sense —
 * an order placed the instant the cycle just ran should still get picked up
 * on the *next* cycle a few minutes later, not wait indefinitely.
 */
@Injectable()
export class BatchingService {
  private readonly logger = new Logger(BatchingService.name);

  // Tunable — no live order volume to calibrate against yet, these are
  // reasonable V1 starting points, not derived from real data. Kept in
  // sync with OrdersService.MAX_ORDERS_PER_RIDER_BATCH — same underlying
  // safety reasoning (gas needs careful handling, not stacked like food).
  private readonly CLUSTER_RADIUS_KM = 3;
  private readonly MAX_BATCH_SIZE = 3;
  private readonly RIDER_SEARCH_RADIUS_KM = 10;

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(DeliveryBatch) private readonly batchRepo: Repository<DeliveryBatch>,
    private readonly ordersService: OrdersService,
    private readonly ridersService: RidersService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runBatchingCycle(): Promise<void> {
    const newBatches = await this.clusterPendingOrders();
    if (newBatches.length) {
      this.logger.log(`Batching cycle: created ${newBatches.length} new batch(es)`);
    }
    await this.matchRidersToBatches();
  }

  /**
   * Fallback for STANDARD orders nobody has actively accept()-ed yet.
   * Groups by SAME destination station first — the whole point of a batch
   * is one trip to one station, not just "customers near each other" — then
   * sub-clusters by pickup proximity within that station's orders, since a
   * rider still has to visit each customer before heading to the station.
   * Only considers orders still unclaimed (riderId IS NULL) at the moment
   * of clustering; anything a rider has already accept()-ed is skipped.
   */
  async clusterPendingOrders(): Promise<DeliveryBatch[]> {
    const candidates = await this.orderRepo.find({
      where: {
        deliveryTier: DeliveryTier.STANDARD,
        status: OrderStatus.PREPARING,
        batchId: IsNull(),
        riderId: IsNull(),
      },
    });

    const withCoords = candidates.filter((o) => o.deliveryLat != null && o.deliveryLng != null);
    const byStation = new Map<string, Order[]>();
    for (const order of withCoords) {
      const list = byStation.get(order.stationId) ?? [];
      list.push(order);
      byStation.set(order.stationId, list);
    }

    const createdBatches: DeliveryBatch[] = [];

    for (const [, stationOrders] of byStation) {
      const pool = [...stationOrders];

      while (pool.length > 0) {
        const seed = pool.shift()!;
        const group = [seed];

        for (let i = pool.length - 1; i >= 0 && group.length < this.MAX_BATCH_SIZE; i--) {
          const candidate = pool[i];
          const distance = this.haversineKm(
            Number(seed.deliveryLat),
            Number(seed.deliveryLng),
            Number(candidate.deliveryLat),
            Number(candidate.deliveryLng),
          );
          if (distance <= this.CLUSTER_RADIUS_KM) {
            group.push(candidate);
            pool.splice(i, 1);
          }
        }

        const centroidLat = group.reduce((sum, o) => sum + Number(o.deliveryLat), 0) / group.length;
        const centroidLng = group.reduce((sum, o) => sum + Number(o.deliveryLng), 0) / group.length;

        const batch = await this.batchRepo.save(
          this.batchRepo.create({
            status: BatchStatus.PENDING,
            centroidLat,
            centroidLng,
            orderCount: group.length,
          }),
        );

        await this.orderRepo.update(
          group.map((o) => o.id),
          { batchId: batch.id },
        );

        createdBatches.push(batch);
        this.logger.log(
          `Batch ${batch.id}: ${group.length} order(s) → station ${seed.stationId}, clustered within ${this.CLUSTER_RADIUS_KM}km`,
        );
      }
    }

    return createdBatches;
  }

  /**
   * Finds one rider per pending batch and assigns them to every order in it.
   * A batch with no rider available yet just stays PENDING for the next cycle.
   *
   * A rider may have accept()-ed one of these orders individually between
   * clustering and this running — that's expected, not an error, since
   * accept() is race-safe; we just skip that specific order and keep going.
   *
   * Known limitation, not fixed here: there's no row-level locking on the
   * rider search itself — in a rare race, this could read the same rider
   * as AVAILABLE as a concurrent accept() and match them to two different
   * jobs. Worth a proper fix (e.g. a locked SELECT) once real concurrent
   * volume makes it likely enough to matter; low-risk at V1 scale.
   */
  async matchRidersToBatches(): Promise<void> {
    const pendingBatches = await this.batchRepo.find({ where: { status: BatchStatus.PENDING } });

    for (const batch of pendingBatches) {
      const candidates = await this.ridersService.findNearestAvailable(
        Number(batch.centroidLat),
        Number(batch.centroidLng),
        this.RIDER_SEARCH_RADIUS_KM,
        1,
      );

      if (!candidates.length) {
        this.logger.warn(`Batch ${batch.id} (${batch.orderCount} orders): no rider available, retrying next cycle`);
        continue;
      }

      const rider = candidates[0];
      const ordersInBatch = await this.orderRepo.find({ where: { batchId: batch.id } });
      let claimedCount = 0;

      let riderClaimed = false;
      for (const order of ordersInBatch) {
        try {
          // First successful claim in this batch atomically flips the
          // rider AVAILABLE→BUSY (claimRider: true) — this is the actual
          // race-safe moment. Every order after that reuses the same
          // already-committed rider without re-checking their status,
          // since re-gating would incorrectly reject a rider we already own.
          await this.ordersService.assignRider(order.id, rider.id, null, { claimRider: !riderClaimed });
          riderClaimed = true;
          claimedCount++;
        } catch (err) {
          // Most likely: a rider already accept()-ed this specific order
          // individually since clustering ran, or (for the first order)
          // another process claimed this same rider first. Expected, just move on.
          this.logger.log(`Batch ${batch.id}: skipped ${order.orderNumber} (${(err as Error).message})`);
        }
      }

      await this.batchRepo.update(batch.id, { riderId: rider.id, status: BatchStatus.ASSIGNED });
      this.logger.log(`Batch ${batch.id}: assigned to rider ${rider.id} (${claimedCount}/${ordersInBatch.length} orders claimed)`);
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
}
