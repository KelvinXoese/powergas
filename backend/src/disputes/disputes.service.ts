import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Dispute } from './entities/dispute.entity';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { DisputeStatus } from '../common/enums';
import { PaginationDto, paginate } from '../common/utils/pagination.util';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute) private readonly disputeRepo: Repository<Dispute>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(customerId: string, dto: CreateDisputeDto): Promise<Dispute> {
    const dispute = await this.disputeRepo.save(this.disputeRepo.create({ ...dto, customerId, createdBy: customerId }));
    this.eventEmitter.emit('dispute.opened', { dispute });
    return dispute;
  }

  async findById(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async assignAdmin(id: string, adminId: string): Promise<Dispute> {
    await this.disputeRepo.update(id, { assignedAdminId: adminId, status: DisputeStatus.UNDER_REVIEW });
    return this.findById(id);
  }

  async resolve(id: string, adminId: string, resolution: string, refundAmount?: number): Promise<Dispute> {
    await this.disputeRepo.update(id, {
      status: DisputeStatus.RESOLVED, resolution, refundAmount: refundAmount ?? null,
      resolvedAt: new Date(), updatedBy: adminId,
    });
    const dispute = await this.findById(id);
    this.eventEmitter.emit('dispute.resolved', { dispute });
    return dispute;
  }

  async findByCustomer(customerId: string, pagination: PaginationDto) {
    const [items, total] = await this.disputeRepo.findAndCount({
      where: { customerId }, order: { createdAt: 'DESC' }, take: pagination.limit, skip: pagination.skip,
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }

  async findAll(pagination: PaginationDto, status?: DisputeStatus) {
    const where = status ? { status } : {};
    const [items, total] = await this.disputeRepo.findAndCount({
      where, order: { createdAt: 'DESC' }, take: pagination.limit, skip: pagination.skip,
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }
}
