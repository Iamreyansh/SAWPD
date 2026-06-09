"use server";

import { z } from "zod";
import { addOrder } from "@/lib/orders";
import { applyPromo, validatePromo } from "@/lib/promos";
import { getStore } from "@/lib/store";
import { isStoreOpen } from "@/lib/trial";
import { checkPaymentScreenshot } from "@/lib/payment-check";
import { notifyOrderPlaced } from "@/lib/notify";
import type { OrderLine } from "@/types/seller";
import { checkoutLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";
import { requireCaptcha } from "@/lib/captcha";
import { getProductsByIds } from "@/lib/products";
import { revalidatePath } from "next/cache";

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10).regex(/^[0-9+\s-]+$/, "Invalid phone number"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(10),
});

const lineSchema = z.object({
  productId: z.string().min(1),
  title: z.string().min(1),
  price: z.number().int().min(0),
  qty: z.number().int().min(1),
  imageUrl: z.string().min(1),
});

const placeOrderSchema = z.object({
  storeSlug: z.string().min(1),
  customer: customerSchema,
  lines: z.array(lineSchema).min(1),
  subtotal: z.number().int().min(0),
  promoCode: z.string().optional().or(z.literal("")),
  screenshotDataUrl: z.string().max(12000000).optional().or(z.literal("")), // ~8MB base64
  captchaToken: z.string().optional().or(z.literal("")),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export type CheckoutResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export type ValidatePromoActionResult =
  | { ok: true; discountAmount: number; promoCode: string; finalTotal: number }
  | { ok: false; error: string };

export async function validatePromoAction(
  storeSlug: string,
  code: string,
  subtotal: number
): Promise<ValidatePromoActionResult> {
  const result = await validatePromo(storeSlug, code, subtotal);
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    discountAmount: result.discountAmount,
    promoCode: result.promoCode,
    finalTotal: Math.max(0, subtotal - result.discountAmount),
  };
}

export async function placeOrder(
  input: unknown
): Promise<CheckoutResult> {
  const ip = await getClientIp();
  if (!checkoutLimiter.check(`checkout:${ip}`)) {
    const retryMs = checkoutLimiter.retryAfter(`checkout:${ip}`);
    const retrySec = Math.ceil(retryMs / 1000);
    return { ok: false, error: `Too many orders. Wait ${retrySec}s and try again.` };
  }

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid order data." };
  }

  // CAPTCHA verification
  const captchaError = await requireCaptcha(parsed.data.captchaToken);
  if (captchaError) return { ok: false, error: captchaError };

  const data = parsed.data;

  const store = await getStore(data.storeSlug);
  if (!store) {
    return { ok: false, error: "Shop not found." };
  }
  if (!isStoreOpen(store)) {
    return {
      ok: false,
      error:
        "This shop is currently paused. Please contact the seller directly.",
    };
  }
  if (!store.upiId || store.upiId.trim() === "" || store.upiId === "your-upi@bank") {
    return {
      ok: false,
      error: "This shop hasn't configured UPI payments yet. Please check back later.",
    };
  }

  // Server-side price validation: only fetch the specific products in the cart
  const productIds = data.lines.map((l) => l.productId);
  const dbProducts = await getProductsByIds(data.storeSlug, productIds);
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));
  let serverSubtotal = 0;
  for (const line of data.lines) {
    const dbProduct = productMap.get(line.productId);
    if (!dbProduct) {
      return { ok: false, error: `Product "${line.title}" is no longer available.` };
    }
    if (!dbProduct.isAvailable) {
      return { ok: false, error: `Product "${line.title}" is out of stock.` };
    }
    if (line.qty > dbProduct.stockCount) {
      return { ok: false, error: `Only ${dbProduct.stockCount} of "${line.title}" available.` };
    }
    // Use DB price, not client-sent price
    serverSubtotal += dbProduct.price * line.qty;
  }
  // Verify subtotal matches (within 1 rupee tolerance for rounding)
  if (Math.abs(data.subtotal - serverSubtotal) > 1) {
    return { ok: false, error: "Cart total mismatch. Please refresh and try again." };
  }

  let discountAmount = 0;
  let appliedCode: string | undefined;
  if (data.promoCode) {
    const commit = await applyPromo(data.storeSlug, data.promoCode, data.subtotal);
    if (!commit.ok) {
      return { ok: false, error: commit.error };
    }
    discountAmount = commit.discountAmount;
    appliedCode = commit.promoCode;
  }

  const finalTotal = Math.max(0, data.subtotal - discountAmount);

  const screenshotDataUrl = data.screenshotDataUrl || undefined;
  const check = screenshotDataUrl
    ? checkPaymentScreenshot(screenshotDataUrl)
    : undefined;

  const order = await addOrder({
    storeSlug: data.storeSlug,
    customer: data.customer,
    lines: data.lines as OrderLine[],
    subtotal: data.subtotal,
    total: finalTotal,
    discountAmount: discountAmount || undefined,
    promoCode: appliedCode,
    screenshotDataUrl,
    paymentScreenshot: check,
    status: "awaiting_verification",
  });
  await notifyOrderPlaced({
    storeName: store.name,
    storeEmail: store.notifyEmail || undefined,
    orderId: order.id,
    customerName: order.customer.name,
    total: order.total,
  });
  revalidatePath(`/s/${data.storeSlug}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/customers");
  revalidatePath("/admin");
  return { ok: true, orderId: order.id };
}
