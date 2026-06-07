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

/**
 * Reads the raw store map. Use only internally — callers should go through
 * `getStore(slug)` or `listStores()` so normalization is applied.
 *
 * If the file is `[]` (left over from an earlier pre-Set 21 wipe), treat
 * it as an empty object. Otherwise `addStore`/`updateStore` would write
 * non-numeric keys onto an array and `JSON.stringify` would silently
 * drop them.
 */
async function readStoreMap(): Promise<Record<string, SellerStore>> {
  await ensureFile(STORE_FILE, {});
  const raw = await fs.readFile(STORE_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, SellerStore>;
    }
    return {};
  } catch {
    return {};
  }
}

export async function getStore(slug: string): Promise<SellerStore | null> {
  const stores = await readStoreMap();
  const s = stores[slug] ?? null;
  return s ? normalizeStore(s) : null;
}

export async function listStores(): Promise<SellerStore[]> {
  const stores = await readStoreMap();
  return Object.values(stores).map(normalizeStore);
}

/**
 * Lists stores owned by a specific seller. Returns an empty array if
 * the seller has no stores. Used by the seller dashboard to scope
 * visibility to the signed-in user.
 */
export async function getStoresForSeller(
  sellerId: string,
): Promise<SellerStore[]> {
  const all = await listStores();
  return all.filter((s) => s.sellerId === sellerId);
}

/**
 * Returns the first store owned by a given seller. If `sellerId` is
 * omitted, returns the first store globally (legacy behaviour, used by
 * the admin overview and the public landing pages). Callers that need
 * per-seller scoping must pass `sellerId` explicitly.
 */
export async function getFirstStore(
  sellerId?: string,
): Promise<SellerStore | null> {
  if (sellerId) {
    const mine = await getStoresForSeller(sellerId);
    return mine[0] ?? null;
  }
  const all = await listStores();
  return all[0] ?? null;
}

/**
 * Returns a store and asserts it is owned by `sellerId`. Use this from
 * the seller dashboard so a seller can never read or mutate a store
 * they don't own — even if they pass the slug from the URL.
 */
export async function getStoreForSeller(
  slug: string,
  sellerId: string,
): Promise<SellerStore | null> {
  const s = await getStore(slug);
  if (!s) return null;
  if (s.sellerId !== sellerId) return null;
  return s;
}

/**
 * Returns the store the seller is currently working on inside /dashboard.
 *
 * - If `preferredSlug` is passed and the seller owns it, use that store.
 * - Otherwise, return the first store owned by the seller.
 * - Returns `null` if the seller has no stores yet.
 *
 * Cookie validation happens in `seller-auth#getActiveStoreSlugFromCookie`;
 * the dashboard layout calls this to translate a verified slug into a
 * `SellerStore` (or fall back).
 */
export async function getActiveStoreForSeller(
  sellerId: string,
  preferredSlug?: string | null,
): Promise<SellerStore | null> {
  if (preferredSlug) {
    const s = await getStoreForSeller(preferredSlug, sellerId);
    if (s) return s;
  }
  return getFirstStore(sellerId);
}

export async function updateStore(
  slug: string,
  patch: Partial<SellerStore>,
  options?: { asSellerId?: string },
): Promise<SellerStore | null> {
  const stores = await readStoreMap();
  const current = stores[slug];
  if (!current) return null;
  if (options?.asSellerId && current.sellerId !== options.asSellerId) {
    return null;
  }
  const updated = normalizeStore({ ...current, ...patch });
  stores[slug] = updated;
  await fs.writeFile(STORE_FILE, JSON.stringify(stores, null, 2), "utf-8");
  return updated;
}

/**
 * Creates a new store owned by `sellerId`. The slug is generated from
 * `name` (and uniquified if it collides). Used by the admin application
 * approval flow: when an admin approves an application, this provisions
 * the seller's new shop and links it to the seller's account.
 */
export async function addStore(
  input: Omit<SellerStore, "slug" | "sellerId"> & { slug?: string },
  sellerId: string,
): Promise<SellerStore> {
  const stores = await readStoreMap();
  const base = (input.slug ?? slugify(input.name)).slice(0, 60);
  let candidate = base;
  let suffix = 1;
  while (stores[candidate]) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  const store: SellerStore = normalizeStore({
    ...input,
    slug: candidate,
    sellerId,
  });
  stores[candidate] = store;
  await fs.writeFile(STORE_FILE, JSON.stringify(stores, null, 2), "utf-8");
  return store;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "shop"
  );
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
  plan: PlanId,
  options?: { asSellerId?: string }
): Promise<{ store: SellerStore; billing: BillingRecord } | null> {
  const store = await getStore(slug);
  if (!store) return null;
  if (options?.asSellerId && store.sellerId !== options.asSellerId) {
    return null;
  }
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
