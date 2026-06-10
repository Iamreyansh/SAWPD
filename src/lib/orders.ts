import "server-only";
import { randomUUID } from "crypto";
import type { Order, OrderStatus } from "@/types/seller";
import { createAdminClient } from "@/lib/supabase/admin";

const ORDER_SUMMARY_COLUMNS =
  "id, store_slug, created_at, status, customer, lines, total, subtotal, promo_code, discount_amount, payment_screenshot, resend_requested_at, verified_at, shipped_at, completed_at, cancelled_at, tracking_note, reviewer_note";

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

/**
 * List orders WITHOUT screenshot_data_url — use for dashboard, stats, CSV.
 * The screenshot field can be up to 8MB per order; excluding it reduces
 * data transfer by 99%+ for list operations.
 */
export async function listOrderSummaries(slug: string): Promise<Order[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("orders")
    .select(ORDER_SUMMARY_COLUMNS)
    .eq("store_slug", slug)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToOrder);
}

/** @deprecated Use listOrderSummaries() unless you need screenshot_data_url */
export async function listOrders(slug: string): Promise<Order[]> {
  return listOrderSummaries(slug);
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

/**
 * Count orders by status for a store — single query, count in JS.
 */
export async function countOrdersByStatus(
  slug: string
): Promise<Record<OrderStatus, number>> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("orders")
    .select("status")
    .eq("store_slug", slug);
  if (error || !data) {
    return {
      awaiting_verification: 0,
      awaiting_payment: 0,
      verified: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    };
  }
  const counts: Record<string, number> = {
    awaiting_verification: 0,
    awaiting_payment: 0,
    verified: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of data) {
    const s = row.status as string;
    if (s in counts) counts[s]++;
  }
  return counts as Record<OrderStatus, number>;
}

/**
 * Count total orders for a store — single aggregate query.
 */
export async function countOrders(slug: string): Promise<number> {
  const sb = createAdminClient();
  const { count } = await sb
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_slug", slug);
  return count ?? 0;
}

/**
 * Sum revenue for orders matching given statuses — single RPC call.
 */
export async function sumRevenueByStatus(
  slug: string,
  statuses: OrderStatus[]
): Promise<number> {
  if (statuses.length === 0) return 0;
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("sum_orders_total", {
    p_store_slug: slug,
    p_statuses: statuses,
  });
  if (error) return 0;
  return (data as number) ?? 0;
}

/**
 * Sum total discount for a store — single RPC call.
 */
export async function sumDiscounts(slug: string): Promise<number> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("sum_discounts", {
    p_store_slug: slug,
  });
  if (error) return 0;
  return (data as number) ?? 0;
}

/**
 * Count orders with discount for a store — single RPC call.
 */
export async function countDiscountedOrders(slug: string): Promise<number> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("count_discounted_orders", {
    p_store_slug: slug,
  });
  if (error) return 0;
  return (data as number) ?? 0;
}

/**
 * Get store footer stats — single query, no full order load.
 * Returns week quantity, total quantity, and customer count.
 */
export async function getStoreFooterStats(
  slug: string
): Promise<{ weekCount: number; totalCount: number; customerCount: number } | null> {
  const sb = createAdminClient();
  const soldStatuses = ["verified", "shipped", "completed"];
  const { data, error } = await sb
    .from("orders")
    .select("created_at, lines, customer")
    .eq("store_slug", slug)
    .in("status", soldStatuses);
  if (error || !data || data.length === 0) return null;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let weekCount = 0;
  let totalCount = 0;
  const phones = new Set<string>();

  for (const row of data) {
    let lines: { qty: number }[] = [];
    if (Array.isArray(row.lines)) {
      lines = row.lines as { qty: number }[];
    } else if (typeof row.lines === "string") {
      try { lines = JSON.parse(row.lines); } catch { lines = []; }
    }

    const qty = lines.reduce((a, l) => a + (l.qty ?? 0), 0);
    totalCount += qty;

    if (new Date(row.created_at as string).getTime() >= weekAgo) {
      weekCount += qty;
    }

    let phone = "";
    if (row.customer && typeof row.customer === "object") {
      phone = (row.customer as Record<string, unknown>).phone as string ?? "";
    }
    if (phone) phones.add(phone);
  }

  return { weekCount, totalCount, customerCount: phones.size };
}

export type CreateOrderInput = Omit<
  Order,
  "id" | "createdAt" | "status"
> & {
  status?: OrderStatus;
};

export type CreateOrderResult =
  | { order: Order; stockFailed: false }
  | { order: null; stockFailed: true };

export async function addOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const order: Order = {
    ...input,
    id: `ord_${randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    status: input.status ?? "awaiting_verification",
  };

  const sb = createAdminClient();

  // Decrement stock BEFORE inserting order — prevents overselling.
  // If any line has insufficient stock, abort the entire order.
  const stockResults = await Promise.all(
    order.lines.map(async (line) => {
      const { data, error } = await sb.rpc("decrement_stock", {
        p_product_id: line.productId,
        p_qty: line.qty,
      });
      return { productId: line.productId, success: !error && data !== -1 };
    })
  );

  const failedLines = stockResults.filter((r) => !r.success);
  if (failedLines.length > 0) {
    // Roll back: re-increment stock for lines that were decremented
    await Promise.all(
      stockResults
        .filter((r) => r.success)
        .map(async (r) => {
          const line = order.lines.find((l) => l.productId === r.productId)!;
          try {
            await sb.rpc("increment_stock", {
              p_product_id: line.productId,
              p_qty: line.qty,
            });
          } catch {
            console.error(`Stock rollback failed for ${line.productId}`);
          }
        })
    );
    return { order: null, stockFailed: true };
  }

  // All stock decrements succeeded — insert the order
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

  if (error) {
    // Order insert failed — roll back all stock decrements
    await Promise.all(
      order.lines.map(async (line) => {
        try {
          await sb.rpc("increment_stock", {
            p_product_id: line.productId,
            p_qty: line.qty,
          });
        } catch {
          console.error(`Stock rollback failed for ${line.productId}`);
        }
      })
    );
    throw error;
  }

  return { order, stockFailed: false };
}

export type OrderStatusUpdate = {
  status: OrderStatus;
  trackingNote?: string;
};

/** Valid status transitions — prevents invalid state changes */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_verification: ["awaiting_payment", "verified", "cancelled"],
  awaiting_payment: ["verified", "cancelled"],
  verified: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

export async function updateOrderStatus(
  id: string,
  patch: OrderStatusUpdate
): Promise<Order | null> {
  const sb = createAdminClient();

  // Fetch current status to validate transition
  const current = await getOrder(id);
  if (!current) return null;

  const allowed = VALID_TRANSITIONS[current.status];
  if (!allowed || !allowed.includes(patch.status)) {
    throw new Error(
      `Invalid status transition: ${current.status} → ${patch.status}`
    );
  }

  const now = new Date().toISOString();

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
