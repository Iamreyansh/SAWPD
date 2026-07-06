import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CustomOrder,
  CustomOrderSelections,
  CustomOrderStatus,
} from "@/types/custom-orders";

export {
  calculatePrice,
  validateSelections,
  type PriceBreakdown,
  type PriceBreakdownLine,
  type ValidationError,
} from "@/lib/custom-order-utils";

function rowToOrder(row: Record<string, unknown>): CustomOrder {
  const selections =
    typeof row.selections === "string"
      ? (() => {
          try {
            return JSON.parse(row.selections);
          } catch {
            return {};
          }
        })()
      : ((row.selections ?? {}) as CustomOrderSelections);

  return {
    id: row.id as string,
    storeSlug: row.store_slug as string,
    templateId: row.template_id as string,
    templateName: row.template_name as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    customerEmail: (row.customer_email as string) ?? undefined,
    selections,
    calculatedPrice: (row.calculated_price as number) ?? 0,
    quantity: (row.quantity as number) ?? 1,
    totalPrice: (row.total_price as number) ?? 0,
    referenceImage: (row.reference_image as string) ?? undefined,
    specialInstructions: (row.special_instructions as string) ?? undefined,
    preferredDate: (row.preferred_date as string) ?? undefined,
    status: row.status as CustomOrderStatus,
    sellerNote: (row.seller_note as string) ?? undefined,
    paymentScreenshot: (row.payment_screenshot as string) ?? undefined,
    createdAt: row.created_at as string,
    confirmedAt: (row.confirmed_at as string) ?? undefined,
    paidAt: (row.paid_at as string) ?? undefined,
    fulfilledAt: (row.fulfilled_at as string) ?? undefined,
    rejectedAt: (row.rejected_at as string) ?? undefined,
    expiredAt: (row.expired_at as string) ?? undefined,
  };
}

export async function listOrdersForStore(
  slug: string,
): Promise<CustomOrder[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("custom_orders")
    .select("*")
    .eq("store_slug", slug)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToOrder);
}

export async function listOrdersByStatus(
  slug: string,
  status?: CustomOrderStatus,
): Promise<CustomOrder[]> {
  const all = await listOrdersForStore(slug);
  if (!status) return all;
  return all.filter((o) => o.status === status);
}

export async function countOrdersByStatus(
  slug: string,
): Promise<Record<CustomOrderStatus, number>> {
  const all = await listOrdersForStore(slug);
  const counts: Record<string, number> = {
    pending: 0,
    awaiting_payment: 0,
    awaiting_verification: 0,
    confirmed: 0,
    fulfilled: 0,
    rejected: 0,
    expired: 0,
    cancelled: 0,
  };
  for (const o of all) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }
  return counts as Record<CustomOrderStatus, number>;
}

export async function getOrder(id: string): Promise<CustomOrder | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("custom_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToOrder(data);
}

export type AddCustomOrderInput = {
  storeSlug: string;
  templateId: string;
  templateName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  selections: CustomOrderSelections;
  calculatedPrice: number;
  quantity: number;
  totalPrice: number;
  referenceImage?: string;
  specialInstructions?: string;
  preferredDate?: string;
};

export async function addOrder(input: AddCustomOrderInput): Promise<CustomOrder> {
  const sb = createAdminClient();
  const now = new Date().toISOString();
  const order: CustomOrder = {
    id: `corder_${randomUUID().slice(0, 8)}`,
    storeSlug: input.storeSlug,
    templateId: input.templateId,
    templateName: input.templateName,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    selections: input.selections,
    calculatedPrice: input.calculatedPrice,
    quantity: input.quantity,
    totalPrice: input.totalPrice,
    referenceImage: input.referenceImage,
    specialInstructions: input.specialInstructions,
    preferredDate: input.preferredDate,
    status: "pending",
    createdAt: now,
  };

  const { error } = await sb.from("custom_orders").insert({
    id: order.id,
    store_slug: order.storeSlug,
    template_id: order.templateId,
    template_name: order.templateName,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_email: order.customerEmail ?? null,
    selections: order.selections,
    calculated_price: order.calculatedPrice,
    quantity: order.quantity,
    total_price: order.totalPrice,
    reference_image: order.referenceImage ?? null,
    special_instructions: order.specialInstructions ?? null,
    preferred_date: order.preferredDate ?? null,
    status: order.status,
    created_at: order.createdAt,
  });
  if (error) throw error;

  return order;
}

const VALID_TRANSITIONS: Record<CustomOrderStatus, CustomOrderStatus[]> = {
  pending: ["awaiting_payment", "confirmed", "rejected", "expired", "cancelled"],
  awaiting_payment: ["awaiting_verification", "cancelled", "expired"],
  awaiting_verification: ["confirmed", "cancelled"],
  confirmed: ["fulfilled", "cancelled"],
  fulfilled: [],
  rejected: [],
  expired: [],
  cancelled: [],
};

export async function updateOrderStatus(
  id: string,
  patch: { status: CustomOrderStatus; sellerNote?: string },
): Promise<CustomOrder | null> {
  const sb = createAdminClient();
  const existing = await getOrder(id);
  if (!existing) return null;

  const allowed = VALID_TRANSITIONS[existing.status];
  if (!allowed || !allowed.includes(patch.status)) {
    throw new Error(
      `Invalid status transition: ${existing.status} → ${patch.status}`,
    );
  }

  const now = new Date().toISOString();
  const rowPatch: Record<string, unknown> = { status: patch.status };
  if (patch.sellerNote !== undefined) rowPatch.seller_note = patch.sellerNote;

  if (patch.status === "confirmed") rowPatch.confirmed_at = now;
  if (patch.status === "fulfilled") rowPatch.fulfilled_at = now;
  if (patch.status === "rejected") rowPatch.rejected_at = now;
  if (patch.status === "expired") rowPatch.expired_at = now;
  if (patch.status === "awaiting_payment") rowPatch.paid_at = undefined;

  const { error } = await sb.from("custom_orders").update(rowPatch).eq("id", id);
  if (error) throw error;

  return getOrder(id);
}

export async function updateOrderPayment(
  id: string,
  screenshotDataUrl: string,
): Promise<CustomOrder | null> {
  const sb = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await sb
    .from("custom_orders")
    .update({
      payment_screenshot: screenshotDataUrl,
      status: "awaiting_verification",
      paid_at: now,
    })
    .eq("id", id);
  if (error) throw error;
  return getOrder(id);
}

export async function deleteExpiredOrders(
  maxAgeHours: number = 24,
): Promise<number> {
  const sb = createAdminClient();
  const cutoff = new Date(
    Date.now() - maxAgeHours * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await sb
    .from("custom_orders")
    .select("id, status, created_at")
    .in("status", ["pending", "awaiting_payment"])
    .lt("created_at", cutoff);
  if (error || !data) return 0;

  let deleted = 0;
  for (const row of data) {
    const { error: uErr } = await sb
      .from("custom_orders")
      .update({
        status: "expired",
        expired_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (!uErr) deleted++;
  }
  return deleted;
}