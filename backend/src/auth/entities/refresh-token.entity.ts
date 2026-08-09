import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('refresh_tokens')
@Index(['userId'])
@Index(['token'])
export class RefreshToken extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 500 })
  token: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'device_id' })
  deviceId: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false, name: 'is_revoked' })
  isRevoked: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'revoked_at' })
  revokedAt: Date | null;
}

@Entity('otp_records')
@Index(['userId'])
@Index(['phone'])
@Index(['expiresAt'])
export class OtpRecord extends BaseEntity {
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  purpose: string; // 'phone_verification', 'delivery_confirmation', 'password_reset'

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false, name: 'is_used' })
  isUsed: boolean;

  @Column({ type: 'int', default: 0, name: 'attempt_count' })
  attemptCount: number;
}

@Entity('device_registrations')
@Index(['userId'])
@Index(['deviceToken'])
export class DeviceRegistration extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'text', name: 'device_token' })
  deviceToken: string;

  @Column({ type: 'varchar', length: 20, name: 'platform' }) // 'ios' | 'android'
  platform: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'device_id' })
  deviceId: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_used_at' })
  lastUsedAt: Date | null;
}
