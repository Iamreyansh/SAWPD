import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Product, ProductImage } from "@/types/storefront";
import { MAX_PRODUCT_IMAGES } from "@/types/storefront";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

async function ensureFile<T>(file: string, fallback: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify(fallback, null, 2), "utf-8");
  }
}

type LegacyProduct = Partial<Product> & {
  imageUrl?: string;
  imageAlt?: string;
  images?: ProductImage[];
};

function normalize(p: LegacyProduct): Product | null {
  if (!p.id || !p.title) return null;
  let images: ProductImage[] = Array.isArray(p.images) ? p.images : [];
  if (images.length === 0 && p.imageUrl) {
    images = [{ id: `img-${randomUUID().slice(0, 8)}`, url: p.imageUrl }];
  }
  if (images.length === 0) return null;
  return {
    id: p.id,
    slug: p.slug ?? p.id,
    title: p.title,
    tagline: p.tagline ?? "",
    price: p.price ?? 0,
    altText: p.altText ?? p.imageAlt ?? p.title,
    images: images.slice(0, MAX_PRODUCT_IMAGES),
    stockCount: p.stockCount ?? 0,
    isAvailable: p.isAvailable ?? true,
    tags: p.tags ?? [],
    status: p.status ?? "live",
    scheduledFor: p.scheduledFor,
  };
}

/**
 * Public-facing storefront selector: only live products (and scheduled
 * products whose `scheduledFor` has passed). Drafts and archives are hidden.
 */
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
  await ensureFile(PRODUCTS_FILE, {});
  const raw = await fs.readFile(PRODUCTS_FILE, "utf-8");
  try {
    const map = JSON.parse(raw) as Record<string, LegacyProduct[]>;
    const list = map[slug] ?? [];
    return list.map(normalize).filter((p): p is Product => p !== null);
  } catch {
    return [];
  }
}

export async function listLiveProductsForStore(slug: string): Promise<Product[]> {
  const all = await listProductsForStore(slug);
  return all.filter((p) => isPubliclyVisible(p));
}

export async function countProductsByStatus(
  slug: string
): Promise<{ live: number; draft: number; scheduled: number; archived: number }> {
  const all = await listProductsForStore(slug);
  const counts = { live: 0, draft: 0, scheduled: 0, archived: 0 };
  for (const p of all) {
    const s = p.status ?? "live";
    counts[s] += 1;
  }
  return counts;
}

export async function getProduct(
  slug: string,
  id: string
): Promise<Product | null> {
  const all = await listProductsForStore(slug);
  return all.find((p) => p.id === id) ?? null;
}

export async function addProduct(
  slug: string,
  input: Omit<Product, "id">
): Promise<Product> {
  await ensureFile(PRODUCTS_FILE, {});
  const raw = await fs.readFile(PRODUCTS_FILE, "utf-8");
  let map: Record<string, Product[]> = {};
  try {
    map = JSON.parse(raw) as Record<string, Product[]>;
  } catch {
    map = {};
  }
  const product: Product = { ...input, id: `p_${randomUUID().slice(0, 8)}` };
  const list = map[slug] ?? [];
  list.unshift(product);
  map[slug] = list;
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(map, null, 2), "utf-8");
  return product;
}

export async function updateProduct(
  slug: string,
  id: string,
  patch: Partial<Product>
): Promise<Product | null> {
  await ensureFile(PRODUCTS_FILE, {});
  const raw = await fs.readFile(PRODUCTS_FILE, "utf-8");
  let map: Record<string, Product[]> = {};
  try {
    map = JSON.parse(raw) as Record<string, Product[]>;
  } catch {
    map = {};
  }
  const list = map[slug] ?? [];
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated: Product = { ...list[idx], ...patch };
  list[idx] = updated;
  map[slug] = list;
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(map, null, 2), "utf-8");
  return updated;
}

export async function deleteProduct(
  slug: string,
  id: string
): Promise<boolean> {
  await ensureFile(PRODUCTS_FILE, {});
  const raw = await fs.readFile(PRODUCTS_FILE, "utf-8");
  let map: Record<string, Product[]> = {};
  try {
    map = JSON.parse(raw) as Record<string, Product[]>;
  } catch {
    map = {};
  }
  const list = map[slug] ?? [];
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  map[slug] = next;
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(map, null, 2), "utf-8");
  return true;
}
