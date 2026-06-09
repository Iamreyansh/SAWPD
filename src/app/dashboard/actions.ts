"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addProduct,
  deleteProduct,
  getProduct,
  updateProduct,
} from "@/lib/products";
import { getOrder, updateOrderStatus } from "@/lib/orders";
import { activatePlanMock, getActiveStoreForSeller, getStoreForSeller, updateStore } from "@/lib/store";
import { requireSeller } from "@/lib/seller-auth";
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
import { appendAudit } from "@/lib/audit";

const productSchema = z.object({
  title: z.string().min(1, "Title is required"),
  tagline: z.string().min(1, "Tagline is required"),
  price: z.coerce.number().int().min(0, "Price must be 0 or more"),
  altText: z.string().min(1, "Alt text is required"),
  images: z
    .array(z.object({ id: z.string(), url: z.string().url("Enter a valid image URL") }))
    .min(1, "Add at least one image")
    .max(MAX_PRODUCT_IMAGES, `Up to ${MAX_PRODUCT_IMAGES} images`),
  stockCount: z.coerce.number().int().min(0, "Stock must be 0 or more"),
  isAvailable: z.coerce.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
  slug: z.string().optional(),
  status: z.enum(["live", "draft"]).optional().default("live"),
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
  const ok = await deleteProduct(storeSlug, id);
  if (!ok) return { ok: false, error: "Product not found." };
  if (previous) {
    for (const img of previous.images) {
      await deleteUploadIfLocal(img.url);
    }
  }
  void sellerId;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath(`/s/${storeSlug}`);
  return { ok: true };
}

export async function uploadProductImageAction(
  formData: FormData
): Promise<
  | { ok: true; url: string; filename: string }
  | { ok: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file received." };
  }
  return uploadProductImage(file);
}

export async function uploadHeroImageAction(
  formData: FormData
): Promise<
  | { ok: true; url: string; filename: string }
  | { ok: false; error: string }
> {
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
  void seller;
  const updated = await updateOrderStatus(parsed.data.orderId, {
    status: parsed.data.status,
    trackingNote: parsed.data.trackingNote,
  });
  if (!updated) return { ok: false, error: "Order not found." };
  if (
    parsed.data.status === "verified" ||
    parsed.data.status === "shipped" ||
    parsed.data.status === "completed" ||
    parsed.data.status === "cancelled"
  ) {
    const { getStoreForSeller } = await import("@/lib/store");
    const { notifyOrderStatusChanged } = await import("@/lib/notify");
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
  const { getStoreForSeller } = await import("@/lib/store");
  const { notifyOrderStatusChanged } = await import("@/lib/notify");
  const store = await getStoreForSeller(updated.storeSlug, seller.id);
  if (store) {
    await notifyOrderStatusChanged({
      storeName: store.name,
      storeEmail: store.notifyEmail || undefined,
      orderId: updated.id,
      customerName: updated.customer.name,
      status: "cancelled",
      trackingNote: "Asked customer to re-upload screenshot.",
    });
  }
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
  const { notifyTrialEnding } = await import("@/lib/notify");
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(result.store.trialEndsAt ?? new Date()).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000)
    )
  );
  await notifyTrialEnding({
    storeName: result.store.name,
    storeEmail: result.store.notifyEmail || undefined,
    daysLeft: days,
  });
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
  name: z.string().min(1),
  ownerHandle: z.string().min(1),
  whatsapp: z.string().optional(),
  upiId: z.string().min(1),
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

const LOW_STOCK_THRESHOLD = 5;

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
  const seller = await requireSeller();
  const store = await getActiveStoreForSeller(seller.id);
  if (store) {
    await updateStore(
      store.slug,
      { onboardingDismissed: true },
      { asSellerId: seller.id }
    );
  }
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
  const updated = await updateReturnStatus({
    id: parsed.data.id,
    status: parsed.data.status,
    note: parsed.data.note,
    refundAmount: parsed.data.refundAmount,
  });
  if (!updated) return { ok: false, error: "Could not save decision." };
  appendAudit({
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
