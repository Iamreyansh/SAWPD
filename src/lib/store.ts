import "server-only";
import type { SellerStore } from "@/types/seller";
import type { PlanId } from "@/lib/plans";
import { nextRenewalIso, newBillingId, PLAN_PRICING, planReference } from "@/lib/plans";
import { DEFAULT_RETURNS_POLICY } from "@/types/storefront";
import { createAdminClient } from "@/lib/supabase/admin";

function rowToStore(row: Record<string, unknown>): SellerStore {
  const heroHeadline = Array.isArray(row.hero_headline)
    ? row.hero_headline
    : typeof row.hero_headline === "string"
      ? (() => { try { return JSON.parse(row.hero_headline); } catch { return []; } })()
      : [];

  return {
    slug: row.slug as string,
    sellerId: row.seller_id as string,
    name: row.name as string,
    ownerHandle: row.owner_handle as string,
    whatsapp: (row.whatsapp as string) || undefined,
    heroImage: row.hero_image as string,
    heroKicker: row.hero_kicker as string,
    heroHeadline,
    heroSub: row.hero_sub as string,
    upiId: row.upi_id as string,
    notifyEmail: row.notify_email as string,
    paused: row.paused as boolean,
    pausedReason: (row.paused_reason as string) || undefined,
    onboardingDismissed: row.onboarding_dismissed as boolean,
    returnsPolicy: {
      enabled: row.returns_enabled as boolean,
      windowDays: row.returns_window_days as number,
      mode: (row.returns_mode as "any" | "defective_only") || "any",
      policyText: (row.returns_policy_text as string) || undefined,
    },
    plan: (row.plan as PlanId) || undefined,
    trialEndsAt: (row.trial_ends_at as string) || undefined,
  };
}

function storeToRow(store: SellerStore): Record<string, unknown> {
  return {
    slug: store.slug,
    seller_id: store.sellerId,
    name: store.name,
    owner_handle: store.ownerHandle,
    whatsapp: store.whatsapp || null,
    hero_image: store.heroImage,
    hero_kicker: store.heroKicker,
    hero_headline: store.heroHeadline,
    hero_sub: store.heroSub,
    upi_id: store.upiId,
    notify_email: store.notifyEmail,
    paused: store.paused ?? false,
    paused_reason: store.pausedReason || null,
    onboarding_dismissed: store.onboardingDismissed ?? false,
    returns_enabled: store.returnsPolicy?.enabled ?? DEFAULT_RETURNS_POLICY.enabled,
    returns_window_days: store.returnsPolicy?.windowDays ?? DEFAULT_RETURNS_POLICY.windowDays,
    returns_mode: store.returnsPolicy?.mode ?? DEFAULT_RETURNS_POLICY.mode,
    returns_policy_text: store.returnsPolicy?.policyText || null,
    plan: store.plan || null,
    trial_ends_at: store.trialEndsAt || null,
  };
}

function normalizeStore(s: SellerStore): SellerStore {
  if (s.returnsPolicy) return s;
  return { ...s, returnsPolicy: { ...DEFAULT_RETURNS_POLICY } };
}

export async function getStore(slug: string): Promise<SellerStore | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  return normalizeStore(rowToStore(data));
}

export async function listStores(): Promise<SellerStore[]> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("stores").select("*");
  if (error || !data) return [];
  return data.map((row) => normalizeStore(rowToStore(row)));
}

export async function getStoresForSeller(
  sellerId: string,
): Promise<SellerStore[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("stores")
    .select("*")
    .eq("seller_id", sellerId);
  if (error || !data) return [];
  return data.map((row) => normalizeStore(rowToStore(row)));
}

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

export async function getStoreForSeller(
  slug: string,
  sellerId: string,
): Promise<SellerStore | null> {
  const s = await getStore(slug);
  if (!s) return null;
  if (s.sellerId !== sellerId) return null;
  return s;
}

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
  const sb = createAdminClient();

  if (options?.asSellerId) {
    const current = await getStore(slug);
    if (!current || current.sellerId !== options.asSellerId) return null;
  }

  const rowPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) rowPatch.name = patch.name;
  if (patch.ownerHandle !== undefined) rowPatch.owner_handle = patch.ownerHandle;
  if (patch.whatsapp !== undefined) rowPatch.whatsapp = patch.whatsapp || null;
  if (patch.heroImage !== undefined) rowPatch.hero_image = patch.heroImage;
  if (patch.heroKicker !== undefined) rowPatch.hero_kicker = patch.heroKicker;
  if (patch.heroHeadline !== undefined) rowPatch.hero_headline = patch.heroHeadline;
  if (patch.heroSub !== undefined) rowPatch.hero_sub = patch.heroSub;
  if (patch.upiId !== undefined) rowPatch.upi_id = patch.upiId;
  if (patch.notifyEmail !== undefined) rowPatch.notify_email = patch.notifyEmail;
  if (patch.paused !== undefined) rowPatch.paused = patch.paused;
  if (patch.pausedReason !== undefined) rowPatch.paused_reason = patch.pausedReason || null;
  if (patch.onboardingDismissed !== undefined) rowPatch.onboarding_dismissed = patch.onboardingDismissed;
  if (patch.plan !== undefined) rowPatch.plan = patch.plan || null;
  if (patch.trialEndsAt !== undefined) rowPatch.trial_ends_at = patch.trialEndsAt || null;
  if (patch.returnsPolicy !== undefined) {
    rowPatch.returns_enabled = patch.returnsPolicy?.enabled ?? false;
    rowPatch.returns_window_days = patch.returnsPolicy?.windowDays ?? 7;
    rowPatch.returns_mode = patch.returnsPolicy?.mode ?? "any";
    rowPatch.returns_policy_text = patch.returnsPolicy?.policyText || null;
  }

  if (Object.keys(rowPatch).length === 0) return getStore(slug);

  const { error } = await sb.from("stores").update(rowPatch).eq("slug", slug);
  if (error) throw error;

  return getStore(slug);
}

export async function addStore(
  input: Omit<SellerStore, "slug" | "sellerId"> & { slug?: string },
  sellerId: string,
): Promise<SellerStore> {
  const sb = createAdminClient();
  const base = (input.slug ?? slugify(input.name)).slice(0, 60);

  // Find unique slug
  let candidate = base;
  let suffix = 1;
  while (true) {
    const { data } = await sb
      .from("stores")
      .select("slug")
      .eq("slug", candidate)
      .single();
    if (!data) break;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  const store: SellerStore = normalizeStore({
    ...input,
    slug: candidate,
    sellerId,
  });

  const { error } = await sb.from("stores").insert(storeToRow(store));
  if (error) throw error;

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

export type BillingRecord = {
  id: string;
  storeSlug: string;
  plan: PlanId;
  amountInr: number;
  createdAt: string;
  reference: string;
};

function rowToBilling(row: Record<string, unknown>): BillingRecord {
  return {
    id: row.id as string,
    storeSlug: row.store_slug as string,
    plan: row.plan as PlanId,
    amountInr: row.amount_inr as number,
    createdAt: row.created_at as string,
    reference: row.reference as string,
  };
}

export async function listBillingForStore(slug: string): Promise<BillingRecord[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("billing")
    .select("*")
    .eq("store_slug", slug)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToBilling);
}

export async function activatePlanMock(
  slug: string,
  plan: PlanId,
  options?: { asSellerId?: string }
): Promise<{ store: SellerStore; billing: BillingRecord } | null> {
  const store = await getStore(slug);
  if (!store) return null;
  if (options?.asSellerId && store.sellerId !== options.asSellerId) return null;

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

  const sb = createAdminClient();
  const { error } = await sb.from("billing").insert({
    id: billing.id,
    store_slug: billing.storeSlug,
    plan: billing.plan,
    amount_inr: billing.amountInr,
    created_at: billing.createdAt,
    reference: billing.reference,
  });
  if (error) throw error;

  return { store: updated, billing };
}
