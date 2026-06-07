"use client";

/**
 * Cookie-based "remember me" for the last order's shipping address.
 * No account needed — stored in a long-lived cookie scoped to the path.
 * The customer can clear their browser data to remove it.
 */

export type SavedAddress = {
  name: string;
  phone: string;
  email?: string;
  address: string;
};

const COOKIE_NAME = "is_addr_v1";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function writeCookie(value: string) {
  if (typeof document === "undefined") return;
  const maxAge = `Max-Age=${ONE_YEAR_SECONDS}`;
  const sameSite = "SameSite=Lax";
  const path = "Path=/";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; ${maxAge}; ${path}; ${sameSite}`;
}

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const target = `${COOKIE_NAME}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return null;
}

export function saveLastOrderAddress(addr: SavedAddress): void {
  try {
    writeCookie(JSON.stringify(addr));
  } catch {
    // ignore — quota, etc.
  }
}

export function loadLastOrderAddress(): SavedAddress | null {
  try {
    const raw = readCookie();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedAddress>;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.phone === "string" &&
      typeof parsed.address === "string"
    ) {
      return {
        name: parsed.name,
        phone: parsed.phone,
        email: typeof parsed.email === "string" ? parsed.email : undefined,
        address: parsed.address,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearLastOrderAddress(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
}
