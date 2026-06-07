import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { findSellerById } from "@/lib/sellers";
import type { PublicSeller } from "@/types/seller";

const COOKIE_NAME = "sawpd_seller";
const ACTIVE_STORE_COOKIE = "sawpd_active_store";
const SESSION_VERSION = "v1";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const ACTIVE_STORE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 8) {
    throw new Error(
      "ADMIN_SECRET env var is required (min 8 chars). Reused as the seller cookie HMAC key for now — replace with a SELLER_SECRET in v1.1.",
    );
  }
  return secret;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function createSellerSession(sellerId: string): Promise<void> {
  const secret = getSecret();
  const value = `${SESSION_VERSION}.${sellerId}`;
  const sig = sign(value, secret);
  const store = await cookies();
  store.set(COOKIE_NAME, `${value}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSellerSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(ACTIVE_STORE_COOKIE);
}

export async function getCurrentSeller(): Promise<PublicSeller | null> {
  const store = await cookies();
  const c = store.get(COOKIE_NAME);
  if (!c) return null;
  const parts = c.value.split(".");
  if (parts.length !== 3) return null;
  const [version, sellerId, sig] = parts;
  if (version !== SESSION_VERSION || !sellerId || !sig) return null;
  const expected = sign(`${version}.${sellerId}`, getSecret());
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }
  const seller = await findSellerById(sellerId);
  if (!seller) return null;
  return { id: seller.id, email: seller.email, createdAt: seller.createdAt };
}

/**
 * Use in server components / server actions that require a signed-in seller.
 * Redirects to /seller/login if not signed in.
 */
export async function requireSeller(): Promise<PublicSeller> {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/seller/login");
  return seller;
}

/**
 * Active store: which of the seller's stores is currently being managed.
 * The slug is stored in a separate signed cookie. Server actions in
 * /dashboard/* read this to know which store to scope queries to.
 */
export async function setActiveStoreSlug(slug: string): Promise<void> {
  const secret = getSecret();
  const sig = sign(slug, secret);
  const store = await cookies();
  store.set(ACTIVE_STORE_COOKIE, `${slug}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_STORE_MAX_AGE,
  });
}

export async function clearActiveStoreSlug(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_STORE_COOKIE);
}

/**
 * Returns the active store slug from the cookie if present, else null.
 * Does NOT validate ownership — callers must use `getActiveStoreForSeller`
 * or `getStoreForSeller` to ensure the seller actually owns the store.
 */
export async function getActiveStoreSlugFromCookie(): Promise<string | null> {
  const store = await cookies();
  const c = store.get(ACTIVE_STORE_COOKIE);
  if (!c) return null;
  const dot = c.value.lastIndexOf(".");
  if (dot <= 0) return null;
  const slug = c.value.slice(0, dot);
  const sig = c.value.slice(dot + 1);
  if (!slug || !sig) return null;
  const expected = sign(slug, getSecret());
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }
  return slug;
}
