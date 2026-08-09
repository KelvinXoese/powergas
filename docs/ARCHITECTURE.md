# Powergas Architecture

## System Overview

Powergas is a multi-tenant LPG cylinder exchange & delivery platform built on a
modular NestJS backend, a React operations console, and two React Native mobile
apps (customer + rider). All services are stateless and horizontally scalable
behind Nginx.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Customer App │   │  Rider App   │   │ Ops Console  │
│ (RN)         │   │  (RN)        │   │ (React/Vite) │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │ HTTPS / WSS
                   ┌──────▼───────┐
                   │    Nginx     │  rate limiting, TLS, LB
                   └──────┬───────┘
                          │ least_conn
              ┌───────────▼────────────┐
              │   NestJS API (N pods)  │
              │  REST v1 + Socket.IO   │
              └───┬─────────┬──────────┘
                  │         │
         ┌────────▼──┐  ┌───▼─────┐   ┌──────────────┐
         │PostgreSQL │  │  Redis  │   │ S3 / MinIO   │
         │(primary)  │  │ cache + │   │ object store │
         │           │  │ queues  │   │              │
         └───────────┘  └─────────┘   └──────────────┘
```

## Design Principles

- **Clean Architecture / DDD**: feature modules (auth, orders, inventory…) each
  own their entities, services, controllers, DTOs.
- **Repository pattern**: controllers never touch the DB directly; all access is
  through TypeORM repositories injected into services.
- **Event-driven**: side-effects (notifications, settlements, refunds) are
  decoupled via `@nestjs/event-emitter`. Core flows emit events; listeners react.
- **Optimistic + pessimistic locking**: inventory and wallets use row locks and
  version columns to prevent overselling and double-spend.
- **Idempotency**: order creation and payment initiation accept idempotency keys.

## Order Lifecycle (state machine)

```
PENDING → ACCEPTED → INVENTORY_RESERVED → PREPARING → RIDER_ASSIGNED
→ RIDER_EN_ROUTE_PICKUP → CYLINDER_PICKED_UP → RIDER_EN_ROUTE_DELIVERY
→ DELIVERED → CUSTOMER_CONFIRMED → COMPLETED
                                   ↘ CANCELLED / REFUNDED
```

Every transition is validated against an allowed-transition map and written to
`order_status_history` with the actor and timestamp.

## Security

- JWT access (15m) + refresh (7d) with rotation; refresh tokens stored hashed and
  revocable per-device.
- Argon2id password hashing (64MB memory cost).
- RBAC via `@Roles()` + `RolesGuard`. Six roles, least-privilege per endpoint.
- Account lockout after N failed logins.
- Helmet, CORS allowlist, rate limiting (app + Nginx), input validation/sanitization.
- Server-side payment verification only; webhook signatures verified (HMAC).

## Scaling

- Stateless API pods; sessions/queues in Redis.
- Connection pooling (max 20/pod); add read replicas as needed.
- Indexed foreign keys & status columns; pagination everywhere.
- BullMQ background jobs for notifications, settlements, payment retries.
