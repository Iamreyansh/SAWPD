"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addProduct,
  deleteProduct,
  getProduct,
  updateProduct,
} from "@/lib/products";
import { LOW_STOCK_THRESHOLD } from "@/lib/utils";
import { getOrder, listOrders, updateOrderStatus } from "@/lib/orders";
import { activatePlanMock, getStoreForSeller, updateStore } from "@/lib/store";
import { requireActiveStore, requireSeller } from "@/lib/seller-auth";
import { deleteUploadIfLocal, uploadProductImage, uploadHeroImage } from "@/lib/uploads";
import { MAX_PRODUCT_IMAGES } from "@/types/storefront";
import type { ProductImage } from "@/types/storefront";
import {
  addPromo,
  deletePromo,
  generatePromoCode,
  getPromoByCode,
  listPromosForStore,
  updatePromo,
} from "@/lib/promos";
import {
  addTemplate,
  deleteTemplate,
  toggleTemplateActive,
  updateTemplate,
} from "@/lib/custom-templates";
import { getOrder as getCustomOrder } from "@/lib/custom-orders";
import type { CustomOrderStatus } from "@/types/custom-orders";
import {
  blockSlot,
  deleteSlot as deleteServiceSlot,
  generateAvailability,
  listSlotsForStore,
} from "@/lib/service-slots";
import {
  THEMES,
  DEFAULT_THEME,
  isThemeId,
  type ThemeOverrides,
} from "@/lib/themes";
import { appendAudit } from "@/lib/audit";
import { notifyOrderStatusChanged, notifyStoreEmail } from "@/lib/notify";

const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  tagline: z.string().min(1, "Tagline is required").max(160),
  price: z.coerce
    .number()
    .int()
    .min(1, "Price must be at least ₹1")
    .max(10_000_000, "Price must be under ₹1 crore"),
  altText: z.string().min(1, "Alt text is required").max(200),
  images: z
    .array(z.object({ id: z.string(), url: z.string().url("Enter a valid image URL") }))
    .min(1, "Add at least one image")
    .max(MAX_PRODUCT_IMAGES, `Up to ${MAX_PRODUCT_IMAGES} images`),
  stockCount: z.coerce
    .number()
    .int()
    .min(0, "Stock must be 0 or more")
    .max(1_000_000, "Stock must be under 1 million"),
  isAvailable: z.coerce.boolean().optional().default(true),
  tags: z.array(z.string()).max(20).optional().default([]),
  slug: z.string().optional(),
  status: z.enum(["live", "draft"]).optional().default("live"),
  kind: z.enum(["product", "service"]).optional().default("product"),
  durationMinutes: z.coerce.number().int().min(5).max(24 * 60).optional(),
  location: z.string().max(200).optional().or(z.literal("")),
});

export type ProductFormInput = z.infer<typeof productSchema>;

export type ProductResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "item";
}

/**
 * Asserts that the current seller owns the store at `slug`. Returns the
 * seller id so callers can pass it to ownership-checked lib helpers like
 * `updateStore(..., { asSellerId })` and `activatePlanMock(..., { asSellerId })`.
 */
async function assertOwnsStore(slug: string): Promise<string> {
  const seller = await requireSeller();
  const store = await getStoreForSeller(slug, seller.id);
  if (!store) {
    throw new Error("Store not found or not owned by you.");
  }
  return seller.id;
}

function imageIdsFromUrls(urls: string[]): ProductImage[] {
  return urls.map((url) => ({ id: `img_${crypto.randomUUID().slice(0, 8)}`, url }));
}

export async function createProductAction(
  storeSlug: string,
  input: unknown
): Promise<ProductResult> {
  const sellerId = await assertOwnsStore(storeSlug);
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }
  const { slug, images, ...rest } = parsed.data;
  const normalized: ProductImage[] = imageIdsFromUrls(images.map((i) => i.url));
  const product = await addProduct(storeSlug, {
    ...rest,
    images: normalized,
    slug: slug?.trim() || slugify(parsed.data.title),
  });
  // addProduct is a global write — but we've already asserted ownership above.
  void sellerId;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath(`/s/${storeSlug}`);
  return { ok: true, id: product.id };
}

export async function updateProductAction(
  storeSlug: string,
  id: string,
  input: unknown
): Promise<ProductResult> {
  const sellerId = await assertOwnsStore(storeSlug);
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }
  const previous = await getProduct(storeSlug, id);
  const { slug, images, ...rest } = parsed.data;
  const normalized: ProductImage[] = imageIdsFromUrls(images.map((i) => i.url));
  const updated = await updateProduct(storeSlug, id, {
    ...rest,
    images: normalized,
    slug: slug?.trim() || slugify(parsed.data.title),
  });
  if (!updated) return { ok: false, error: "Product not found." };
  if (previous) {
    const prevUrls = new Set(previous.images.map((i) => i.url));
    const nextUrls = new Set(normalized.map((i) => i.url));
    for (const url of prevUrls) {
      if (!nextUrls.has(url)) {
        await deleteUploadIfLocal(url);
      }
    }
  }
  void sellerId;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath(`/s/${storeSlug}`);
  return { ok: true, id };
}

export async function deleteProductAction(
  storeSlug: string,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sellerId = await assertOwnsStore(storeSlug);
  const previous = await getProduct(storeSlug, id);
  if (!previous) return { ok: false, error: "Product not found." };

  // Check for pending orders referencing this product — query with filter, not full table
  const pendingStatuses = ["awaiting_verification", "awaiting_payment", "verified", "shipped"];
  const orders = await listOrders(storeSlug);
  const hasPending = orders.some(
    (o) =>
      pendingStatuses.includes(o.status) &&
      o.lines.some((l) => l.productId === id)
  );
  if (hasPending) {
    return {
      ok: false,
      error: "Cannot delete product — it has pending or active orders. Fulfil or cancel those orders first.",
    };
  }

  const ok = await deleteProduct(storeSlug, id);
  if (!ok) return { ok: false, error: "Product not found." };
  for (const img of previous.images) {
    await deleteUploadIfLocal(img.url);
  }
  void sellerId;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath(`/s/${storeSlug}`);
  return { ok: true };
}

export async function uploadProductImageAction(
  storeSlug: string,
  formData: FormData
): Promise<
  | { ok: true; url: string; filename: string }
  | { ok: false; error: string }
> {
  // Ownership check — prevents any signed-in seller from filling the
  // bucket with arbitrary content via the dashboard's image uploader.
  await assertOwnsStore(storeSlug);
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file received." };
  }
  return uploadProductImage(file);
}

export async function uploadHeroImageAction(
  storeSlug: string,
  formData: FormData
): Promise<
  | { ok: true; url: string; filename: string }
  | { ok: false; error: string }
> {
  await assertOwnsStore(storeSlug);
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file received." };
  }
  return uploadHeroImage(file);
}

const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "awaiting_payment",
    "awaiting_verification",
    "verified",
    "shipped",
    "completed",
    "cancelled",
  ]),
  trackingNote: z.string().optional(),
});

export type OrderResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateOrderStatusAction(
  input: unknown
): Promise<OrderResult> {
  const seller = await requireSeller();
  const parsed = orderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }
  const existing = await getOrder(parsed.data.orderId);
  if (!existing) return { ok: false, error: "Order not found." };
  await assertOwnsStore(existing.storeSlug);
  // updateOrderStatus() in lib/orders.ts enforces the state machine
  // (valid transitions per current status). Let it throw if invalid so
  // the UI surfaces a clear error.
  let updated;
  try {
    updated = await updateOrderStatus(parsed.data.orderId, {
      status: parsed.data.status,
      trackingNote: parsed.data.trackingNote,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid status transition.",
    };
  }
  if (!updated) return { ok: false, error: "Order not found." };
  if (
    parsed.data.status === "verified" ||
    parsed.data.status === "shipped" ||
    parsed.data.status === "completed" ||
    parsed.data.status === "cancelled"
  ) {
    try {
      const store = await getStoreForSeller(updated.storeSlug, seller.id);
      if (store) {
        await notifyOrderStatusChanged({
          storeName: store.name,
          storeEmail: store.notifyEmail || undefined,
          orderId: updated.id,
          customerName: updated.customer.name,
          status: parsed.data.status,
          trackingNote: parsed.data.trackingNote,
        });
      }
    } catch (err) {
      console.error("notifyOrderStatusChanged failed:", err);
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${parsed.data.orderId}`);
  return { ok: true };
}

export async function requestResendAction(
  input: unknown
): Promise<OrderResult> {
  const seller = await requireSeller();
  const parsed = orderStatusSchema.safeParse(input);
  if (!parsed.success || parsed.data.status !== "awaiting_payment") {
    return { ok: false, error: "Invalid request." };
  }
  const existing = await getOrder(parsed.data.orderId);
  if (!existing) return { ok: false, error: "Order not found." };
  await assertOwnsStore(existing.storeSlug);
  void seller;
  const updated = await updateOrderStatus(parsed.data.orderId, {
    status: "awaiting_payment",
  });
  if (!updated) return { ok: false, error: "Order not found." };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${parsed.data.orderId}`);
  return { ok: true };
}

const planSchema = z.object({
  plan: z.enum(["weekly", "monthly"]),
});

export type PlanResult =
  | { ok: true; plan: "weekly" | "monthly"; reference: string }
  | { ok: false; error: string };

export async function choosePlanAction(
  storeSlug: string,
  input: unknown
): Promise<PlanResult> {
  const sellerId = await assertOwnsStore(storeSlug);
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Pick a plan." };
  }
  const result = await activatePlanMock(storeSlug, parsed.data.plan, {
    asSellerId: sellerId,
  });
  if (!result) {
    return { ok: false, error: "Store not found." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/s/${storeSlug}`);
  return {
    ok: true,
    plan: parsed.data.plan,
    reference: result.billing.reference,
  };
}

const storeSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name must be 60 characters or less"),
  ownerHandle: z.string().min(1),
  whatsapp: z.string().optional(),
  upiId: z.string().min(1, "UPI ID is required").regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/, "Enter a valid UPI ID (e.g. name@bank)"),
  upiQrImage: z.string().optional().default(""),
  notifyEmail: z.string().email().or(z.literal("")),
  heroKicker: z.string().min(1),
  heroSub: z.string().min(1),
  heroImage: z.string().url("Enter a valid image URL"),
  heroHeadline: z.array(z.string().min(1)).min(1).max(4),
});

export type StoreResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function updateStoreAction(
  storeSlug: string,
  input: unknown
): Promise<StoreResult> {
  const sellerId = await assertOwnsStore(storeSlug);
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }
  const updated = await updateStore(storeSlug, parsed.data, {
    asSellerId: sellerId,
  });
  if (!updated) return { ok: false, error: "Store not found." };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/s/${storeSlug}`);
  return { ok: true };
}

// ---------- Promo codes ----------

const promoSchema = z
  .object({
    code: z
      .string()
      .min(3, "Code is too short")
      .max(24, "Code is too long")
      .transform((s) => s.trim().toUpperCase())
      .refine((s) => /^[A-Z0-9_-]+$/.test(s), {
        message: "Use A–Z, 0–9, dashes, underscores.",
      }),
    description: z.string().optional().default(""),
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().int().positive("Value must be positive"),
    minOrderAmount: z.coerce.number().int().min(0).optional(),
    usageLimit: z.coerce.number().int().min(1).optional(),
    startsAt: z.string().optional().or(z.literal("")),
    expiresAt: z.string().optional().or(z.literal("")),
    status: z.enum(["active", "paused"]).default("active"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percent" && data.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Percent cannot exceed 100.",
      });
    }
    if (data.startsAt && data.expiresAt && data.startsAt >= data.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "End must be after start.",
      });
    }
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "Expiry date cannot be in the past.",
      });
    }
  });

export type PromoFormInput = z.infer<typeof promoSchema>;

export type PromoResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function promoFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

function toPromoRecord(
  parsed: z.infer<typeof promoSchema>
): Omit<Parameters<typeof addPromo>[1], never> {
  return {
    code: parsed.code,
    description: parsed.description || undefined,
    type: parsed.type,
    value: parsed.value,
    minOrderAmount: parsed.minOrderAmount || undefined,
    usageLimit: parsed.usageLimit || undefined,
    startsAt: parsed.startsAt || undefined,
    expiresAt: parsed.expiresAt || undefined,
    status: parsed.status,
  };
}

export async function generatePromoCodeAction(): Promise<string> {
  return generatePromoCode();
}

export async function createPromoAction(
  storeSlug: string,
  input: unknown
): Promise<PromoResult> {
  const sellerId = await assertOwnsStore(storeSlug);
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: promoFieldErrors(parsed.error),
    };
  }
  const existing = await getPromoByCode(storeSlug, parsed.data.code);
  if (existing) {
    return {
      ok: false,
      error: "That code already exists.",
      fieldErrors: { code: "Try a different code." },
    };
  }
  const promo = await addPromo(storeSlug, toPromoRecord(parsed.data));
  void sellerId;
  revalidatePath("/dashboard/promotions");
  return { ok: true, id: promo.id };
}

export async function updatePromoAction(
  storeSlug: string,
  id: string,
  input: unknown
): Promise<PromoResult> {
  const sellerId = await assertOwnsStore(storeSlug);
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: promoFieldErrors(parsed.error),
    };
  }
  const others = await listPromosForStore(storeSlug);
  const clash = others.find(
    (p) => p.id !== id && p.code.toUpperCase() === parsed.data.code
  );
  if (clash) {
    return {
      ok: false,
      error: "That code already exists.",
      fieldErrors: { code: "Try a different code." },
    };
  }
  const updated = await updatePromo(storeSlug, id, toPromoRecord(parsed.data));
  if (!updated) return { ok: false, error: "Promo code not found." };
  void sellerId;
  revalidatePath("/dashboard/promotions");
  return { ok: true, id };
}

export async function deletePromoAction(
  storeSlug: string,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sellerId = await assertOwnsStore(storeSlug);
  const ok = await deletePromo(storeSlug, id);
  if (!ok) return { ok: false, error: "Promo code not found." };
  void sellerId;
  revalidatePath("/dashboard/promotions");
  return { ok: true };
}

export type CheckInventoryResult = {
  ok: true;
  flagged: { id: string; title: string; stockCount: number }[];
  notified: boolean;
};

/**
 * Manual inventory check. Scans for products at or below the low-stock
 * threshold and fires a single notification summarizing them.
 */
export async function checkInventoryAction(
  storeSlug: string
): Promise<CheckInventoryResult | { ok: false; error: string }> {
  const seller = await requireSeller();
  const store = await getStoreForSeller(storeSlug, seller.id);
  if (!store) return { ok: false, error: "Store not found or not owned by you." };
  const { listProductsForStore } = await import("@/lib/products");
  const { notifyLowStock } = await import("@/lib/notify");
  const products = await listProductsForStore(storeSlug);
  const flagged = products
    .filter(
      (p) =>
        p.isAvailable && p.stockCount > 0 && p.stockCount <= LOW_STOCK_THRESHOLD
    )
    .map((p) => ({ id: p.id, title: p.title, stockCount: p.stockCount }));
  let notified = false;
  if (flagged.length > 0) {
    await notifyLowStock({
      storeName: store.name,
      storeEmail: store.notifyEmail || undefined,
      products: flagged,
    });
    notified = true;
  }
  revalidatePath("/dashboard");
  return { ok: true, flagged, notified };
}

export async function dismissOnboardingAction(): Promise<{ ok: true }> {
  const store = await requireActiveStore();
  await updateStore(
    store.slug,
    { onboardingDismissed: true },
    { asSellerId: store.sellerId }
  );
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------- Returns ----------

const decideReturnSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["approved", "rejected", "refunded"]),
  note: z.string().max(500).optional(),
  refundAmount: z.coerce.number().int().min(0).optional(),
});

export type DecideReturnResult =
  | { ok: true }
  | { ok: false; error: string };

const returnsPolicySchema = z.object({
  enabled: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
    .transform((v) => v === true || v === "on" || v === "true"),
  windowDays: z.coerce.number().int().min(1).max(60),
  mode: z.enum(["any", "defective_only"]),
  policyText: z.string().max(800).optional().default(""),
});

export type UpdateReturnsPolicyResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function updateReturnsPolicyAction(
  storeSlug: string,
  input: unknown
): Promise<UpdateReturnsPolicyResult> {
  const sellerId = await assertOwnsStore(storeSlug);
  const parsed = returnsPolicySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if (typeof k === "string" && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors,
    };
  }
  const updated = await updateStore(
    storeSlug,
    {
      returnsPolicy: {
        enabled: parsed.data.enabled,
        windowDays: parsed.data.windowDays,
        mode: parsed.data.mode,
        policyText: parsed.data.policyText?.trim() || undefined,
      },
    },
    { asSellerId: sellerId }
  );
  if (!updated) return { ok: false, error: "Store not found." };
  revalidatePath("/dashboard/settings");
  revalidatePath(`/s/${storeSlug}`);
  revalidatePath("/track");
  return { ok: true };
}

export async function decideReturnAction(
  input: unknown
): Promise<DecideReturnResult> {
  const seller = await requireSeller();
  const parsed = decideReturnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const { getReturn, updateReturnStatus } = await import("@/lib/returns");
  const existing = await getReturn(parsed.data.id);
  if (!existing) return { ok: false, error: "Return request not found." };
  await assertOwnsStore(existing.storeSlug);
  void seller;
  if (existing.status !== "pending") {
    return { ok: false, error: "This return has already been decided." };
  }
  // Cap refundAmount by the originating order total so a seller cannot
  // approve a refund larger than what the customer actually paid.
  let refundAmount = parsed.data.refundAmount;
  if (refundAmount !== undefined) {
    const order = await getOrder(existing.orderId);
    if (!order) return { ok: false, error: "Order not found." };
    if (refundAmount > order.total) refundAmount = order.total;
    // Per-product cap: cannot exceed the line total being refunded.
    const line = order.lines.find((l) => l.productId === existing.productId);
    if (line && refundAmount > line.price * existing.qty) {
      refundAmount = line.price * existing.qty;
    }
  }
  const updated = await updateReturnStatus({
    id: parsed.data.id,
    status: parsed.data.status,
    note: parsed.data.note,
    refundAmount,
  });
  if (!updated) return { ok: false, error: "Could not save decision." };
  await appendAudit({
    kind: "return_decided",
    storeSlug: updated.storeSlug,
    returnId: updated.id,
    orderId: updated.orderId,
    decision: parsed.data.status,
  });
  revalidatePath(`/dashboard/orders/${updated.orderId}`);
  revalidatePath(`/dashboard/returns`);
  revalidatePath(`/track`);
  return { ok: true };
}

// ─── Custom Orders (per-store, authenticated) ──────────────────────

const templateFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(120),
  type: z.enum(["single_select", "multi_select", "number", "text", "date"]),
  required: z.boolean().default(false),
  options: z
    .array(z.object({ label: z.string().min(1).max(120), price: z.coerce.number().int().min(0).max(1_000_000) }))
    .max(20)
    .default([]),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(200).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

const templateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().default(""),
  imageUrl: z.string().url().or(z.literal("")).default(""),
  basePrice: z.coerce.number().int().min(0).max(1_000_000),
  fields: z.array(templateFieldSchema).min(1).max(15),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export type TemplateResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function templateFieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createCustomTemplateAction(
  input: unknown
): Promise<TemplateResult> {
  const store = await requireActiveStore();
  if (!store.customOrdersEnabled) {
    return { ok: false, error: "Custom orders are not enabled for this shop." };
  }
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: templateFieldErrors(parsed.error),
    };
  }
  const t = await addTemplate(store.slug, {
    ...parsed.data,
    description: parsed.data.description ?? "",
    imageUrl: parsed.data.imageUrl ?? "",
    fields: parsed.data.fields.map((f, i) => ({
      ...f,
      id: f.id || `fld_${crypto.randomUUID().slice(0, 8)}`,
      displayOrder: f.displayOrder ?? i,
    })),
  });
  revalidatePath("/dashboard/custom-templates");
  revalidatePath(`/s/${store.slug}/custom`);
  return { ok: true, id: t.id };
}

export async function updateCustomTemplateAction(
  templateId: string,
  input: unknown
): Promise<TemplateResult> {
  const store = await requireActiveStore();
  if (!store.customOrdersEnabled) {
    return { ok: false, error: "Custom orders are not enabled for this shop." };
  }
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: templateFieldErrors(parsed.error),
    };
  }
  const updated = await updateTemplate(templateId, store.slug, {
    ...parsed.data,
    description: parsed.data.description ?? "",
    imageUrl: parsed.data.imageUrl ?? "",
    fields: parsed.data.fields.map((f, i) => ({
      ...f,
      id: f.id || `fld_${crypto.randomUUID().slice(0, 8)}`,
      displayOrder: f.displayOrder ?? i,
    })),
  });
  if (!updated) return { ok: false, error: "Template not found." };
  revalidatePath("/dashboard/custom-templates");
  revalidatePath(`/dashboard/custom-templates/${templateId}`);
  revalidatePath(`/s/${store.slug}/custom`);
  return { ok: true, id: templateId };
}

export async function toggleCustomTemplateActiveAction(
  templateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await requireActiveStore();
  if (!store.customOrdersEnabled) {
    return { ok: false, error: "Custom orders are not enabled for this shop." };
  }
  const updated = await toggleTemplateActive(templateId, store.slug);
  if (!updated) return { ok: false, error: "Template not found." };
  revalidatePath("/dashboard/custom-templates");
  revalidatePath(`/s/${store.slug}/custom`);
  return { ok: true };
}

export async function deleteCustomTemplateAction(
  templateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await requireActiveStore();
  if (!store.customOrdersEnabled) {
    return { ok: false, error: "Custom orders are not enabled for this shop." };
  }
  // Block if there are pending orders referencing this template
  const { listOrdersForStore } = await import("@/lib/custom-orders");
  const orders = await listOrdersForStore(store.slug);
  const hasPending = orders.some(
    (o) =>
      o.templateId === templateId &&
      ["pending", "awaiting_payment", "awaiting_verification", "confirmed"].includes(
        o.status
      )
  );
  if (hasPending) {
    return {
      ok: false,
      error:
        "Cannot delete template — it has pending or active orders. Fulfil or cancel them first.",
    };
  }
  await deleteTemplate(templateId, store.slug);
  revalidatePath("/dashboard/custom-templates");
  revalidatePath(`/s/${store.slug}/custom`);
  return { ok: true };
}

// Settings toggle for the feature itself
export async function toggleCustomOrdersFeatureAction(
  enabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await requireActiveStore();
  await updateStore(
    store.slug,
    { customOrdersEnabled: enabled },
    { asSellerId: store.sellerId }
  );
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/s/${store.slug}/custom`);
  return { ok: true };
}

const customOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["confirmed", "fulfilled", "rejected"]),
  sellerNote: z.string().max(500).optional(),
});

export type CustomOrderDecisionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function decideCustomOrderAction(
  input: unknown
): Promise<CustomOrderDecisionResult> {
  const store = await requireActiveStore();
  if (!store.customOrdersEnabled) {
    return { ok: false, error: "Custom orders are not enabled for this shop." };
  }
  const parsed = customOrderStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const existing = await getCustomOrder(parsed.data.orderId);
  if (!existing || existing.storeSlug !== store.slug) {
    return { ok: false, error: "Order not found." };
  }
  try {
    const { updateOrderStatus } = await import("@/lib/custom-orders");
    const updated = await updateOrderStatus(parsed.data.orderId, {
      status: parsed.data.status as CustomOrderStatus,
      sellerNote: parsed.data.sellerNote,
    });
    if (!updated) return { ok: false, error: "Could not update order." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid status transition.",
    };
  }
  revalidatePath("/dashboard/custom-orders");
  revalidatePath(`/dashboard/custom-orders/${parsed.data.orderId}`);
  revalidatePath(`/s/${store.slug}/custom`);
  return { ok: true };
}

// ─── Customer-facing custom order submission (no auth) ──────────

const customerSubmitSchema = z.object({
  templateId: z.string().min(1),
  customerName: z.string().min(2).max(120),
  customerPhone: z
    .string()
    .min(10)
    .max(20)
    .regex(/^\+?[0-9\s-]+$/, "Invalid phone"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  selections: z.record(z.union([z.string(), z.array(z.string()), z.number()])),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  specialInstructions: z.string().max(1000).optional().default(""),
  preferredDate: z.string().optional().default(""),
  referenceImage: z.string().optional().default(""),
});

export type CustomerCustomOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitCustomerCustomOrder(
  storeSlug: string,
  input: unknown
): Promise<CustomerCustomOrderResult> {
  // Rate-limit like checkout — anonymous endpoint, must be throttled.
  const { checkoutLimiter } = await import("@/lib/rate-limit");
  const { getClientIp } = await import("@/lib/get-ip");
  const ip = await getClientIp();
  if (!checkoutLimiter.check(`custom-order:${ip}`)) {
    const retryMs = checkoutLimiter.retryAfter(`custom-order:${ip}`);
    const retrySec = Math.ceil(retryMs / 1000);
    return {
      ok: false,
      error: `Too many requests. Wait ${retrySec}s and try again.`,
    };
  }

  const parsed = customerSubmitSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please check the form.", fieldErrors };
  }

  const { getTemplate } = await import("@/lib/custom-templates");
  const { validateSelections, calculatePrice } = await import(
    "@/lib/custom-order-utils"
  );
  const template = await getTemplate(parsed.data.templateId);
  if (!template || template.storeSlug !== storeSlug || !template.isActive) {
    return { ok: false, error: "Template not found." };
  }

  const validationErrors = validateSelections(
    template,
    parsed.data.selections,
  );
  if (validationErrors.length > 0) {
    const fieldErrors: Record<string, string> = {};
    for (const err of validationErrors) {
      fieldErrors[err.fieldId] = err.message;
    }
    return {
      ok: false,
      error: "Please fill in all required fields.",
      fieldErrors,
    };
  }

  const breakdown = calculatePrice(
    template,
    parsed.data.selections,
    parsed.data.quantity,
  );

  const { addOrder: persistCustomOrder } = await import("@/lib/custom-orders");
  const order = await persistCustomOrder({
    storeSlug: template.storeSlug,
    templateId: template.id,
    templateName: template.name,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerEmail: parsed.data.customerEmail || undefined,
    selections: parsed.data.selections,
    calculatedPrice: breakdown.total,
    quantity: parsed.data.quantity,
    totalPrice: breakdown.total,
    referenceImage: parsed.data.referenceImage || undefined,
    specialInstructions: parsed.data.specialInstructions || undefined,
    preferredDate: parsed.data.preferredDate || undefined,
  });

  revalidatePath(`/s/${storeSlug}/custom`);
  revalidatePath("/dashboard/custom-orders");
  return { ok: true, orderId: order.id };
}

// ─── Service bookings (per-store) ───────────────────────────────

export async function toggleServicesFeatureAction(
  enabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await requireActiveStore();
  await updateStore(
    store.slug,
    { servicesEnabled: enabled },
    { asSellerId: store.sellerId }
  );
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/s/${store.slug}`);
  return { ok: true };
}

const generateAvailabilitySchema = z.object({
  productId: z.string().min(1),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.coerce.number().int().min(5).max(24 * 60),
  capacity: z.coerce.number().int().min(1).max(100).optional().default(1),
});

export type GenerateAvailabilityResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string };

export async function generateAvailabilityAction(
  input: unknown
): Promise<GenerateAvailabilityResult> {
  const store = await requireActiveStore();
  if (!store.servicesEnabled) {
    return { ok: false, error: "Services are not enabled for this shop." };
  }
  const parsed = generateAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Verify the product is actually a service belonging to this store.
  const { getProduct } = await import("@/lib/products");
  const product = await getProduct(store.slug, parsed.data.productId);
  if (!product || product.kind !== "service") {
    return {
      ok: false,
      error: "Product not found or isn't a service.",
    };
  }

  try {
    const result = await generateAvailability({
      storeSlug: store.slug,
      productId: parsed.data.productId,
      fromDate: parsed.data.fromDate,
      toDate: parsed.data.toDate,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      slotMinutes: parsed.data.slotMinutes,
      capacity: parsed.data.capacity,
    });
    revalidatePath(`/dashboard/services/${parsed.data.productId}`);
    return {
      ok: true,
      created: result.created,
      skipped: result.skipped,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to generate slots.",
    };
  }
}

export async function blockSlotAction(
  slotId: string,
  blocked: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await requireActiveStore();
  if (!store.servicesEnabled) {
    return { ok: false, error: "Services are not enabled for this shop." };
  }
  // Ownership check via listSlotsForStore + filter — keeps the helper
  // API simple.
  const all = await listSlotsForStore(store.slug);
  if (!all.find((s) => s.id === slotId)) {
    return { ok: false, error: "Slot not found." };
  }
  await blockSlot(slotId, blocked);
  revalidatePath("/dashboard/services");
  return { ok: true };
}

export async function deleteServiceSlotAction(
  slotId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await requireActiveStore();
  if (!store.servicesEnabled) {
    return { ok: false, error: "Services are not enabled for this shop." };
  }
  const all = await listSlotsForStore(store.slug);
  const slot = all.find((s) => s.id === slotId);
  if (!slot) return { ok: false, error: "Slot not found." };
  // Refuse to delete slots that have bookings — seller should cancel
  // the order or block the slot instead.
  if (slot.bookedCount > 0) {
    return {
      ok: false,
      error: "Can't delete a slot with bookings. Block it instead.",
    };
  }
  await deleteServiceSlot(slotId);
  revalidatePath("/dashboard/services");
  return { ok: true };
}

// ─── Storefront theme ────────────────────────────────────────────

const themeOverridesSchema = z.object({
  primary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex like #FF4A1C")
    .max(7)
    .optional()
    .or(z.literal("")),
  fontFamily: z.string().max(120).optional().or(z.literal("")),
});

export type UpdateStoreThemeResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateStoreThemeAction(
  storeSlug: string,
  themeId: string,
  overrides: unknown
): Promise<UpdateStoreThemeResult> {
  try {
    const store = await requireActiveStore();
    if (store.slug !== storeSlug) {
      return { ok: false, error: "Store not found." };
    }
    if (!isThemeId(themeId)) {
      return { ok: false, error: "Unknown theme." };
    }

    const parsed = themeOverridesSchema.safeParse(overrides ?? {});
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid overrides.",
      };
    }

    const clean: ThemeOverrides = {};
    if (parsed.data.primary && parsed.data.primary.length > 0) {
      clean.primary = parsed.data.primary;
    }
    if (parsed.data.fontFamily && parsed.data.fontFamily.length > 0) {
      clean.fontFamily = parsed.data.fontFamily;
    }

    await updateStore(
      storeSlug,
      { themeId, themeOverrides: clean },
      { asSellerId: store.sellerId },
    );
    revalidatePath("/dashboard/settings");
    revalidatePath(`/s/${storeSlug}`);
    return { ok: true };
  } catch (err) {
    // Never let a tracking failure surface as a 500 — log it and return
    // a friendly error so the dashboard's error boundary doesn't trip.
    console.error("[updateStoreThemeAction] failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Couldn't save your theme. Please try again.",
    };
  }
}
