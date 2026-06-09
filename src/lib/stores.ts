import "server-only";
import { listStores } from "@/lib/store";
import type { SellerStore } from "@/types/seller";
import { countOrders } from "@/lib/orders";
import { countProducts } from "@/lib/products";
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
  const out: StoreSummary[] = [];
  for (const store of stores) {
    const [orderCount, productCount] = await Promise.all([
      countOrders(store.slug),
      countProducts(store.slug),
    ]);
    const trial = getTrialState(store);
    out.push({
      store,
      orderCount,
      productCount,
      open: trial.active,
      planLabel: trial.planLabel,
      daysLeft: trial.daysLeft,
    });
  }
  return out.sort((a, b) => a.store.name.localeCompare(b.store.name));
}

export async function listStoreSlugs(): Promise<string[]> {
  const stores = await listStores();
  return stores.map((s) => s.slug);
}
