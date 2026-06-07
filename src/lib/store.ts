import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { SellerStore } from "@/types/seller";
import type { PlanId } from "@/lib/plans";
import { nextRenewalIso, newBillingId, PLAN_PRICING, planReference } from "@/lib/plans";
import { DEFAULT_RETURNS_POLICY } from "@/types/storefront";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const BILLING_FILE = path.join(DATA_DIR, "billing.json");

async function ensureFile<T>(file: string, fallback: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify(fallback, null, 2), "utf-8");
  }
}

export async function getStore(slug: string): Promise<SellerStore | null> {
  await ensureFile(STORE_FILE, {});
  const raw = await fs.readFile(STORE_FILE, "utf-8");
  try {
    const stores = JSON.parse(raw) as Record<string, SellerStore>;
    const s = stores[slug] ?? null;
    return s ? normalizeStore(s) : null;
  } catch {
    return null;
  }
}

export async function listStores(): Promise<SellerStore[]> {
  await ensureFile(STORE_FILE, {});
  const raw = await fs.readFile(STORE_FILE, "utf-8");
  try {
    const stores = JSON.parse(raw) as Record<string, SellerStore>;
    return Object.values(stores).map(normalizeStore);
  } catch {
    return [];
  }
}

export async function getFirstStore(): Promise<SellerStore | null> {
  const all = await listStores();
  return all[0] ?? null;
}

export async function updateStore(
  slug: string,
  patch: Partial<SellerStore>
): Promise<SellerStore | null> {
  await ensureFile(STORE_FILE, {});
  const raw = await fs.readFile(STORE_FILE, "utf-8");
  let stores: Record<string, SellerStore> = {};
  try {
    stores = JSON.parse(raw) as Record<string, SellerStore>;
  } catch {
    stores = {};
  }
  const current = stores[slug];
  if (!current) return null;
  const updated = normalizeStore({ ...current, ...patch });
  stores[slug] = updated;
  await fs.writeFile(STORE_FILE, JSON.stringify(stores, null, 2), "utf-8");
  return updated;
}

function normalizeStore(s: SellerStore): SellerStore {
  if (s.returnsPolicy) return s;
  return { ...s, returnsPolicy: { ...DEFAULT_RETURNS_POLICY } };
}

export type BillingRecord = {
  id: string;
  storeSlug: string;
  plan: PlanId;
  amountInr: number;
  createdAt: string;
  reference: string;
};

async function readBilling(): Promise<BillingRecord[]> {
  await ensureFile(BILLING_FILE, []);
  const raw = await fs.readFile(BILLING_FILE, "utf-8");
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as BillingRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeBilling(records: BillingRecord[]): Promise<void> {
  await fs.writeFile(BILLING_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export async function listBillingForStore(slug: string): Promise<BillingRecord[]> {
  const all = await readBilling();
  return all
    .filter((b) => b.storeSlug === slug)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Early-access activation. No payment is collected during this phase —
 * we just stamp the plan + a renewal date and write a no-charge billing
 * record. Swap for a real Razorpay checkout + webhook when billing goes live.
 *
 * Named `activatePlanMock` for historical reasons; effectively this is just
 * the "no payment taken yet" path. The legacy name is preserved to keep
 * the call sites in `dashboard/actions.ts` and `admin/actions.ts` stable.
 */
export async function activatePlanMock(
  slug: string,
  plan: PlanId
): Promise<{ store: SellerStore; billing: BillingRecord } | null> {
  const store = await getStore(slug);
  if (!store) return null;
  const now = new Date();
  const renewsAt = nextRenewalIso(plan, now);
  const updated = await updateStore(slug, {
    plan,
    trialEndsAt: renewsAt,
  });
  if (!updated) return null;
  const billing: BillingRecord = {
    id: newBillingId(),
    storeSlug: slug,
    plan,
    amountInr: PLAN_PRICING[plan].amountInr,
    createdAt: now.toISOString(),
    reference: planReference(),
  };
  const all = await readBilling();
  all.unshift(billing);
  await writeBilling(all);
  return { store: updated, billing };
}
