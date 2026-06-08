import { headers } from "next/headers";

/**
 * Extract the client IP from request headers.
 * Falls back to "unknown" in dev or when headers are unavailable.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
