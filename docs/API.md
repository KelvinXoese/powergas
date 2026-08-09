# Powergas API Contracts (v1)

Base URL: `/api/v1` · Auth: `Authorization: Bearer <accessToken>`
All responses are wrapped: `{ "success": true, "data": <T>, "timestamp": "..." }`

## Auth
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | public | Register user, sends OTP |
| POST | `/auth/login` | public | Returns access token, sets refresh cookie |
| POST | `/auth/refresh` | public | Rotates tokens |
| POST | `/auth/logout` | any | Revokes refresh token |
| POST | `/auth/verify-otp` | any | Verifies phone OTP |
| GET  | `/auth/me` | any | Current user |

## Orders
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/orders` | CUSTOMER | Create order (idempotent) |
| GET | `/orders` | CUSTOMER | My orders (paginated) |
| GET | `/orders/:id` | any | Order detail |
| GET | `/orders/:id/history` | any | Status history |
| PATCH | `/orders/:id/status` | STAFF/RIDER/ADMIN | Advance status |
| PATCH | `/orders/:id/assign-rider` | STAFF/MANAGER/ADMIN | Assign rider |
| POST | `/orders/:id/confirm-delivery` | CUSTOMER | Confirm w/ OTP |
| POST | `/orders/:id/cancel` | CUSTOMER/ADMIN | Cancel + release stock |

## Inventory
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/inventory/types` | public | Cylinder types |
| POST | `/inventory/cylinders` | STAFF+ | Register cylinder (QR) |
| GET | `/inventory/cylinders/:serial` | any | Lookup by serial/QR |
| GET | `/inventory/station/:id` | STAFF+ | Station inventory |
| PATCH | `/inventory/station/:id/adjust` | STAFF+ | Adjust stock |
| GET | `/inventory/reports/low-stock` | ADMIN | Low-stock report |

## Payments
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/payments/initiate` | any | Start payment (idempotent) |
| GET | `/payments/verify/:reference` | any | Server-side verify |
| POST | `/payments/webhooks/:provider` | public | Provider webhook (signed) |

## Riders
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/riders/me` | RIDER | Profile |
| PATCH | `/riders/availability` | RIDER | Toggle availability |
| GET | `/riders/wallet` | RIDER | Wallet balance |
| GET | `/riders/wallet/transactions` | RIDER | Transactions |
| POST | `/riders/wallet/withdraw` | RIDER | Request withdrawal |
| GET | `/riders/nearest` | STAFF+ | Nearest available riders |

## Real-time (Socket.IO, namespace `/tracking`)
| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe_order` | client→server | Subscribe to order updates |
| `rider_location` | rider→server | GPS ping (broadcast to subscribers) |
| `location_update` | server→client | Live position + ETA |
| `order_status` | server→client | Status change |
| `notification` | server→client | Live notification |

Admin (`/admin/*`), Stations (`/stations/*`), Disputes (`/disputes/*`),
Reviews (`/reviews/*`), Files (`/files/*`), Notifications (`/notifications/*`),
and Health (`/health`, `/health/ready`) follow the same conventions.


## Station Staff (authoritative staff→station mapping)
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/stations/my-station` | STAFF/MANAGER/ADMIN | Resolve the caller's station |
| GET | `/stations/:id/staff` | MANAGER/ADMIN | List staff at a station |
| POST | `/stations/:id/staff` | ADMIN/SUPER_ADMIN | Assign a user to a station |
| DELETE | `/stations/:id/staff/:userId` | ADMIN/SUPER_ADMIN | Remove a staff member |

## Station Dashboard (per-station, scoped)
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/station-dashboard/:id/overview` | STAFF+ | This station's headline metrics |
| GET | `/station-dashboard/:id/revenue-series` | STAFF+ | Daily revenue series |
| GET | `/station-dashboard/:id/riders` | STAFF+ | Riders at this station |
| GET | `/station-dashboard/:id/customers` | STAFF+ | Customers of this station |
| PUT | `/inventory/station/:id/pricing` | MANAGER+ | Set per-type prices |
| GET | `/inventory/station/:id/pricing-history` | MANAGER+ | Price change history |

## Super Admin (platform)
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/admin/commissions` | ADMIN+ | List commission rules |
| POST | `/admin/commissions` | ADMIN+ | Set platform/per-station commission |
| GET | `/admin/settings` | ADMIN+ | List system settings |
| PUT | `/admin/settings` | ADMIN+ | Upsert a system setting |
