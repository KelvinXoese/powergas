import { Order } from '../entities/order.entity';

/**
 * Customer-facing view of an order.
 * Deliberately omits platformCommission, stationEarning, and riderEarning —
 * the customer should only ever see the total, split into what they paid
 * for delivery and what they paid the station (gas/cylinder purchase or
 * refill), never MUNPESA's internal revenue split. See concept doc:
 * "we don't show our commissions to customers."
 */
export type CustomerOrderView = Omit<Order, 'platformCommission' | 'stationEarning' | 'riderEarning'>;

export function toCustomerOrderView(order: Order): CustomerOrderView {
  const { platformCommission, stationEarning, riderEarning, ...customerView } = order;
  return customerView;
}

export function toCustomerOrderViews(orders: Order[]): CustomerOrderView[] {
  return orders.map(toCustomerOrderView);
}

/**
 * Station-facing view: a vendor can see their own earning, but not
 * MUNPESA's platform commission or the rider's delivery earning — same
 * "don't show our commissions" rule applies to stations, not just customers.
 */
export type StationOrderView = Omit<Order, 'platformCommission' | 'riderEarning'>;

export function toStationOrderView(order: Order): StationOrderView {
  const { platformCommission, riderEarning, ...stationView } = order;
  return stationView;
}

export function toStationOrderViews(orders: Order[]): StationOrderView[] {
  return orders.map(toStationOrderView);
}
