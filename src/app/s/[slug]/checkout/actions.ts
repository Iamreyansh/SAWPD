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

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
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
  screenshotDataUrl: z.string().optional().or(z.literal("")),
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
  return { ok: true, orderId: order.id };
}
