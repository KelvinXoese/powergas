import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken, OtpRecord, DeviceRegistration } from './entities/refresh-token.entity';
import { VerificationStatus } from '../common/enums';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;

  const mockRepo = () => ({ save: jest.fn(), findOne: jest.fn(), update: jest.fn() });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(), findByEmailOrPhone: jest.fn(), create: jest.fn(),
            findById: jest.fn(), resetFailedLogins: jest.fn(), updateLastLogin: jest.fn(),
            updateFailedLogins: jest.fn(), markPhoneVerified: jest.fn(),
          },
        },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(5) } },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRepo() },
        { provide: getRepositoryToken(OtpRecord), useValue: mockRepo() },
        { provide: getRepositoryToken(DeviceRegistration), useValue: mockRepo() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('throws ConflictException if user exists', async () => {
      usersService.findByEmailOrPhone.mockResolvedValue({ id: '1' } as any);
      await expect(
        service.register({ email: 'a@b.com', phone: '+233501234567', password: 'Pass@1234', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(service.validateUser('x@y.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await argon2.hash('correct');
      usersService.findByEmail.mockResolvedValue({
        id: '1', password: hash, isLocked: false, status: VerificationStatus.VERIFIED, failedLoginAttempts: 0,
      } as any);
      await expect(service.validateUser('x@y.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('returns user for valid credentials', async () => {
      const hash = await argon2.hash('correct');
      const user = { id: '1', password: hash, isLocked: false, status: VerificationStatus.VERIFIED, failedLoginAttempts: 0 };
      usersService.findByEmail.mockResolvedValue(user as any);
      const result = await service.validateUser('x@y.com', 'correct');
      expect(result.id).toBe('1');
      expect(usersService.resetFailedLogins).toHaveBeenCalledWith('1');
    });
  });
});
