import 'reflect-metadata';
import * as argon2 from 'argon2';
import dataSource from '../data-source';
import { User } from '../../users/entities/user.entity';
import { GasStation } from '../../stations/entities/gas-station.entity';
import { CylinderType } from '../../inventory/entities/cylinder.entity';
import { CylinderInventory } from '../../inventory/entities/cylinder-inventory.entity';
import { Rider } from '../../riders/entities/rider.entity';
import { RiderWallet } from '../../riders/entities/rider-wallet.entity';
import { GasStationStaff } from '../../stations/entities/gas-station-staff.entity';
import { UserRole, VerificationStatus, RiderStatus } from '../../common/enums';

/**
 * Seed script — bootstraps a super admin, a station + station manager,
 * a rider, cylinder types, and priced inventory so both dashboards
 * have data to render on first run.
 * Run: npm run seed
 */
async function seed() {
  await dataSource.initialize();
  console.log('🌱 Seeding database...');

  const userRepo = dataSource.getRepository(User);
  const stationRepo = dataSource.getRepository(GasStation);
  const typeRepo = dataSource.getRepository(CylinderType);
  const inventoryRepo = dataSource.getRepository(CylinderInventory);
  const riderRepo = dataSource.getRepository(Rider);
  const walletRepo = dataSource.getRepository(RiderWallet);
  const staffRepo = dataSource.getRepository(GasStationStaff);

  const hash = (pw: string) => argon2.hash(pw, { type: argon2.argon2id });

  // ── Super Admin ──
  let admin = await userRepo.findOne({ where: { email: 'admin@powergas.com' } });
  if (!admin) {
    admin = await userRepo.save(userRepo.create({
      firstName: 'Super', lastName: 'Admin', email: 'admin@powergas.com',
      phone: '+233500000000', password: await hash('Admin@12345'), role: UserRole.SUPER_ADMIN,
      status: VerificationStatus.VERIFIED, emailVerified: true, phoneVerified: true,
    }));
    console.log('✓ Super admin (admin@powergas.com / Admin@12345)');
  }

  // ── Cylinder Types ──
  const typeDefs = [
    { name: '6kg', weightKg: 6 }, { name: '12.5kg', weightKg: 12.5 },
    { name: '25kg', weightKg: 25 }, { name: '50kg', weightKg: 50 },
  ];
  const types: CylinderType[] = [];
  for (const t of typeDefs) {
    let type = await typeRepo.findOne({ where: { name: t.name } });
    if (!type) type = await typeRepo.save(typeRepo.create(t));
    types.push(type);
  }
  console.log('✓ Cylinder types');

  // ── Station ──
  let station = await stationRepo.findOne({ where: { code: 'PG-ACC-001' } });
  if (!station) {
    station = await stationRepo.save(stationRepo.create({
      name: 'Powergas Accra Central', code: 'PG-ACC-001',
      fullAddress: 'Independence Ave, Accra', city: 'Accra', region: 'Greater Accra',
      latitude: 5.5600, longitude: -0.2050, phone: '+233302000000',
      status: VerificationStatus.VERIFIED, deliveryRadiusKm: 15,
    }));
    console.log('✓ Station PG-ACC-001');
  }

  // ── Station Manager ──
  let manager = await userRepo.findOne({ where: { email: 'manager@powergas.com' } });
  if (!manager) {
    manager = await userRepo.save(userRepo.create({
      firstName: 'Station', lastName: 'Manager', email: 'manager@powergas.com',
      phone: '+233500000001', password: await hash('Manager@12345'), role: UserRole.STATION_MANAGER,
      status: VerificationStatus.VERIFIED, emailVerified: true, phoneVerified: true,
    }));
    console.log('✓ Station manager (manager@powergas.com / Manager@12345)');
  }

  // ── Link manager → station (authoritative staff mapping) ──
  const staffLink = await staffRepo.findOne({ where: { userId: manager.id, stationId: station.id } });
  if (!staffLink) {
    await staffRepo.save(staffRepo.create({
      userId: manager.id, stationId: station.id, role: UserRole.STATION_MANAGER, isActive: true,
    }));
    console.log('✓ Manager linked to PG-ACC-001');
  }

  // ── Rider + wallet (attached to the station) ──
  let riderUser = await userRepo.findOne({ where: { email: 'rider@powergas.com' } });
  if (!riderUser) {
    riderUser = await userRepo.save(userRepo.create({
      firstName: 'Kofi', lastName: 'Rider', email: 'rider@powergas.com',
      phone: '+233500000002', password: await hash('Rider@12345'), role: UserRole.RIDER,
      status: VerificationStatus.VERIFIED, emailVerified: true, phoneVerified: true,
    }));
    const rider = await riderRepo.save(riderRepo.create({
      userId: riderUser.id, stationId: station.id, status: RiderStatus.AVAILABLE,
      vehicleType: 'Tricycle', vehiclePlate: 'GR-2024-24', currentLat: 5.5601, currentLng: -0.2049,
      averageRating: 4.8, totalDeliveries: 132, backgroundCheckPassed: true, trainingCompleted: true,
      verificationStatus: VerificationStatus.VERIFIED, livenessVerified: true, tricycleRegistrationVerified: true,
    }));
    await walletRepo.save(walletRepo.create({ riderId: rider.id, availableBalance: 340, totalEarned: 1820 }));
    console.log('✓ Rider (rider@powergas.com / Rider@12345)');
  }

  // ── Priced inventory for the station ──
  const priceTable: Record<string, { ex: number; nw: number; rf: number; surcharge: number; filled: number }> = {
    '6kg': { ex: 65, nw: 220, rf: 55, surcharge: 15, filled: 40 },
    '12.5kg': { ex: 120, nw: 380, rf: 100, surcharge: 25, filled: 30 },
    '25kg': { ex: 230, nw: 700, rf: 200, surcharge: 40, filled: 12 },
    '50kg': { ex: 440, nw: 1300, rf: 400, surcharge: 60, filled: 4 },
  };
  for (const type of types) {
    const p = priceTable[type.name];
    const exists = await inventoryRepo.findOne({ where: { stationId: station.id, cylinderTypeId: type.id } });
    if (!exists && p) {
      await inventoryRepo.save(inventoryRepo.create({
        stationId: station.id, cylinderTypeId: type.id,
        filledCount: p.filled, emptyCount: 10, reservedCount: 0, lowStockThreshold: 5,
        exchangePrice: p.ex, newPrice: p.nw, refillPrice: p.rf, emergencySurcharge: p.surcharge,
      }));
    }
  }
  console.log('✓ Priced inventory');

  console.log('✅ Seeding complete');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
