import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole, VerificationStatus } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByEmailOrPhone(email: string, phone: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .where('user.email = :email OR user.phone = :phone', { email, phone })
      .getOne();
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.userRepo.update(id, data);
    return this.findByIdOrFail(id);
  }

  async markPhoneVerified(id: string): Promise<void> {
    await this.userRepo.update(id, {
      phoneVerified: true,
      status: VerificationStatus.VERIFIED,
    });
  }

  async resetFailedLogins(id: string): Promise<void> {
    await this.userRepo.update(id, { failedLoginAttempts: 0, lockedUntil: null });
  }

  async updateFailedLogins(id: string, data: Partial<User>): Promise<void> {
    await this.userRepo.update(id, data);
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date(), lastLoginIp: ip });
  }

  async updateFcmToken(id: string, token: string): Promise<void> {
    await this.userRepo.update(id, { fcmToken: token });
  }

  async suspend(id: string): Promise<void> {
    await this.userRepo.update(id, { status: VerificationStatus.SUSPENDED });
  }

  async softDelete(id: string): Promise<void> {
    await this.userRepo.softDelete(id);
  }
}
