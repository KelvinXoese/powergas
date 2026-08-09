import axios from 'axios';
import { useAuthStore } from '../store/auth';

const API_URL = 'http://10.0.2.2:3000/api/v1';
export const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Order status checkpoints, in the order a delivery actually moves through ───
// Matches OrderStatus on the backend exactly — see common/enums/index.ts.
export type OrderStatus =
  | 'RIDER_ASSIGNED'
  | 'RIDER_EN_ROUTE_PICKUP'
  | 'RIDER_ARRIVED_PICKUP'
  | 'CYLINDER_PICKED_UP'
  | 'RIDER_EN_ROUTE_STATION'
  | 'AT_STATION'
  | 'RIDER_EN_ROUTE_DELIVERY'
  | 'RIDER_ARRIVED_DELIVERY'
  | 'DELIVERED';

export interface AvailableOrder {
  id: string;
  order_number: string;
  type: string;
  delivery_tier: 'STANDARD' | 'EXPRESS';
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  total: number;
  distance: number; // km, from the backend's Haversine query
}

export interface RiderOrder {
  id: string;
  orderNumber: string;
  type: string;
  deliveryTier: 'STANDARD' | 'EXPRESS';
  status: OrderStatus | string;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  stationId: string;
  total: number;
  batchId: string | null;
}

/** Job feed — unclaimed orders near the rider's current position, to race for. */
export async function getAvailableNearby(lat: number, lng: number, radiusKm = 10): Promise<AvailableOrder[]> {
  const { data } = await api.get('/orders/available/nearby', { params: { lat, lng, radius: radiusKm } });
  return data.data ?? data;
}

/** The actual race — first accept() call to land wins. Can fail with 409/403
 *  if another rider already claimed it; the UI should treat that as a normal
 *  "someone beat you to it" outcome, not an unexpected error. */
export async function acceptOrder(orderId: string): Promise<RiderOrder> {
  const { data } = await api.post(`/orders/${orderId}/accept`);
  return data.data ?? data;
}

/** This rider's own orders — used to restore an in-progress delivery on app
 *  load/resume, since there's no dedicated "my active order" endpoint;
 *  filtering to non-terminal statuses happens client-side (see ActiveOrderScreen). */
export async function getMyOrders(): Promise<{ items: RiderOrder[] }> {
  const { data } = await api.get('/orders');
  return data.data ?? data;
}

/**
 * Advances a checkpoint. RIDER_ARRIVED_PICKUP, AT_STATION,
 * RIDER_ARRIVED_DELIVERY, and DELIVERED are proximity-gated server-side —
 * this call can fail with 403 if the rider isn't actually close enough,
 * even if the button was tappable. The UI must handle that failure
 * gracefully (show "you're too far away"), not treat it as a crash.
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus, notes?: string): Promise<RiderOrder> {
  const { data } = await api.patch(`/orders/${orderId}/status`, { status, notes });
  return data.data ?? data;
}
