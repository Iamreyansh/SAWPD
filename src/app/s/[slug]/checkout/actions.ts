"use server";

import { z } from "zod";
import { addOrder, updateOrderStatus } from "@/lib/orders";
import { applyPromo, validatePromo } from "@/lib/promos";
import { getStore } from "@/lib/store";
import { isStoreOpen } from "@/lib/trial";
import { checkPaymentScreenshot } from "@/lib/payment-check";
import { notifyOrderPlaced, notifyStoreEmail } from "@/lib/notify";
import type { OrderLine } from "@/types/seller";
import { checkoutLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";
import { requireCaptcha } from "@/lib/captcha";
import { getProductsByIds } from "@/lib/products";
import { revalidatePath } from "next/cache";
import { fireServerEvent, buildPurchaseEvent } from "@/lib/pixels/server";

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
  /** Set when this line is a service booking. */
  slotId: z.string().min(1).optional(),
  slotStartsAt: z.string().datetime().optional(),
  slotEndsAt: z.string().datetime().optional(),
  kind: z.enum(["product", "service"]).default("product"),
});

const placeOrderSchema = z.object({
  storeSlug: z.string().min(1),
  customer: customerSchema,
  lines: z.array(lineSchema).min(1),
  subtotal: z.number().int().min(0),
  promoCode: z.string().optional().or(z.literal("")),
  screenshotDataUrl: z.string().max(12000000).optional().or(z.literal("")), // ~8MB base64
  captchaToken: z.string().optional().or(z.literal("")),
  // If the customer phone-verified via OTP, we can mark the order
  // verified immediately (no manual screenshot review needed).
  phoneVerified: z.boolean().optional().default(false),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export type CheckoutResult =
  | { ok: true; orderId: string; eventId: string }
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
    const commit = await applyPromo(data.storeSlug, data.promoCode, serverSubtotal);
    if (!commit.ok) {
      return { ok: false, error: commit.error };
    }
    discountAmount = commit.discountAmount;
    appliedCode = commit.promoCode;
  }

  const finalTotal = Math.max(0, serverSubtotal - discountAmount);

  const screenshotDataUrl = data.screenshotDataUrl || undefined;
  const check = screenshotDataUrl
    ? checkPaymentScreenshot(screenshotDataUrl)
    : undefined;

  // Build authoritative lines from DB data — never trust client-sent titles/prices
  const authoritativeLines: OrderLine[] = data.lines.map((l) => {
    const dbProduct = productMap.get(l.productId)!;
    return {
      productId: l.productId,
      title: dbProduct.title,
      price: dbProduct.price,
      qty: l.qty,
      imageUrl: dbProduct.images[0]?.url ?? "",
    };
  });

  // Validate service lines: every line with a slotId must have both
  // slotStartsAt and slotEndsAt. Slot booking happens after order insert.
  for (const l of data.lines) {
    if (l.kind === "service") {
      if (!l.slotId || !l.slotStartsAt || !l.slotEndsAt) {
        return {
          ok: false,
          error: `Service "${l.title}" is missing a time slot. Please refresh and try again.`,
        };
      }
    }
  }

  const result = await addOrder({
    storeSlug: data.storeSlug,
    customer: data.customer,
    lines: authoritativeLines,
    subtotal: serverSubtotal,
    total: finalTotal,
    discountAmount: discountAmount || undefined,
    promoCode: appliedCode,
    screenshotDataUrl,
    paymentScreenshot: check,
    // Phone-verified customers skip the screenshot review step.
    status: data.phoneVerified ? "verified" : "awaiting_verification",
  });

  if (result.stockFailed) {
    // Stock was insufficient — order was not inserted (rolled back before insert)
    return { ok: false, error: "Some items went out of stock. Please refresh and try again." };
  }

  // Reserve service slots (only for service line items). If a slot was
  // taken in the meantime, roll back the order.
  const serviceLines = data.lines.filter((l) => l.kind === "service");
  if (serviceLines.length > 0) {
    try {
      const { bookSlot } = await import("@/lib/service-slots");
      for (const l of serviceLines) {
        await bookSlot({
          orderId: result.order.id,
          slotId: l.slotId!,
          productId: l.productId,
          startsAt: l.slotStartsAt!,
          endsAt: l.slotEndsAt!,
          customerName: data.customer.name,
          customerPhone: data.customer.phone,
        });
      }
      // Notify the seller that a booking just came in. Best-effort.
      try {
        const { getStore } = await import("@/lib/store");
        const { getProduct } = await import("@/lib/products");
        const storeRow = await getStore(data.storeSlug);
        if (storeRow) {
          const lines: string[] = [];
          for (const l of serviceLines) {
            const product = await getProduct(data.storeSlug, l.productId);
            const when = new Date(l.slotStartsAt!).toLocaleString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            lines.push(`• ${product?.title ?? l.productId} — ${when}`);
          }
          await notifyStoreEmail({
            to: storeRow.notifyEmail,
            subject: `New booking ${result.order.id} · ${storeRow.name}`,
            body:
              `New service booking from ${data.customer.name} (${data.customer.phone}).\n\n` +
              `When:\n${lines.join("\n")}\n\n` +
              `Manage in your dashboard: /dashboard/services`,
          });
        }
      } catch (err) {
        console.error("[notify] booking notification failed:", err);
      }
    } catch (err) {
      // Slot was lost — cancel the order so we don't strand it.
      try {
        await updateOrderStatus(result.order.id, {
          status: "cancelled",
        });
      } catch {
        /* swallow */
      }
      return {
        ok: false,
        error:
          "That time slot was just booked by someone else. Please pick a new time.",
      };
    }
  }

  // Notify best-effort. The order is already saved — a mail-server
  // hiccup must not 500 the customer and force them to retry.
  try {
    await notifyOrderPlaced({
      storeName: store.name,
      storeEmail: store.notifyEmail || undefined,
      orderId: result.order.id,
      customerName: result.order.customer.name,
      total: result.order.total,
    });
  } catch (err) {
    console.error("notifyOrderPlaced failed:", err);
  }

  // Server-side purchase event (Meta CAPI + future GA4 MP).
  // Best-effort; never blocks the order confirmation. Returns the
  // event_id so the success view can re-fire on the browser pixel
  // and Meta deduplicates the two events into one conversion.
  const purchaseEvent = buildPurchaseEvent({
    orderId: result.order.id,
    value: result.order.total,
    numItems: result.order.lines.reduce((acc, l) => acc + l.qty, 0),
    contentIds: result.order.lines.map((l) => l.productId),
    email: result.order.customer.email,
    phone: result.order.customer.phone,
  });
  try {
    await fireServerEvent(purchaseEvent);
  } catch (err) {
    console.error("[pixels] purchase event failed:", err);
  }
  revalidatePath(`/s/${data.storeSlug}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/customers");
  revalidatePath("/admin");
  return { ok: true, orderId: result.order.id, eventId: purchaseEvent.eventId };
}
