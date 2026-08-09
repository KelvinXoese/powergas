import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { totp } from 'otplib';
import { UsersService } from '../users/users.service';
import { RefreshToken, OtpRecord, DeviceRegistration } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { VerificationStatus } from '../common/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_LOGIN_ATTEMPTS: number;
  private readonly LOCKOUT_DURATION_MS: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(OtpRecord)
    private readonly otpRepo: Repository<OtpRecord>,
    @InjectRepository(DeviceRegistration)
    private readonly deviceRepo: Repository<DeviceRegistration>,
  ) {
    this.MAX_LOGIN_ATTEMPTS = this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5);
    this.LOCKOUT_DURATION_MS = this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 30) * 60 * 1000;
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.usersService.findByEmailOrPhone(dto.email, dto.phone);
    if (existing) {
      throw new ConflictException('Email or phone already registered');
    }

    const hashedPassword = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // deviceId is captured during token generation, not stored on the user
    const { deviceId: _deviceId, ...userData } = dto;
    const user = await this.usersService.create({
      ...userData,
      password: hashedPassword,
    });

    await this.sendPhoneOtp(user.id, dto.phone, 'phone_verification');
    return { message: 'Registration successful. Please verify your phone number.' };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isLocked) {
      throw new ForbiddenException('Account temporarily locked. Try again later.');
    }

    const passwordValid = await argon2.verify(user.password, password);

    if (!passwordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === VerificationStatus.SUSPENDED) {
      throw new ForbiddenException('Account suspended. Contact support.');
    }

    // Reset failed attempts on successful login
    await this.usersService.resetFailedLogins(user.id);
    return user;
  }

  async login(dto: LoginDto, ipAddress: string, userAgent: string): Promise<AuthTokens> {
    const user = await this.validateUser(dto.email, dto.password);
    await this.usersService.updateLastLogin(user.id, ipAddress);
    return this.generateTokens(user, dto.deviceId, ipAddress, userAgent);
  }

  async refreshTokens(token: string, ipAddress: string): Promise<AuthTokens> {
    const refreshTokenRecord = await this.refreshTokenRepo.findOne({
      where: { token, isRevoked: false },
    });

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshTokenRecord.expiresAt < new Date()) {
      await this.refreshTokenRepo.update(refreshTokenRecord.id, { isRevoked: true });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Token rotation: revoke old token
    await this.refreshTokenRepo.update(refreshTokenRecord.id, {
      isRevoked: true,
      revokedAt: new Date(),
    });

    const user = await this.usersService.findById(refreshTokenRecord.userId);
    if (!user) throw new UnauthorizedException('User not found');

    return this.generateTokens(user, refreshTokenRecord.deviceId, ipAddress, refreshTokenRecord.userAgent);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.refreshTokenRepo.update({ token: refreshToken }, { isRevoked: true, revokedAt: new Date() });
    } else {
      // Revoke all tokens for user
      await this.refreshTokenRepo.update({ userId, isRevoked: false }, { isRevoked: true, revokedAt: new Date() });
    }
  }

  async sendPhoneOtp(userId: string | null, phone: string, purpose: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.configService.get<number>('OTP_EXPIRY_MINUTES', 10) * 60000);

    // Invalidate any existing OTPs for same phone/purpose
    await this.otpRepo.update({ phone, purpose, isUsed: false }, { isUsed: true });

    await this.otpRepo.save({ userId, phone, purpose, code, expiresAt });

    // In production, integrate with SMS provider here
    this.logger.log(`OTP for ${phone} [${purpose}]: ${code}`);
  }

  async verifyOtp(userId: string, code: string, purpose: string): Promise<boolean> {
    const record = await this.otpRepo.findOne({
      where: { userId, purpose, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!record) throw new BadRequestException('No active OTP found');
    if (record.expiresAt < new Date()) throw new BadRequestException('OTP expired');
    if (record.attemptCount >= 5) throw new BadRequestException('Too many failed OTP attempts');

    if (record.code !== code) {
      await this.otpRepo.update(record.id, { attemptCount: record.attemptCount + 1 });
      throw new BadRequestException('Invalid OTP');
    }

    await this.otpRepo.update(record.id, { isUsed: true });

    if (purpose === 'phone_verification') {
      await this.usersService.markPhoneVerified(userId);
    }

    return true;
  }

  private async generateTokens(
    user: User,
    deviceId: string | null | undefined,
    ipAddress: string,
    userAgent: string | null | undefined,
  ): Promise<AuthTokens> {
    const jti = uuidv4();
    const expiresIn = 15 * 60; // 15 minutes

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await this.refreshTokenRepo.save({
      userId: user.id,
      token: refreshToken,
      deviceId,
      userAgent,
      ipAddress,
      expiresAt: refreshExpiresAt,
    });

    return { accessToken, refreshToken, expiresIn };
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const newAttempts = user.failedLoginAttempts + 1;
    const update: Partial<User> = { failedLoginAttempts: newAttempts };

    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      update.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
      this.logger.warn(`Account locked: ${user.email}`);
    }

    await this.usersService.updateFailedLogins(user.id, update);
  }
}
