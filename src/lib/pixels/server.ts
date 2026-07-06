/**
 * Server-side event dispatcher. Used from server actions for events
 * that matter most for ad attribution: Purchase, Lead.
 *
 * Hits Meta CAPI directly (no internal HTTP hop). GA4 server-side
 * via Measurement Protocol is intentionally omitted from the MVP —
 * add `lib/pixels/ga4-server.ts` later if you need it.
 */

import "server-only";
import { headers } from "next/headers";
import { sendMetaCapi, type MetaCapiContext, newEventId } from "./meta";
import type { PixelEventData } from "./types";

/**
 * Read IP + UA + fbp/fbc cookies from the request headers.
 * Used for Meta CAPI user_data — required for attribution.
 */
async function getRequestContext(): Promise<MetaCapiContext> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : undefined;
  const userAgent = h.get("user-agent") ?? undefined;
  const referer = h.get("referer") ?? undefined;
  const cookieHeader = h.get("cookie") ?? "";
  const fbp = parseCookie(cookieHeader, "_fbp");
  const fbc = parseCookie(cookieHeader, "_fbc");
  return {
    ip: ip && !isPrivateIp(ip) ? ip : undefined,
    userAgent,
    fbp,
    fbc,
    sourceUrl: referer,
  };
}

function parseCookie(header: string, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") ||
    ip === "0.0.0.0"
  );
}

/**
 * Fire a server-side event. Use from server actions for high-value
 * conversions (Purchase, Lead). Best-effort — never throws.
 */
export async function fireServerEvent(
  data: PixelEventData,
): Promise<boolean> {
  const enriched: PixelEventData = {
    ...data,
    eventId: data.eventId || newEventId(data.event),
  };
  const ctx = await getRequestContext();
  return sendMetaCapi(enriched, ctx);
}

/**
 * Helper for Purchase events from checkout actions.
 */
export function buildPurchaseEvent(input: {
  eventId?: string;
  orderId: string;
  value: number;
  numItems: number;
  contentIds: string[];
  email?: string;
  phone?: string;
}): PixelEventData {
  return {
    eventId: input.eventId ?? newEventId("Purchase"),
    event: "Purchase",
    value: input.value,
    currency: "INR",
    orderId: input.orderId,
    numItems: input.numItems,
    contentIds: input.contentIds,
    contentType: "product",
    email: input.email,
    phone: input.phone,
  };
}

/**
 * Helper for Lead events from the apply form.
 */
export function buildLeadEvent(input: {
  eventId?: string;
  email?: string;
  phone?: string;
  source?: string;
}): PixelEventData {
  return {
    eventId: input.eventId ?? newEventId("Lead"),
    event: "Lead",
    email: input.email,
    phone: input.phone,
    source: input.source,
  };
}