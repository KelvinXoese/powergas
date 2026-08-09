import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(@InjectRepository(Review) private readonly reviewRepo: Repository<Review>) {}

  async create(reviewerId: string, dto: CreateReviewDto): Promise<Review> {
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Rating must be 1-5');
    const existing = await this.reviewRepo.findOne({ where: { orderId: dto.orderId, reviewerId } });
    if (existing) throw new ConflictException('You already reviewed this order');
    return this.reviewRepo.save(this.reviewRepo.create({ ...dto, reviewerId }));
  }

  async getForStation(stationId: string): Promise<Review[]> {
    return this.reviewRepo.find({ where: { stationId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  async getForRider(riderId: string): Promise<Review[]> {
    return this.reviewRepo.find({ where: { riderId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  async getAverageRating(filter: { stationId?: string; riderId?: string }): Promise<number> {
    const qb = this.reviewRepo.createQueryBuilder('r').select('AVG(r.rating)', 'avg');
    if (filter.stationId) qb.where('r.station_id = :id', { id: filter.stationId });
    if (filter.riderId) qb.where('r.rider_id = :id', { id: filter.riderId });
    const result = await qb.getRawOne();
    return parseFloat(result?.avg || '0');
  }
}
