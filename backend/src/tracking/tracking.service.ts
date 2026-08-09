import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getDistance } from 'geolib';
import { OrderTrackingEvent } from '../orders/entities/order-items.entity';
import { RidersService } from '../riders/riders.service';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @InjectRepository(OrderTrackingEvent) private readonly trackingRepo: Repository<OrderTrackingEvent>,
    private readonly ridersService: RidersService,
  ) {}

  async recordLocation(data: {
    orderId: string; riderId: string; latitude: number; longitude: number;
    speed?: number; heading?: number; destLat?: number; destLng?: number;
  }): Promise<OrderTrackingEvent> {
    let distanceToDestination: number | null = null;
    let etaSeconds: number | null = null;

    if (data.destLat != null && data.destLng != null) {
      distanceToDestination = getDistance(
        { latitude: data.latitude, longitude: data.longitude },
        { latitude: data.destLat, longitude: data.destLng },
      );
      // ETA assuming ~25 km/h avg urban delivery speed
      etaSeconds = Math.round((distanceToDestination / 1000 / 25) * 3600);
    }

    // Persist rider's current location too
    await this.ridersService.updateLocation(data.riderId, data.latitude, data.longitude);

    return this.trackingRepo.save(this.trackingRepo.create({
      orderId: data.orderId, riderId: data.riderId,
      latitude: data.latitude, longitude: data.longitude,
      speed: data.speed, heading: data.heading,
      distanceToDestination, etaSeconds,
    }));
  }

  async getTrackingHistory(orderId: string): Promise<OrderTrackingEvent[]> {
    return this.trackingRepo.find({ where: { orderId }, order: { createdAt: 'ASC' } });
  }

  async getLatestPosition(orderId: string): Promise<OrderTrackingEvent | null> {
    return this.trackingRepo.findOne({ where: { orderId }, order: { createdAt: 'DESC' } });
  }
}
