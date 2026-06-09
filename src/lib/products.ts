import "server-only";
import { randomUUID } from "crypto";
import type { Product, ProductImage } from "@/types/storefront";
import { MAX_PRODUCT_IMAGES } from "@/types/storefront";
import { createAdminClient } from "@/lib/supabase/admin";

function rowToProduct(row: Record<string, unknown>): Product | null {
  if (!row.id || !row.title) return null;

  let images: ProductImage[] = [];
  if (Array.isArray(row.images)) {
    images = row.images as ProductImage[];
  } else if (typeof row.images === "string") {
    try { images = JSON.parse(row.images); } catch { images = []; }
  }

  let tags: string[] = [];
  if (Array.isArray(row.tags)) {
    tags = row.tags as string[];
  } else if (typeof row.tags === "string") {
    try { tags = JSON.parse(row.tags); } catch { tags = []; }
  }

  return {
    id: row.id as string,
    slug: (row.slug as string) || row.id as string,
    title: row.title as string,
    tagline: (row.tagline as string) || "",
    price: (row.price as number) ?? 0,
    altText: (row.alt_text as string) || (row.title as string),
    images: images.slice(0, MAX_PRODUCT_IMAGES),
    stockCount: (row.stock_count as number) ?? 0,
    isAvailable: (row.is_available as boolean) ?? true,
    tags,
    status: (row.status as Product["status"]) ?? "live",
    scheduledFor: (row.scheduled_for as string) || undefined,
  };
}

function productToRow(product: Product, storeSlug: string): Record<string, unknown> {
  return {
    id: product.id,
    store_slug: storeSlug,
    slug: product.slug,
    title: product.title,
    tagline: product.tagline,
    price: product.price,
    alt_text: product.altText,
    images: product.images,
    stock_count: product.stockCount,
    is_available: product.isAvailable,
    tags: product.tags ?? [],
    status: product.status ?? "live",
    scheduled_for: product.scheduledFor || null,
  };
}

export function isPubliclyVisible(p: Product, now = new Date()): boolean {
  const status = p.status ?? "live";
  if (status === "draft" || status === "archived") return false;
  if (status === "scheduled") {
    if (!p.scheduledFor) return false;
    return new Date(p.scheduledFor).getTime() <= now.getTime();
  }
  return true;
}

export async function listProductsForStore(slug: string): Promise<Product[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("store_slug", slug);
  if (error || !data) return [];
  return data.map(rowToProduct).filter((p): p is Product => p !== null);
}

/**
 * List only publicly visible products — filters at DB level.
 * Excludes drafts, archived, and future-scheduled products.
 */
export async function listLiveProductsForStore(slug: string): Promise<Product[]> {
  const sb = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("store_slug", slug)
    .or(`status.eq.live,and(status.eq.scheduled,scheduled_for.lte.${now}),and(status.is.null)`);
  if (error || !data) return [];
  return data.map(rowToProduct).filter((p): p is Product => p !== null);
}

/**
 * Count products for a store — single aggregate query, no data transfer.
 */
export async function countProducts(slug: string): Promise<number> {
  const sb = createAdminClient();
  const { count } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_slug", slug);
  return count ?? 0;
}

/**
 * Get specific products by IDs — for checkout price validation.
 * Avoids loading ALL products just to validate a few cart items.
 */
export async function getProductsByIds(
  slug: string,
  ids: string[]
): Promise<Product[]> {
  if (ids.length === 0) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("store_slug", slug)
    .in("id", ids);
  if (error || !data) return [];
  return data.map(rowToProduct).filter((p): p is Product => p !== null);
}

export async function countProductsByStatus(
  slug: string
): Promise<{ live: number; draft: number; scheduled: number; archived: number }> {
  const sb = createAdminClient();
  const counts = { live: 0, draft: 0, scheduled: 0, archived: 0 };
  const statuses = ["live", "draft", "scheduled", "archived"] as const;
  await Promise.all(
    statuses.map(async (status) => {
      const { count } = await sb
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_slug", slug)
        .eq("status", status);
      counts[status] = count ?? 0;
    })
  );
  return counts;
}

export async function getProduct(
  slug: string,
  id: string
): Promise<Product | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("store_slug", slug)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToProduct(data);
}

export async function addProduct(
  slug: string,
  input: Omit<Product, "id">
): Promise<Product> {
  const product: Product = { ...input, id: `p_${randomUUID().slice(0, 8)}` };
  const sb = createAdminClient();
  const { error } = await sb.from("products").insert(productToRow(product, slug));
  if (error) throw error;
  return product;
}

export async function updateProduct(
  slug: string,
  id: string,
  patch: Partial<Product>
): Promise<Product | null> {
  const sb = createAdminClient();
  const rowPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) rowPatch.title = patch.title;
  if (patch.slug !== undefined) rowPatch.slug = patch.slug;
  if (patch.tagline !== undefined) rowPatch.tagline = patch.tagline;
  if (patch.price !== undefined) rowPatch.price = patch.price;
  if (patch.altText !== undefined) rowPatch.alt_text = patch.altText;
  if (patch.images !== undefined) rowPatch.images = patch.images;
  if (patch.stockCount !== undefined) rowPatch.stock_count = patch.stockCount;
  if (patch.isAvailable !== undefined) rowPatch.is_available = patch.isAvailable;
  if (patch.tags !== undefined) rowPatch.tags = patch.tags ?? [];
  if (patch.status !== undefined) rowPatch.status = patch.status;
  if (patch.scheduledFor !== undefined) rowPatch.scheduled_for = patch.scheduledFor || null;

  if (Object.keys(rowPatch).length === 0) return getProduct(slug, id);

  const { error } = await sb
    .from("products")
    .update(rowPatch)
    .eq("store_slug", slug)
    .eq("id", id);
  if (error) throw error;

  return getProduct(slug, id);
}

export async function deleteProduct(
  slug: string,
  id: string
): Promise<boolean> {
  const sb = createAdminClient();
  const { error } = await sb
    .from("products")
    .delete()
    .eq("store_slug", slug)
    .eq("id", id);
  if (error) throw error;
  return true;
}
