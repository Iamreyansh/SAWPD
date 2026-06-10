import "server-only";
import { listStores } from "@/lib/store";
import type { SellerStore } from "@/types/seller";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrialState } from "@/lib/trial";

export type StoreSummary = {
  store: SellerStore;
  orderCount: number;
  productCount: number;
  open: boolean;
  planLabel: string;
  daysLeft: number | null;
};

export async function listStoreSummaries(): Promise<StoreSummary[]> {
  const stores = await listStores();
  if (stores.length === 0) return [];

  const sb = createAdminClient();

  // Batch-fetch order and product counts in 2 queries instead of 2*N
  const [orderRows, productRows] = await Promise.all([
    sb.from("orders").select("store_slug").then(({ data }) => data ?? []),
    sb.from("products").select("store_slug").then(({ data }) => data ?? []),
  ]);

  const orderCounts = new Map<string, number>();
  for (const row of orderRows) {
    const slug = row.store_slug as string;
    orderCounts.set(slug, (orderCounts.get(slug) ?? 0) + 1);
  }

  const productCounts = new Map<string, number>();
  for (const row of productRows) {
    const slug = row.store_slug as string;
    productCounts.set(slug, (productCounts.get(slug) ?? 0) + 1);
  }

  const out: StoreSummary[] = stores.map((store) => {
    const trial = getTrialState(store);
    return {
      store,
      orderCount: orderCounts.get(store.slug) ?? 0,
      productCount: productCounts.get(store.slug) ?? 0,
      open: trial.active,
      planLabel: trial.planLabel,
      daysLeft: trial.daysLeft,
    };
  });
  return out.sort((a, b) => a.store.name.localeCompare(b.store.name));
}

export async function listStoreSlugs(): Promise<string[]> {
  const stores = await listStores();
  return stores.map((s) => s.slug);
}
