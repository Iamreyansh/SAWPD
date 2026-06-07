export type ProductImage = {
  id: string;
  url: string;
};

export type ProductStatus = "live" | "draft" | "scheduled" | "archived";

export type Product = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  price: number;
  altText: string;
  images: ProductImage[];
  stockCount: number;
  isAvailable: boolean;
  tags?: string[];
  status?: ProductStatus;
  scheduledFor?: string;
};

export const MAX_PRODUCT_IMAGES = 6;

export type ReturnsPolicy = {
  enabled: boolean;
  windowDays: number;
  mode: "any" | "defective_only";
  policyText?: string;
};

export const DEFAULT_RETURNS_POLICY: ReturnsPolicy = {
  enabled: false,
  windowDays: 7,
  mode: "any",
};

export type Store = {
  slug: string;
  name: string;
  ownerHandle: string;
  whatsapp?: string;
  heroImage: string;
  heroKicker: string;
  heroHeadline: string[];
  heroSub: string;
  upiId: string;
  notifyEmail: string;
  paused?: boolean;
  pausedReason?: string;
  onboardingDismissed?: boolean;
  returnsPolicy?: ReturnsPolicy;
};

export type CartItem = {
  productId: string;
  qty: number;
};

export type OrderLine = {
  productId: string;
  title: string;
  price: number;
  qty: number;
};

export type OrderDraft = {
  storeSlug: string;
  items: OrderLine[];
  total: number;
  customer: {
    name: string;
    phone: string;
    address: string;
    email?: string;
  };
  screenshotDataUrl?: string;
};

export type OrderConfirmation = {
  orderId: string;
  createdAt: string;
};
