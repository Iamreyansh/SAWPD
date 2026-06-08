import "server-only";
import { randomUUID } from "crypto";
import type { PromoCode, ApplyPromoResult } from "@/types/seller";
import { createAdminClient } from "@/lib/supabase/admin";

function rowToPromo(row: Record<string, unknown>): PromoCode {
  return {
    id: row.id as string,
    storeSlug: row.store_slug as string,
    code: row.code as string,
    description: (row.description as string) ?? undefined,
    type: row.type as "percent" | "fixed",
    value: row.value as number,
    minOrderAmount: (row.min_order_amount as number) ?? undefined,
    usageLimit: (row.usage_limit as number) ?? undefined,
    usageCount: row.usage_count as number,
    startsAt: (row.starts_at as string) ?? undefined,
    expiresAt: (row.expires_at as string) ?? undefined,
    status: row.status as "active" | "paused",
    createdAt: row.created_at as string,
  };
}

export async function listPromosForStore(slug: string): Promise<PromoCode[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("promos")
    .select("*")
    .eq("store_slug", slug);
  if (error || !data) return [];
  return data.map(rowToPromo);
}

export async function getPromoById(
  slug: string,
  id: string
): Promise<PromoCode | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("promos")
    .select("*")
    .eq("store_slug", slug)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToPromo(data);
}

export async function getPromoByCode(
  slug: string,
  code: string
): Promise<PromoCode | null> {
  const upper = code.trim().toUpperCase();
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("promos")
    .select("*")
    .eq("store_slug", slug)
    .ilike("code", upper)
    .single();
  if (error || !data) return null;
  return rowToPromo(data);
}

export async function addPromo(
  slug: string,
  input: Omit<PromoCode, "id" | "usageCount" | "createdAt" | "storeSlug">
): Promise<PromoCode> {
  const promo: PromoCode = {
    ...input,
    id: `promo_${randomUUID().slice(0, 8)}`,
    storeSlug: slug,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  };

  const sb = createAdminClient();
  const { error } = await sb.from("promos").insert({
    id: promo.id,
    store_slug: promo.storeSlug,
    code: promo.code,
    description: promo.description || null,
    type: promo.type,
    value: promo.value,
    min_order_amount: promo.minOrderAmount ?? null,
    usage_limit: promo.usageLimit ?? null,
    usage_count: 0,
    starts_at: promo.startsAt || null,
    expires_at: promo.expiresAt || null,
    status: promo.status,
    created_at: promo.createdAt,
  });
  if (error) throw error;

  return promo;
}

export async function updatePromo(
  slug: string,
  id: string,
  patch: Partial<Omit<PromoCode, "id" | "storeSlug" | "createdAt" | "usageCount">>
): Promise<PromoCode | null> {
  const sb = createAdminClient();
  const rowPatch: Record<string, unknown> = {};
  if (patch.code !== undefined) rowPatch.code = patch.code;
  if (patch.description !== undefined) rowPatch.description = patch.description || null;
  if (patch.type !== undefined) rowPatch.type = patch.type;
  if (patch.value !== undefined) rowPatch.value = patch.value;
  if (patch.minOrderAmount !== undefined) rowPatch.min_order_amount = patch.minOrderAmount ?? null;
  if (patch.usageLimit !== undefined) rowPatch.usage_limit = patch.usageLimit ?? null;
  if (patch.startsAt !== undefined) rowPatch.starts_at = patch.startsAt || null;
  if (patch.expiresAt !== undefined) rowPatch.expires_at = patch.expiresAt || null;
  if (patch.status !== undefined) rowPatch.status = patch.status;

  if (Object.keys(rowPatch).length === 0) return getPromoById(slug, id);

  const { error } = await sb
    .from("promos")
    .update(rowPatch)
    .eq("store_slug", slug)
    .eq("id", id);
  if (error) throw error;

  return getPromoById(slug, id);
}

export async function deletePromo(slug: string, id: string): Promise<boolean> {
  const sb = createAdminClient();
  const { error } = await sb
    .from("promos")
    .delete()
    .eq("store_slug", slug)
    .eq("id", id);
  if (error) throw error;
  return true;
}

export function computeDiscount(
  promo: PromoCode,
  subtotal: number
): number {
  if (promo.type === "percent") {
    return Math.max(0, Math.floor((subtotal * promo.value) / 100));
  }
  return Math.max(0, Math.min(promo.value, subtotal));
}

export function getPromoState(promo: PromoCode, now = new Date()): {
  state: "active" | "paused" | "scheduled" | "expired" | "exhausted";
} {
  if (promo.status === "paused") return { state: "paused" };
  if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) {
    return { state: "exhausted" };
  }
  if (promo.startsAt && new Date(promo.startsAt) > now) {
    return { state: "scheduled" };
  }
  if (promo.expiresAt && new Date(promo.expiresAt) < now) {
    return { state: "expired" };
  }
  return { state: "active" };
}

export async function validatePromo(
  slug: string,
  code: string,
  subtotal: number
): Promise<ApplyPromoResult> {
  const upper = code.trim().toUpperCase();
  if (!upper) return { ok: false, error: "Enter a code." };
  const promo = await getPromoByCode(slug, upper);
  if (!promo) return { ok: false, error: "Invalid or expired code." };

  const { state } = getPromoState(promo);
  if (state === "paused") return { ok: false, error: "This code is paused." };
  if (state === "scheduled")
    return { ok: false, error: "This code isn't active yet." };
  if (state === "expired")
    return { ok: false, error: "This code has expired." };
  if (state === "exhausted")
    return { ok: false, error: "This code has reached its limit." };

  if (promo.minOrderAmount != null && subtotal < promo.minOrderAmount) {
    return {
      ok: false,
      error: `Add ${`₹${promo.minOrderAmount - subtotal}`} more to use this code.`,
    };
  }

  const discountAmount = computeDiscount(promo, subtotal);
  if (discountAmount <= 0) {
    return { ok: false, error: "Code not applicable to this order." };
  }

  return { ok: true, discountAmount, promoCode: promo.code };
}

export async function applyPromo(
  slug: string,
  code: string,
  subtotal: number
): Promise<ApplyPromoResult> {
  const upper = code.trim().toUpperCase();
  if (!upper) return { ok: false, error: "Enter a code." };
  const promo = await getPromoByCode(slug, upper);
  if (!promo) return { ok: false, error: "Invalid or expired code." };

  const { state } = getPromoState(promo);
  if (state === "paused") return { ok: false, error: "This code is paused." };
  if (state === "scheduled")
    return { ok: false, error: "This code isn't active yet." };
  if (state === "expired")
    return { ok: false, error: "This code has expired." };
  if (state === "exhausted")
    return { ok: false, error: "This code has reached its limit." };

  if (promo.minOrderAmount != null && subtotal < promo.minOrderAmount) {
    return {
      ok: false,
      error: `Add ${`₹${promo.minOrderAmount - subtotal}`} more to use this code.`,
    };
  }

  const discountAmount = computeDiscount(promo, subtotal);
  if (discountAmount <= 0) {
    return { ok: false, error: "Code not applicable to this order." };
  }

  // Atomic increment via Supabase RPC-style update
  const sb = createAdminClient();
  const { data: fresh, error: fetchErr } = await sb
    .from("promos")
    .select("usage_count, usage_limit")
    .eq("id", promo.id)
    .single();
  if (fetchErr || !fresh) return { ok: false, error: "Code is no longer available." };
  if (fresh.usage_limit != null && fresh.usage_count >= fresh.usage_limit) {
    return { ok: false, error: "This code has reached its limit." };
  }
  const { error: updateErr } = await sb
    .from("promos")
    .update({ usage_count: fresh.usage_count + 1 })
    .eq("id", promo.id);
  if (updateErr) return { ok: false, error: "Failed to apply code." };

  return { ok: true, discountAmount, promoCode: promo.code };
}

export function generatePromoCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
