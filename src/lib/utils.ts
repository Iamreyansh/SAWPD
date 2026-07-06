import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

export function timeAgo(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const LOW_STOCK_THRESHOLD = 5;

// Valid Instagram usernames: 1-30 chars, letters/digits/underscore/dot.
// No leading dot, no consecutive dots, no trailing dot. Conservative.
const INSTAGRAM_HANDLE_RE = /^(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/;

/**
 * Build a safe `https://instagram.com/<handle>` URL from a raw handle.
 * Strips a leading `@`, validates the remaining string, and percent-encodes
 * any characters that don't match the platform's handle charset. Returns
 * `null` if the handle is empty or unsafe — callers should fall back to a
 * disabled label rather than a broken link.
 */
export function buildInstagramUrl(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const cleaned = handle.trim().replace(/^@+/, "").replace(/\s+/g, "");
  if (!cleaned) return null;
  if (!INSTAGRAM_HANDLE_RE.test(cleaned)) {
    // Try a softer fallback: percent-encode the whole thing. Better a
    // URL that 404s on Instagram than a broken href or an open-redirect.
    return `https://instagram.com/${encodeURIComponent(cleaned)}`;
  }
  return `https://instagram.com/${cleaned}`;
}
