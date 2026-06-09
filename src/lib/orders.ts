import "server-only";
import { randomUUID } from "crypto";
import type { Order, OrderStatus } from "@/types/seller";
import { createAdminClient } from "@/lib/supabase/admin";

function rowToOrder(row: Record<string, unknown>): Order {
  let customer: Order["customer"] = { name: "", phone: "", address: "" };
  if (row.customer && typeof row.customer === "object") {
    customer = row.customer as Order["customer"];
  } else if (typeof row.customer === "string") {
    try { customer = JSON.parse(row.customer); } catch { /* keep default */ }
  }

  let lines: Order["lines"] = [];
  if (Array.isArray(row.lines)) {
    lines = row.lines as Order["lines"];
  } else if (typeof row.lines === "string") {
    try { lines = JSON.parse(row.lines); } catch { /* keep empty */ }
  }

  return {
    id: row.id as string,
    storeSlug: row.store_slug as string,
    createdAt: row.created_at as string,
    status: row.status as OrderStatus,
    customer,
    lines,
    total: row.total as number,
    subtotal: (row.subtotal as number) ?? undefined,
    promoCode: (row.promo_code as string) ?? undefined,
    discountAmount: (row.discount_amount as number) ?? undefined,
    screenshotDataUrl: (row.screenshot_data_url as string) ?? undefined,
    paymentScreenshot: (row.payment_screenshot as Order["paymentScreenshot"]) ?? undefined,
    resendRequestedAt: (row.resend_requested_at as string) ?? undefined,
    verifiedAt: (row.verified_at as string) ?? undefined,
    shippedAt: (row.shipped_at as string) ?? undefined,
    completedAt: (row.completed_at as string) ?? undefined,
    cancelledAt: (row.cancelled_at as string) ?? undefined,
    trackingNote: (row.tracking_note as string) ?? undefined,
    reviewerNote: (row.reviewer_note as string) ?? undefined,
  };
}

export async function listOrders(slug: string): Promise<Order[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("store_slug", slug)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToOrder);
}

export async function getOrder(id: string): Promise<Order | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToOrder(data);
}

export type CreateOrderInput = Omit<
  Order,
  "id" | "createdAt" | "status"
> & {
  status?: OrderStatus;
};

export async function addOrder(input: CreateOrderInput): Promise<Order> {
  const order: Order = {
    ...input,
    id: `ord_${randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    status: input.status ?? "awaiting_verification",
  };

  const sb = createAdminClient();
  const { error } = await sb.from("orders").insert({
    id: order.id,
    store_slug: order.storeSlug,
    created_at: order.createdAt,
    status: order.status,
    customer: order.customer,
    lines: order.lines,
    total: order.total,
    subtotal: order.subtotal ?? null,
    promo_code: order.promoCode ?? null,
    discount_amount: order.discountAmount ?? null,
    screenshot_data_url: order.screenshotDataUrl ?? null,
    payment_screenshot: order.paymentScreenshot ?? null,
    tracking_note: order.trackingNote ?? null,
    reviewer_note: order.reviewerNote ?? null,
  });
  if (error) throw error;

  // Decrement stock for each line item (conditional update prevents race condition)
  for (const line of order.lines) {
    const { data: product } = await sb
      .from("products")
      .select("stock_count")
      .eq("id", line.productId)
      .single();
    if (product && (product.stock_count as number) >= line.qty) {
      // Conditional update: only decrement if sufficient stock remains
      await sb
        .from("products")
        .update({ stock_count: (product.stock_count as number) - line.qty })
        .eq("id", line.productId)
        .gte("stock_count", line.qty);
    }
  }

  return order;
}

export type OrderStatusUpdate = {
  status: OrderStatus;
  trackingNote?: string;
};

export async function updateOrderStatus(
  id: string,
  patch: OrderStatusUpdate
): Promise<Order | null> {
  const now = new Date().toISOString();
  const sb = createAdminClient();

  const rowPatch: Record<string, unknown> = {
    status: patch.status,
  };
  if (patch.trackingNote !== undefined) rowPatch.tracking_note = patch.trackingNote;

  // Auto-stamp timestamps
  if (patch.status === "awaiting_payment") rowPatch.resend_requested_at = now;
  if (patch.status === "verified") rowPatch.verified_at = now;
  if (patch.status === "shipped") rowPatch.shipped_at = now;
  if (patch.status === "completed") rowPatch.completed_at = now;
  if (patch.status === "cancelled") rowPatch.cancelled_at = now;

  const { error } = await sb
    .from("orders")
    .update(rowPatch)
    .eq("id", id);
  if (error) throw error;

  return getOrder(id);
}
