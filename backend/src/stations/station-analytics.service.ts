import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Rider } from '../riders/entities/rider.entity';
import { OrderStatus } from '../common/enums';
import { PaginationDto, paginate } from '../common/utils/pagination.util';

/**
 * Per-station operational analytics.
 * Everything here is scoped to a single stationId so a station manager only
 * ever sees their own data — never the whole platform.
 */
@Injectable()
export class StationAnalyticsService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Rider) private readonly riderRepo: Repository<Rider>,
  ) {}

  /** Headline metrics for a station dashboard. */
  async getOverview(stationId: string) {
    const [totalOrders, completedOrders, pendingOrders, activeRiders] = await Promise.all([
      this.orderRepo.count({ where: { stationId } }),
      this.orderRepo.count({ where: { stationId, status: OrderStatus.COMPLETED } }),
      this.orderRepo.count({ where: { stationId, status: OrderStatus.PENDING } }),
      this.riderRepo.count({ where: { stationId } }),
    ]);

    const revenue = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.station_earning), 0)', 'earnings')
      .where('o.station_id = :id', { id: stationId })
      .andWhere('o.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      activeRiders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      totalEarnings: parseFloat(revenue?.earnings || '0'),
    };
  }

  /** Daily revenue series for a station, for charts. */
  async getRevenueSeries(stationId: string, days = 7) {
    return this.orderRepo
      .createQueryBuilder('o')
      .select('DATE(o.created_at)', 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.station_earning), 0)', 'earnings')
      .where('o.station_id = :id', { id: stationId })
      .andWhere('o.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere("o.created_at >= NOW() - (:days || ' days')::interval", { days })
      .groupBy('DATE(o.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  /** Riders attached to this station. */
  async getRiders(stationId: string) {
    return this.riderRepo.find({ where: { stationId }, order: { createdAt: 'DESC' } });
  }

  /** Distinct customers who have ordered from this station (paginated). */
  async getCustomers(stationId: string, pagination: PaginationDto) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select('o.customer_id', 'customerId')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('COALESCE(SUM(o.total), 0)', 'totalSpent')
      .addSelect('MAX(o.created_at)', 'lastOrderAt')
      .where('o.station_id = :id', { id: stationId })
      .groupBy('o.customer_id')
      .orderBy('"lastOrderAt"', 'DESC')
      .limit(pagination.limit)
      .offset(pagination.skip);

    const items = await qb.getRawMany();
    const totalRow = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(DISTINCT o.customer_id)', 'count')
      .where('o.station_id = :id', { id: stationId })
      .getRawOne();

    return paginate(items, parseInt(totalRow?.count || '0', 10), pagination.page, pagination.limit);
  }
}
