import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { RiderStatus, VerificationStatus } from '../../common/enums';

@Entity('riders')
export class Rider extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id', unique: true })
  @Index()
  userId: string;

  @OneToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'station_id', nullable: true })
  @Index()
  stationId: string | null;

  @Column({ type: 'varchar', length: 50, name: 'vehicle_type', nullable: true })
  vehicleType: string | null;

  @Column({ type: 'varchar', length: 20, name: 'vehicle_plate', nullable: true })
  vehiclePlate: string | null;

  // ─── Identity verification — see concept doc "Rider Onboarding":
  // Ghana Card + liveness scan + profile picture, same trust bar as
  // Artinet's artisan verification. Previously only a generic
  // backgroundCheckPassed boolean existed — not specific enough to
  // actually represent what onboarding requires.
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'ghana_card_number' })
  ghanaCardNumber: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'ghana_card_photo_url' })
  ghanaCardPhotoUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'profile_photo_url' })
  profilePhotoUrl: string | null; // shown to customers so they can visually confirm the rider, Bolt-style

  @Column({ type: 'boolean', default: false, name: 'liveness_verified' })
  livenessVerified: boolean; // liveness scan, not a static photo — prevents spoofing with someone else's ID

  @Column({ type: 'timestamptz', nullable: true, name: 'liveness_verified_at' })
  livenessVerifiedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'tricycle_registration_url' })
  tricycleRegistrationUrl: string | null; // roadworthiness/registration document

  @Column({ type: 'boolean', default: false, name: 'tricycle_registration_verified' })
  tricycleRegistrationVerified: boolean;

  @Column({ type: 'enum', enum: VerificationStatus, default: VerificationStatus.PENDING, name: 'verification_status' })
  verificationStatus: VerificationStatus; // overall gate — PENDING until Ghana Card + liveness + tricycle all verified

  @Column({ type: 'enum', enum: RiderStatus, default: RiderStatus.OFFLINE })
  status: RiderStatus; // availability (AVAILABLE/BUSY/OFFLINE) — separate from identity verification above

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true, name: 'current_lat' })
  currentLat: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true, name: 'current_lng' })
  currentLng: number | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'location_updated_at' })
  locationUpdatedAt: Date | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'average_rating' })
  averageRating: number;

  @Column({ type: 'int', default: 0, name: 'total_deliveries' })
  totalDeliveries: number;

  @Column({ type: 'boolean', default: false, name: 'background_check_passed' })
  backgroundCheckPassed: boolean;

  @Column({ type: 'boolean', default: false, name: 'training_completed' })
  trainingCompleted: boolean; // completion of the in-app cylinder-handling orientation page
}
