// ─── User Roles ──────────────────────────────────────────────────────────────
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  RIDER = 'RIDER',
  STATION_STAFF = 'STATION_STAFF',
  STATION_MANAGER = 'STATION_MANAGER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// ─── Order Status ─────────────────────────────────────────────────────────────
export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  PREPARING = 'PREPARING',
  RIDER_ASSIGNED = 'RIDER_ASSIGNED',
  RIDER_EN_ROUTE_PICKUP = 'RIDER_EN_ROUTE_PICKUP',
  RIDER_ARRIVED_PICKUP = 'RIDER_ARRIVED_PICKUP',       // proximity-gated vs customer
  CYLINDER_PICKED_UP = 'CYLINDER_PICKED_UP',
  RIDER_EN_ROUTE_STATION = 'RIDER_EN_ROUTE_STATION',   // round-trip leg — was previously missing entirely
  AT_STATION = 'AT_STATION',                           // proximity-gated vs station; refill in progress
  RIDER_EN_ROUTE_DELIVERY = 'RIDER_EN_ROUTE_DELIVERY',
  RIDER_ARRIVED_DELIVERY = 'RIDER_ARRIVED_DELIVERY',   // proximity-gated vs customer; unlocks OTP entry
  DELIVERED = 'DELIVERED',
  CUSTOMER_CONFIRMED = 'CUSTOMER_CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

// ─── Order Type ───────────────────────────────────────────────────────────────
export enum OrderType {
  CYLINDER_EXCHANGE = 'CYLINDER_EXCHANGE',
  NEW_CYLINDER_PURCHASE = 'NEW_CYLINDER_PURCHASE',
  REFILL_SERVICE = 'REFILL_SERVICE',
}

// ─── Delivery Tier ──────────────────────────────────────────────────────────
// Independent of OrderType — any order type can be STANDARD or EXPRESS.
// STANDARD: clustered with nearby orders into one rider's loop by BatchingService.
// EXPRESS: dedicated rider, matched immediately, carries a surcharge.
export enum DeliveryTier {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
}

// ─── Delivery Batch Status ─────────────────────────────────────────────────────
// A batch groups nearby STANDARD orders into one rider's loop. See
// BatchingService — a scheduled job clusters pending orders and assigns
// one rider to the whole batch, spreading trip cost across several customers.
export enum BatchStatus {
  PENDING = 'PENDING',     // clustered, no rider matched yet
  ASSIGNED = 'ASSIGNED',   // rider matched to the whole batch
  COMPLETED = 'COMPLETED',
}

// ─── Cylinder Status ──────────────────────────────────────────────────────────
export enum CylinderStatus {
  FILLED = 'FILLED',
  EMPTY = 'EMPTY',
  RESERVED = 'RESERVED',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  RETIRED = 'RETIRED',
  IN_TRANSIT = 'IN_TRANSIT',
  CUSTOMER_OWNED = 'CUSTOMER_OWNED',
  STATION_OWNED = 'STATION_OWNED',
  UNDER_INSPECTION = 'UNDER_INSPECTION',
}

// ─── Payment Status ───────────────────────────────────────────────────────────
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CANCELLED = 'CANCELLED',
}

// ─── Payment Method ───────────────────────────────────────────────────────────
// Powergas is fully cashless — every order pays in-app via escrow.
// CASH intentionally excluded: see concept doc "Payment & Revenue Model".
export enum PaymentMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
}

// ─── Rider Status ─────────────────────────────────────────────────────────────
export enum RiderStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  SUSPENDED = 'SUSPENDED',
}

// ─── Dispute Status ───────────────────────────────────────────────────────────
export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED',
}

// ─── Dispute Type ─────────────────────────────────────────────────────────────
export enum DisputeType {
  MISSING_CYLINDER = 'MISSING_CYLINDER',
  DAMAGED_CYLINDER = 'DAMAGED_CYLINDER',
  LATE_DELIVERY = 'LATE_DELIVERY',
  INCORRECT_ORDER = 'INCORRECT_ORDER',
  PAYMENT_DISPUTE = 'PAYMENT_DISPUTE',
  REFUND_REQUEST = 'REFUND_REQUEST',
  OTHER = 'OTHER',
}

// ─── Notification Type ────────────────────────────────────────────────────────
export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_ACCEPTED = 'ORDER_ACCEPTED',
  ORDER_ASSIGNED = 'ORDER_ASSIGNED',
  RIDER_EN_ROUTE = 'RIDER_EN_ROUTE',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_ISSUED = 'REFUND_ISSUED',
  LOW_INVENTORY = 'LOW_INVENTORY',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
  OTP_SENT = 'OTP_SENT',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  CHANGE_REQUEST_RAISED = 'CHANGE_REQUEST_RAISED',
  CHANGE_REQUEST_APPROVED = 'CHANGE_REQUEST_APPROVED',
  CHANGE_REQUEST_REJECTED = 'CHANGE_REQUEST_REJECTED',
  WALLET_CREDITED = 'WALLET_CREDITED',
  WITHDRAWAL_PROCESSED = 'WITHDRAWAL_PROCESSED',
  GENERAL = 'GENERAL',
}

// ─── Wallet Transaction Type ──────────────────────────────────────────────────
export enum WalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum WalletTransactionReason {
  DELIVERY_EARNING = 'DELIVERY_EARNING',
  WITHDRAWAL = 'WITHDRAWAL',
  BONUS = 'BONUS',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND = 'REFUND',
}

// ─── Verification Status ──────────────────────────────────────────────────────
export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

// ─── Station Stock Status ─────────────────────────────────────────────────────
// Separate from GasStation.isActive (open/closed the shop) — this tracks
// whether gas is actually available right now. See concept doc: a station
// can be "open" but have no gas, and false AVAILABLE listings are penalized.
export enum StockStatus {
  AVAILABLE = 'AVAILABLE',
  SHORTAGE = 'SHORTAGE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

// ─── Order Change Request Status ──────────────────────────────────────────────
// Station-flagged scope/price change mid-order (e.g. "the rubber needs
// changing"). Requires a photo, and the customer must Confirm & Pay before
// work continues — see concept doc "Vendor-Detected Issue Flow".
export enum ChangeRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// ─── File Purpose ─────────────────────────────────────────────────────────────
export enum FilePurpose {
  PROOF_OF_DELIVERY = 'PROOF_OF_DELIVERY',
  PROOF_OF_PICKUP = 'PROOF_OF_PICKUP',
  CYLINDER_PHOTO = 'CYLINDER_PHOTO',
  PROFILE_IMAGE = 'PROFILE_IMAGE',
  SUPPORT_ATTACHMENT = 'SUPPORT_ATTACHMENT',
  DOCUMENT = 'DOCUMENT',
}
