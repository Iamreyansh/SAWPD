import "server-only";
import { randomUUID } from "crypto";
import type { Order } from "@/types/seller";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReturnStatus = "pending" | "approved" | "rejected" | "refunded";

export type ReturnRequest = {
  id: string;
  storeSlug: string;
  orderId: string;
  productId: string;
  productTitle: string;
  qty: number;
  amountInr: number;
  reason: string;
  customerName: string;
  customerPhone: string;
  status: ReturnStatus;
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  refundAmount: number | null;
};

function rowToReturn(row: Record<string, unknown>): ReturnRequest {
  return {
    id: row.id as string,
    storeSlug: row.store_slug as string,
    orderId: row.order_id as string,
    productId: row.product_id as string,
    productTitle: row.product_title as string,
    qty: row.qty as number,
    amountInr: row.amount_inr as number,
    reason: row.reason as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    status: row.status as ReturnStatus,
    requestedAt: row.requested_at as string,
    decidedAt: (row.decided_at as string) ?? null,
    decisionNote: (row.decision_note as string) ?? null,
    refundAmount: (row.refund_amount as number) ?? null,
  };
}

export async function listReturnsForStore(
  storeSlug: string
): Promise<ReturnRequest[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("returns")
    .select("*")
    .eq("store_slug", storeSlug)
    .order("requested_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToReturn);
}

export async function listReturnsForOrder(
  orderId: string
): Promise<ReturnRequest[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("returns")
    .select("*")
    .eq("order_id", orderId)
    .order("requested_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToReturn);
}

export async function getReturn(id: string): Promise<ReturnRequest | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("returns")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToReturn(data);
}

export type CreateReturnInput = {
  storeSlug: string;
  orderId: string;
  productId: string;
  productTitle: string;
  qty: number;
  amountInr: number;
  reason: string;
  customerName: string;
  customerPhone: string;
};

export async function addReturn(
  input: CreateReturnInput
): Promise<ReturnRequest> {
  const req: ReturnRequest = {
    id: `ret_${randomUUID().slice(0, 8)}`,
    storeSlug: input.storeSlug,
    orderId: input.orderId,
    productId: input.productId,
    productTitle: input.productTitle,
    qty: input.qty,
    amountInr: input.amountInr,
    reason: input.reason.trim(),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    status: "pending",
    requestedAt: new Date().toISOString(),
    decidedAt: null,
    decisionNote: null,
    refundAmount: null,
  };

  const sb = createAdminClient();
  const { error } = await sb.from("returns").insert({
    id: req.id,
    store_slug: req.storeSlug,
    order_id: req.orderId,
    product_id: req.productId,
    product_title: req.productTitle,
    qty: req.qty,
    amount_inr: req.amountInr,
    reason: req.reason,
    customer_name: req.customerName,
    customer_phone: req.customerPhone,
    status: req.status,
    requested_at: req.requestedAt,
  });
  if (error) throw error;

  return req;
}

export type UpdateReturnDecisionInput = {
  id: string;
  status: "approved" | "rejected" | "refunded";
  note?: string;
  refundAmount?: number;
};

export async function updateReturnStatus(
  input: UpdateReturnDecisionInput
): Promise<ReturnRequest | null> {
  const now = new Date().toISOString();
  const sb = createAdminClient();

  const rowPatch: Record<string, unknown> = {
    status: input.status,
    decided_at: now,
  };
  if (input.note) rowPatch.decision_note = input.note.trim();
  if (input.status === "refunded") {
    rowPatch.refund_amount = input.refundAmount ?? null;
  } else if (input.refundAmount !== undefined) {
    rowPatch.refund_amount = input.refundAmount;
  }

  const { error } = await sb
    .from("returns")
    .update(rowPatch)
    .eq("id", input.id);
  if (error) throw error;

  return getReturn(input.id);
}

export type ReturnEligibility = {
  eligible: boolean;
  reason?:
    | "policy_disabled"
    | "outside_window"
    | "order_not_deliverable"
    | "phone_mismatch"
    | "no_policy";
  daysLeft?: number;
  policy: {
    enabled: boolean;
    windowDays: number;
    mode: "any" | "defective_only";
  } | null;
};

export type CheckReturnEligibilityArgs = {
  order: Order;
  customerPhoneLast7: string;
  now?: Date;
  policy?: {
    enabled: boolean;
    windowDays: number;
    mode: "any" | "defective_only";
  } | null;
};

export function checkReturnEligibility(
  args: CheckReturnEligibilityArgs
): ReturnEligibility {
  const { order, customerPhoneLast7, now = new Date() } = args;
  const policy = args.policy ?? null;
  if (!policy || !policy.enabled) {
    return { eligible: false, reason: policy ? "policy_disabled" : "no_policy", policy };
  }
  if (
    order.status !== "shipped" &&
    order.status !== "completed"
  ) {
    return { eligible: false, reason: "order_not_deliverable", policy };
  }
  const stored = (order.customer?.phone || "").replace(/\D/g, "");
  const submitted = (customerPhoneLast7 || "").replace(/\D/g, "");
  const min = 7;
  if (stored.length < min || submitted.length < min) {
    return { eligible: false, reason: "phone_mismatch", policy };
  }
  const okMatch =
    stored.endsWith(submitted.slice(-min)) ||
    submitted.endsWith(stored.slice(-min));
  if (!okMatch) {
    return { eligible: false, reason: "phone_mismatch", policy };
  }
  const created = new Date(order.createdAt).getTime();
  const deadline = created + policy.windowDays * 24 * 60 * 60 * 1000;
  if (now.getTime() > deadline) {
    return { eligible: false, reason: "outside_window", policy };
  }
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline - now.getTime()) / (24 * 60 * 60 * 1000))
  );
  return { eligible: true, policy, daysLeft };
}
