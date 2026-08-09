import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStation } from './entities/gas-station.entity';
import { GasStationStaff } from './entities/gas-station-staff.entity';
import { CreateStationDto } from './dto/create-station.dto';
import { PaginationDto, paginate } from '../common/utils/pagination.util';
import { UserRole, StockStatus, VerificationStatus } from '../common/enums';

@Injectable()
export class StationsService {
  constructor(
    @InjectRepository(GasStation) private readonly stationRepo: Repository<GasStation>,
    @InjectRepository(GasStationStaff) private readonly staffRepo: Repository<GasStationStaff>,
  ) {}

  async create(dto: CreateStationDto, createdBy: string): Promise<GasStation> {
    const code = await this.generateCode(dto.city);
    return this.stationRepo.save(this.stationRepo.create({ ...dto, code, createdBy }));
  }

  async findById(id: string): Promise<GasStation> {
    const station = await this.stationRepo.findOne({ where: { id } });
    if (!station) throw new NotFoundException('Station not found');
    return station;
  }

  async findAll(pagination: PaginationDto) {
    const [items, total] = await this.stationRepo.findAndCount({
      where: { isActive: true },
      take: pagination.limit, skip: pagination.skip, order: { createdAt: 'DESC' },
    });
    return paginate(items, total, pagination.page, pagination.limit);
  }

  /** Find nearby stations using Haversine. Only returns stations that are
   *  open AND actually have gas — a station being "active" isn't enough. */
  async findNearby(lat: number, lng: number, radiusKm = 15): Promise<GasStation[]> {
    return this.stationRepo.query(
      `SELECT *, (6371 * acos(cos(radians($1)) * cos(radians(latitude)) *
       cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance
       FROM gas_stations WHERE is_active = true AND stock_status = 'AVAILABLE'
       AND status = 'VERIFIED' AND latitude IS NOT NULL AND deleted_at IS NULL
       HAVING (6371 * acos(cos(radians($1)) * cos(radians(latitude)) *
       cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) < $3
       ORDER BY distance ASC LIMIT 20`,
      [lat, lng, radiusKm],
    );
  }

  async update(id: string, dto: Partial<CreateStationDto>, updatedBy: string): Promise<GasStation> {
    await this.stationRepo.update(id, { ...dto, updatedBy });
    return this.findById(id);
  }

  /** Station toggles its own stock status (Available / Shortage / Out of Stock). */
  async updateStockStatus(id: string, stockStatus: StockStatus, updatedBy: string): Promise<GasStation> {
    await this.stationRepo.update(id, {
      stockStatus,
      stockStatusUpdatedAt: new Date(),
      updatedBy,
    });
    return this.findById(id);
  }

  /** Station toggles open/closed. Previously there was no way to do this
   *  at all — isActive wasn't part of CreateStationDto, so the generic
   *  update endpoint silently ignored it. Separate from stock status:
   *  a station can be open with no gas (stock issue) or fully closed
   *  (not operating at all) — two independent signals, not one. */
  async updateOpenStatus(id: string, isActive: boolean, updatedBy: string): Promise<GasStation> {
    await this.stationRepo.update(id, { isActive, updatedBy });
    return this.findById(id);
  }

  /**
   * Admin reviews a station's submitted safety/licensing documents and
   * approves or rejects. This was entirely missing — `status` (like
   * `isActive`) wasn't part of any updatable DTO, meaning every newly
   * registered station would sit PENDING forever with no way to ever
   * become VERIFIED. This is what actually enforces the concept doc's
   * "mandatory vendor safety/licensing verification."
   */
  async reviewVerification(
    id: string,
    status: VerificationStatus.VERIFIED | VerificationStatus.REJECTED,
    reviewedBy: string,
  ): Promise<GasStation> {
    await this.stationRepo.update(id, { status, updatedBy: reviewedBy });
    return this.findById(id);
  }

  /** Called when a rider arrives and finds no stock despite an AVAILABLE listing.
   *  Logs a strike and auto-corrects the status so the next customer isn't misled.
   *  V1: strikes are reviewed manually by an admin, not auto-penalized. */
  async reportFalseAvailability(id: string): Promise<GasStation> {
    const station = await this.findById(id);
    await this.stationRepo.update(id, {
      stockStatus: StockStatus.OUT_OF_STOCK,
      stockStatusUpdatedAt: new Date(),
      falseAvailabilityStrikes: station.falseAvailabilityStrikes + 1,
    });
    return this.findById(id);
  }

  private async generateCode(city?: string): Promise<string> {
    const prefix = (city || 'XXX').slice(0, 3).toUpperCase();
    const count = await this.stationRepo.count();
    return `PG-${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  // ── Staff Management ──

  /**
   * Resolve the station a staff/manager user belongs to.
   * This is the authoritative lookup used to scope every station-dashboard request.
   * Returns null if the user is not assigned to any station.
   */
  async resolveStationForUser(userId: string): Promise<string | null> {
    const staff = await this.staffRepo.findOne({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
    return staff?.stationId ?? null;
  }

  /** Assign a staff/manager user to a station. */
  async assignStaff(
    stationId: string,
    userId: string,
    role: UserRole,
    assignedBy: string,
  ): Promise<GasStationStaff> {
    await this.findById(stationId); // ensures station exists
    const existing = await this.staffRepo.findOne({ where: { userId, stationId } });
    if (existing) {
      if (!existing.isActive) {
        await this.staffRepo.update(existing.id, { isActive: true, role, updatedBy: assignedBy });
        return this.staffRepo.findOneOrFail({ where: { id: existing.id } });
      }
      throw new ConflictException('User is already assigned to this station');
    }
    return this.staffRepo.save(
      this.staffRepo.create({ userId, stationId, role, createdBy: assignedBy }),
    );
  }

  /** Remove a staff member from a station (soft — marks inactive). */
  async removeStaff(stationId: string, userId: string, removedBy: string): Promise<void> {
    const staff = await this.staffRepo.findOne({ where: { userId, stationId } });
    if (!staff) throw new NotFoundException('Staff assignment not found');
    await this.staffRepo.update(staff.id, { isActive: false, updatedBy: removedBy });
  }

  /** List all staff for a station. */
  async getStaff(stationId: string): Promise<GasStationStaff[]> {
    return this.staffRepo.find({
      where: { stationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}
