import { Entity, Column, Index } from 'typeorm';
import { AuditableEntity } from '../../common/entities/base.entity';
import { VerificationStatus, StockStatus } from '../../common/enums';

@Entity('gas_stations')
export class GasStation extends AuditableEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  code: string; // unique station code e.g. PG-ACC-001

  @Column({ type: 'text', name: 'full_address' })
  fullAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'enum', enum: VerificationStatus, default: VerificationStatus.PENDING })
  status: VerificationStatus;

  // ─── Safety/licensing documents backing `status` above — see concept doc
  // "Vendor Onboarding & Verification": mandatory safety certs, cylinder
  // inspection standards, and licensing, given gas is hazardous. Previously
  // `status` existed with nothing actually backing it — an admin approving
  // a station had no document to have reviewed in the first place.
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'business_license_url' })
  businessLicenseUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'safety_certificate_url' })
  safetyCertificateUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'cylinder_inspection_cert_url' })
  cylinderInspectionCertUrl: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean; // shop open/closed

  @Column({ type: 'enum', enum: StockStatus, default: StockStatus.AVAILABLE, name: 'stock_status' })
  stockStatus: StockStatus; // separate from isActive — is gas actually available right now

  @Column({ type: 'timestamp', nullable: true, name: 'stock_status_updated_at' })
  stockStatusUpdatedAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'false_availability_strikes' })
  falseAvailabilityStrikes: number; // incremented when a rider arrives and finds no stock despite AVAILABLE status

  @Column({ type: 'boolean', default: true, name: 'accepts_exchange' })
  acceptsExchange: boolean;

  @Column({ type: 'boolean', default: true, name: 'accepts_new_purchase' })
  acceptsNewPurchase: boolean;

  @Column({ type: 'boolean', default: true, name: 'accepts_refill' })
  acceptsRefill: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'delivery_radius_km' })
  deliveryRadiusKm: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'average_rating' })
  averageRating: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_revenue' })
  totalRevenue: number;

  @Column({ type: 'jsonb', nullable: true, name: 'operating_hours' })
  operatingHours: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: Record<string, any> | null;
}
