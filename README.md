# Powergas — Enterprise LPG Cylinder Exchange & Delivery Platform

Production-grade, multi-tenant LPG platform supporting millions of users, thousands of gas stations, and nationwide operations.

## Architecture Overview

```
powergas/
├── backend/          # NestJS API (Node.js + TypeScript + PostgreSQL + Redis)
├── frontend/         # React Admin & Station Dashboards (Vite + TanStack Query + Zustand)
├── mobile/
│   ├── customer/     # Customer React Native App
│   └── rider/        # Rider React Native App
├── infrastructure/   # Docker, Nginx, Docker Compose
├── scripts/          # DB migration, seed, utility scripts
└── .github/          # CI/CD workflows
```

## Tech Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Backend     | Node.js, NestJS, TypeScript                    |
| Database    | PostgreSQL (UUID PKs, migrations, soft deletes)|
| Cache       | Redis (sessions, queues, rate limiting)        |
| Realtime    | Socket.IO                                      |
| Queue       | BullMQ                                         |
| Frontend    | React, TypeScript, Vite, TanStack Query, Zustand|
| Mobile      | React Native, TypeScript                       |
| Infra       | Docker, Docker Compose, Nginx                  |
| Storage     | S3-compatible Object Storage                   |

## Roles

| Role             | Access                                  |
|------------------|-----------------------------------------|
| CUSTOMER         | Order gas, track delivery, manage profile |
| RIDER            | Accept orders, GPS sharing, wallet      |
| STATION_STAFF    | Process orders, manage inventory        |
| STATION_MANAGER  | Full station dashboard                  |
| ADMIN            | Multi-station management                |
| SUPER_ADMIN      | Full platform access                    |

## Quick Start

```bash
# 1. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Start infrastructure
docker-compose -f infrastructure/docker-compose.yml up -d

# 3. Run migrations
cd backend && npm run migration:run

# 4. Seed database
npm run seed

# 5. Start backend
npm run start:dev

# 6. Start frontend
cd ../frontend && npm run dev
```

## Key Features

- **Cylinder Exchange**: Full lifecycle tracking (filled → empty → refilled)
- **Real-time Tracking**: Socket.IO GPS updates every 5 seconds
- **Multi-tenant**: Thousands of independent gas stations
- **Payments**: Mobile Money, Cards, Bank Transfers via abstraction layer
- **Proof of Delivery**: GPS + Photo + Customer OTP + Digital Signature
- **Financial Ledger**: Full audit trail, rider wallets, commission tracking
- **Observability**: Structured logging, request tracing, health checks
- **Security**: OWASP Top 10, JWT rotation, Argon2, RBAC

## API Documentation

Start the server and visit: `http://localhost:3000/api/docs` (Swagger)

## Testing

```bash
cd backend
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report (target: 90%+)
```

## Seeded Login

After running `npm run seed`, a super admin is created:

```
Email:    admin@powergas.com
Password: Admin@12345
```

Use these to sign into the Operations Console (`frontend`).

## Project Structure (164 files)

```
powergas/
├── backend/              NestJS API — 14 feature modules, 18 entities, Socket.IO, BullMQ
│   ├── src/
│   │   ├── auth/         JWT + refresh rotation, Argon2, OTP, RBAC guards
│   │   ├── users/        User management
│   │   ├── customers/    Profiles + saved addresses
│   │   ├── riders/       Profiles, wallet, withdrawals, nearest-rider
│   │   ├── stations/     Multi-tenant stations, geo lookup
│   │   ├── orders/       Full 12-state lifecycle + state machine
│   │   ├── inventory/    Cylinders, QR codes, atomic stock, low-stock alerts
│   │   ├── payments/     Provider abstraction (Paystack, Mobile Money), webhooks
│   │   ├── notifications/ Push / SMS / Email / in-app channels
│   │   ├── tracking/     Socket.IO gateway — live GPS + ETA
│   │   ├── disputes/     Dispute workflow + resolution
│   │   ├── reviews/      Ratings & reviews
│   │   ├── files/        S3-compatible storage, upload validation
│   │   ├── admin/        Analytics, financial reports, audit logs, health
│   │   ├── common/       Base entities, enums, filters, interceptors, pagination
│   │   ├── config/       Database config
│   │   └── database/     Data source, migrations, seeds
│   └── test/             Unit, e2e, k6 load tests
├── frontend/             React + Vite operations console (industrial control-room UI)
├── mobile/
│   ├── customer/         React Native — order, track, confirm delivery
│   └── rider/            React Native — availability, live GPS, earnings/wallet
├── infrastructure/       docker-compose (postgres, redis, minio, backend, nginx)
├── docs/                 ARCHITECTURE.md, API.md
├── scripts/              setup.sh
└── .github/workflows/    ci.yml, deploy.yml
```

## Frontend: Two Role-Separated Dashboards

The web app serves two distinct experiences based on the logged-in user's role. After login, users are routed automatically:

### Super Admin Dashboard (`/admin`) — ADMIN, SUPER_ADMIN
1. **Platform Overview** — cross-platform metrics, revenue, financials
2. **Stations** — multi-station management + create new stations
3. **Users** — all platform users with roles and status
4. **Rider Monitoring** — riders across every station, live location, ratings
5. **Financial Reporting** — date-ranged revenue / commission / rider-earnings charts
6. **Disputes** — resolve disputes with notes and refunds
7. **Audit Logs** — paginated audit trail
8. **Commission** — set platform-wide or per-station commission rates
9. **System Settings** — key/value platform configuration

### Gas Station Dashboard (`/station`) — STATION_STAFF, STATION_MANAGER
1. **Overview** — this station's orders, completion rate, riders, earnings chart
2. **Order Fulfillment** — advance orders through their lifecycle
3. **Inventory** — filled/empty/reserved stock per cylinder type, low-stock flags
4. **Pricing** — set exchange / new / refill prices + emergency surcharge per cylinder type, with change history
5. **Riders** — riders attached to this station
6. **Customers** — customers who have ordered from this station, with spend
7. **Revenue** — 30-day net earnings trend

Every station endpoint is scoped to a single `stationId`, so a station manager only ever sees their own station's data.

## Seeded Logins

```
Super Admin:      admin@powergas.com    / Admin@12345
Station Manager:  manager@powergas.com  / Manager@12345
Rider:            rider@powergas.com    / Rider@12345
```

The seed also creates a station (PG-ACC-001), a rider with wallet history, and fully-priced inventory for all four cylinder sizes.
