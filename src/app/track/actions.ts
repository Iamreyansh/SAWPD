"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOrder } from "@/lib/orders";
import { getStore } from "@/lib/store";
import {
  addReturn,
  checkReturnEligibility,
  listReturnsForOrder,
} from "@/lib/returns";
import { appendAudit } from "@/lib/audit";
import { notifyStoreEmail } from "@/lib/notify";
import type { Order, OrderLine } from "@/types/seller";
import type { Store as StorefrontStore } from "@/types/storefront";
import { trackLimiter, formLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";

type Store = StorefrontStore;

export type TrackedOrder = Pick<
  Order,
  | "id"
  | "createdAt"
  | "status"
  | "total"
  | "subtotal"
  | "discountAmount"
  | "promoCode"
  | "trackingNote"
  | "verifiedAt"
  | "shippedAt"
  | "completedAt"
  | "cancelledAt"
> & { lines: OrderLine[] };

export type TrackResult =
  | {
      ok: true;
      order: TrackedOrder;
      customer: { name: string };
      store: Pick<Store, "slug" | "name" | "whatsapp" | "ownerHandle">;
      returns: { id: string; status: string; productTitle: string; qty: number; requestedAt: string }[];
      returnsPolicy: Store["returnsPolicy"];
    }
  | { ok: false; error: string };

const trackSchema = z.object({
  orderId: z
    .string()
    .min(1, "Enter your order ID")
    .transform((s) => s.trim()),
  phone: z
    .string()
    .min(4, "Enter the phone number you used at checkout")
    .transform((s) => s.trim()),
});

function normalizePhone(p: string): string {
  return p.replace(/[^\d]/g, "");
}

export async function trackOrderAction(input: unknown): Promise<TrackResult> {
  const ip = await getClientIp();
  if (!trackLimiter.check(`track:${ip}`)) {
    return { ok: false, error: "Too many lookups. Please wait a moment." };
  }

  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const orderId = parsed.data.orderId;
  const phoneDigits = normalizePhone(parsed.data.phone);
  if (phoneDigits.length < 7) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const order = await getOrder(orderId);
  if (!order) {
    return { ok: false, error: "No matching order found. Please check your order ID and phone number." };
  }
  const orderPhoneDigits = normalizePhone(order.customer.phone);
  // Require exact match after normalization to prevent partial phone enumeration
  if (orderPhoneDigits !== phoneDigits) {
    return { ok: false, error: "No matching order found. Please check your order ID and phone number." };
  }

  const store = await getStore(order.storeSlug);
  if (!store) {
    return { ok: false, error: "Store no longer exists." };
  }

  const returns = await listReturnsForOrder(order.id);

  return {
    ok: true,
    order: {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      lines: order.lines,
      total: order.total,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      promoCode: order.promoCode,
      trackingNote: order.trackingNote,
      verifiedAt: order.verifiedAt,
      shippedAt: order.shippedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
    },
    customer: { name: order.customer.name },
    store: {
      slug: store.slug,
      name: store.name,
      whatsapp: store.whatsapp,
      ownerHandle: store.ownerHandle,
    },
    returns: returns.map((r) => ({
      id: r.id,
      status: r.status,
      productTitle: r.productTitle,
      qty: r.qty,
      requestedAt: r.requestedAt,
    })),
    returnsPolicy: store.returnsPolicy ?? undefined,
  };
}

// ---------- Customer-initiated return ----------

const returnSchema = z.object({
  orderId: z.string().min(1).transform((s) => s.trim()),
  phone: z.string().min(4).transform((s) => s.trim()),
  productId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99),
  reason: z
    .string()
    .min(8, "Tell the shop what's wrong (at least 8 characters).")
    .max(800, "Keep it under 800 characters."),
});

export type RequestReturnResult =
  | {
      ok: true;
      id: string;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function requestReturnAction(
  input: unknown
): Promise<RequestReturnResult> {
  const ip = await getClientIp();
  if (!formLimiter.check(`return:${ip}`)) {
    return { ok: false, error: "Too many return requests. Please wait a moment." };
  }

  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if (typeof k === "string" && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
      fieldErrors,
    };
  }
  const order = await getOrder(parsed.data.orderId);
  if (!order) return { ok: false, error: "Order not found." };
  const store = await getStore(order.storeSlug);
  if (!store) return { ok: false, error: "Store no longer exists." };

  const phoneDigits = normalizePhone(parsed.data.phone);
  const eligibility = checkReturnEligibility({
    order,
    customerPhoneLast7: phoneDigits,
    policy: store.returnsPolicy ?? null,
  });
  if (!eligibility.eligible) {
    const map: Record<string, string> = {
      policy_disabled: "This shop doesn't accept returns right now.",
      no_policy: "This shop hasn't set up a returns policy yet.",
      order_not_deliverable:
        "Returns are only available after the order is shipped.",
      phone_mismatch: "Phone number doesn't match this order.",
      outside_window: "The return window has closed for this order.",
    };
    return {
      ok: false,
      error: map[eligibility.reason ?? "no_policy"] ?? "Returns aren't available.",
    };
  }

  const line = order.lines.find((l) => l.productId === parsed.data.productId);
  if (!line) return { ok: false, error: "That product isn't in this order." };
  if (parsed.data.qty > line.qty) {
    return {
      ok: false,
      error: `You ordered ${line.qty} of this — can't return more.`,
      fieldErrors: { qty: `Max ${line.qty}` },
    };
  }

  const req = await addReturn({
    storeSlug: order.storeSlug,
    orderId: order.id,
    productId: line.productId,
    productTitle: line.title,
    qty: parsed.data.qty,
    amountInr: line.price * parsed.data.qty,
    reason: parsed.data.reason,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
  });

  appendAudit({
    kind: "return_requested",
    storeSlug: order.storeSlug,
    returnId: req.id,
    orderId: order.id,
    productTitle: line.title,
    qty: parsed.data.qty,
  });

  if (store.notifyEmail) {
    await notifyStoreEmail({
      to: store.notifyEmail,
      subject: `Return requested · ${order.id} (${line.title})`,
      body: [
        `${order.customer.name} requested a return on order ${order.id}.`,
        ``,
        `Product: ${line.title} × ${parsed.data.qty}`,
        `Reason: ${parsed.data.reason}`,
        ``,
        `Open the dashboard → Orders → ${order.id} to approve or reject.`,
      ].join("\n"),
    });
  }

  revalidatePath(`/track`);
  revalidatePath(`/dashboard/orders/${order.id}`);
  revalidatePath(`/dashboard/returns`);
  return { ok: true, id: req.id };
}
