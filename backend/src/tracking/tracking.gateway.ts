import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { TrackingService } from './tracking.service';

/**
 * Real-time tracking gateway.
 * Handles: live rider GPS, live order updates, live notifications.
 * Includes JWT auth on connection, reconnect & offline handling.
 */
@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: process.env.FRONTEND_URL || '*', credentials: true },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TrackingGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId → socketIds

  constructor(
    private readonly trackingService: TrackingService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      const sockets = this.userSockets.get(payload.sub) || new Set();
      sockets.add(client.id);
      this.userSockets.set(payload.sub, sockets);

      this.logger.log(`Client connected: ${client.id} (user ${payload.sub})`);
    } catch (e) {
      this.logger.warn(`Connection rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(client.id);
      if (sockets?.size === 0) this.userSockets.delete(userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Customer/admin subscribes to an order's live updates. */
  @SubscribeMessage('subscribe_order')
  handleSubscribeOrder(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    client.join(`order:${data.orderId}`);
    return { event: 'subscribed', orderId: data.orderId };
  }

  @SubscribeMessage('unsubscribe_order')
  handleUnsubscribeOrder(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    client.leave(`order:${data.orderId}`);
    return { event: 'unsubscribed', orderId: data.orderId };
  }

  /** Rider emits GPS updates — broadcast to subscribers. */
  @SubscribeMessage('rider_location')
  async handleRiderLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; latitude: number; longitude: number; speed?: number; heading?: number; destLat?: number; destLng?: number },
  ) {
    const riderId = client.data.userId;
    const event = await this.trackingService.recordLocation({ ...data, riderId });

    this.server.to(`order:${data.orderId}`).emit('location_update', {
      orderId: data.orderId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      heading: data.heading,
      distanceToDestination: event.distanceToDestination,
      etaSeconds: event.etaSeconds,
      timestamp: event.createdAt,
    });

    return { event: 'location_recorded' };
  }

  // ── Server-side emit helpers (called by event listeners) ──
  emitOrderStatusUpdate(orderId: string, status: string, data?: any) {
    this.server.to(`order:${orderId}`).emit('order_status', { orderId, status, ...data });
  }

  emitNotificationToUser(userId: string, notification: any) {
    const sockets = this.userSockets.get(userId);
    sockets?.forEach((sid) => this.server.to(sid).emit('notification', notification));
  }
}
