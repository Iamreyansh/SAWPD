import type { Product, Store } from "./storefront";

export type OrderStatus =
  | "awaiting_payment"
  | "awaiting_verification"
  | "verified"
  | "shipped"
  | "completed"
  | "cancelled";

export type OrderLine = {
  productId: string;
  title: string;
  price: number;
  qty: number;
  imageUrl: string;
};

export type OrderCustomer = {
  name: string;
  phone: string;
  email?: string;
  address: string;
};

export type Order = {
  id: string;
  storeSlug: string;
  createdAt: string;
  status: OrderStatus;
  customer: OrderCustomer;
  lines: OrderLine[];
  total: number;
  subtotal?: number;
  promoCode?: string;
  discountAmount?: number;
  screenshotDataUrl?: string;
  paymentScreenshot?: PaymentScreenshotCheck;
  resendRequestedAt?: string;
  verifiedAt?: string;
  shippedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  trackingNote?: string;
  reviewerNote?: string;
};

export type PaymentScreenshotCheck = {
  valid: boolean;
  mime: string | null;
  approxKb: number;
  reason?: string;
};

export type SellerProduct = Product;

/**
 * One seller account (email + password) can own multiple stores. Each
 * store still has its own subscription (`plan` + `trialEndsAt`) — those
 * are per-store, not per-seller. `sellerId` is the foreign key into
 * `data/sellers.json`.
 */
export type Seller = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

/**
 * What we return from `getCurrentSeller()`. Never includes the password
 * hash — that's only stored in the JSON file and only used for verification.
 */
export type PublicSeller = Pick<Seller, "id" | "email" | "createdAt">;

export type SellerStore = Store & {
  sellerId: string;
  plan?: "weekly" | "monthly";
  trialEndsAt?: string;
};

export type DashboardStats = {
  totalRevenue: number;
  pendingVerification: number;
  awaitingPayment: number;
  totalOrders: number;
  totalProducts: number;
  lowStockProducts: number;
};

export type PromoType = "percent" | "fixed";

export type PromoCode = {
  id: string;
  storeSlug: string;
  code: string;
  description?: string;
  type: PromoType;
  value: number;
  minOrderAmount?: number;
  usageLimit?: number;
  usageCount: number;
  startsAt?: string;
  expiresAt?: string;
  status: "active" | "paused";
  createdAt: string;
};

export type PromoState = "active" | "paused" | "expired" | "scheduled" | "exhausted";

export type ApplyPromoResult =
  | { ok: true; discountAmount: number; promoCode: string }
  | { ok: false; error: string };
