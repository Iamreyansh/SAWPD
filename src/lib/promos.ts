import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { PromoCode, ApplyPromoResult } from "@/types/seller";

const DATA_DIR = path.join(process.cwd(), "data");
const PROMOS_FILE = path.join(DATA_DIR, "promos.json");

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PROMOS_FILE);
  } catch {
    await fs.writeFile(PROMOS_FILE, JSON.stringify({}, null, 2), "utf-8");
  }
}

async function readAll(): Promise<Record<string, PromoCode[]>> {
  await ensureFile();
  const raw = await fs.readFile(PROMOS_FILE, "utf-8");
  try {
    return JSON.parse(raw) as Record<string, PromoCode[]>;
  } catch {
    return {};
  }
}

async function writeAll(map: Record<string, PromoCode[]>): Promise<void> {
  await fs.writeFile(PROMOS_FILE, JSON.stringify(map, null, 2), "utf-8");
}

export async function listPromosForStore(slug: string): Promise<PromoCode[]> {
  const map = await readAll();
  return map[slug] ?? [];
}

export async function getPromoById(
  slug: string,
  id: string
): Promise<PromoCode | null> {
  const all = await listPromosForStore(slug);
  return all.find((p) => p.id === id) ?? null;
}

export async function getPromoByCode(
  slug: string,
  code: string
): Promise<PromoCode | null> {
  const all = await listPromosForStore(slug);
  const upper = code.trim().toUpperCase();
  return all.find((p) => p.code.toUpperCase() === upper) ?? null;
}

export async function addPromo(
  slug: string,
  input: Omit<PromoCode, "id" | "usageCount" | "createdAt" | "storeSlug">
): Promise<PromoCode> {
  const map = await readAll();
  const list = map[slug] ?? [];
  const promo: PromoCode = {
    ...input,
    id: `promo_${randomUUID().slice(0, 8)}`,
    storeSlug: slug,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  };
  list.unshift(promo);
  map[slug] = list;
  await writeAll(map);
  return promo;
}

export async function updatePromo(
  slug: string,
  id: string,
  patch: Partial<Omit<PromoCode, "id" | "storeSlug" | "createdAt" | "usageCount">>
): Promise<PromoCode | null> {
  const map = await readAll();
  const list = map[slug] ?? [];
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated: PromoCode = { ...list[idx], ...patch };
  list[idx] = updated;
  map[slug] = list;
  await writeAll(map);
  return updated;
}

export async function deletePromo(slug: string, id: string): Promise<boolean> {
  const map = await readAll();
  const list = map[slug] ?? [];
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  map[slug] = next;
  await writeAll(map);
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

/**
 * Validate a code against a cart subtotal without mutating usage.
 * Use this in the checkout "Apply" button to show the discount preview.
 */
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

/**
 * Validate a code against a cart subtotal and atomically increment usage.
 * Returns the discount amount on success.
 */
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

  // Atomic-ish increment: read, check, write
  const map = await readAll();
  const list = map[slug] ?? [];
  const idx = list.findIndex((p) => p.id === promo.id);
  if (idx === -1) return { ok: false, error: "Code is no longer available." };
  const fresh = list[idx];
  if (
    fresh.usageLimit != null &&
    fresh.usageCount >= fresh.usageLimit
  ) {
    return { ok: false, error: "This code has reached its limit." };
  }
  list[idx] = { ...fresh, usageCount: fresh.usageCount + 1 };
  map[slug] = list;
  await writeAll(map);

  return { ok: true, discountAmount, promoCode: fresh.code };
}

export function generatePromoCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
