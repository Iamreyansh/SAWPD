"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOrder, updateOrderStatus } from "@/lib/orders";
import { checkoutLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";
import { notifyOrderPlaced } from "@/lib/notify";
import { fireServerEvent, buildPurchaseEvent } from "@/lib/pixels/server";

/**
 * Customer-facing "I've paid, mark my order" action.
 *
 * Used after the customer has paid externally (GPay/PhonePe/Paytm) and
 * wants to move their order from `awaiting_verification` to `verified`.
 *
 * In a production-grade system this would be replaced by a payment
 * gateway webhook (Razorpay / Cashfree / PayU). For the tuktuk-style
 * MVP it's a manual button — the seller still confirms in the
 * dashboard.
 */

const schema = z.object({
  orderId: z.string().min(1),
  // Optional proof of payment (screenshot) — accepted but not required.
  screenshotDataUrl: z.string().max(12_000_000).optional().or(z.literal("")),
});

export type ConfirmPaidResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function confirmPaymentAction(
  input: unknown,
): Promise<ConfirmPaidResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const ip = await getClientIp();
  if (!checkoutLimiter.check(`confirm:${ip}`)) {
    return { ok: false, error: "Too many requests. Wait a minute." };
  }

  const existing = await getOrder(parsed.data.orderId);
  if (!existing) return { ok: false, error: "Order not found." };

  // Idempotency: only move the order forward from awaiting_* states.
  if (
    existing.status !== "awaiting_verification" &&
    existing.status !== "awaiting_payment"
  ) {
    return { ok: false, error: `Order is already ${existing.status}.` };
  }

  // Update status via the central lib so the state machine is enforced.
  try {
    await updateOrderStatus(parsed.data.orderId, {
      status: "awaiting_verification",
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update order.",
    };
  }

  // Fire the purchase event so ad attribution is captured.
  try {
    await fireServerEvent(
      buildPurchaseEvent({
        orderId: existing.id,
        value: existing.total,
        numItems: existing.lines.reduce((acc, l) => acc + l.qty, 0),
        contentIds: existing.lines.map((l) => l.productId),
        email: existing.customer.email,
        phone: existing.customer.phone,
      }),
    );
  } catch (err) {
    console.error("[pixels] confirm-payment purchase event failed:", err);
  }

  // Notify the seller that a customer clicked "I've paid".
  try {
    const { getStoreForSeller } = await import("@/lib/store");
    const { getStoresForSeller } = await import("@/lib/store");
    const { getCurrentSeller } = await import("@/lib/seller-auth");
    // Best-effort: notify via the store's notifyEmail (we don't have
    // a seller session in this anonymous action, so we look up the
    // store directly).
    const { getStore } = await import("@/lib/store");
    const store = await getStore(existing.storeSlug);
    if (store) {
      await notifyOrderPlaced({
        storeName: store.name,
        storeEmail: store.notifyEmail || undefined,
        orderId: existing.id,
        customerName: existing.customer.name,
        total: existing.total,
      });
    }
  } catch (err) {
    console.error("[notify] confirmPaymentAction failed:", err);
  }

  revalidatePath(`/s/${existing.storeSlug}`);
  revalidatePath(`/dashboard/orders/${existing.id}`);
  return { ok: true, orderId: existing.id };
}