/**
 * Meta (Facebook) Pixel helpers — both browser and server (CAPI).
 *
 * The browser pixel is initialised in src/app/layout.tsx via a
 * `<Script>` tag. This module exposes:
 *   - Browser-side: `trackMetaBrowser(event, data)`
 *   - Server-side: `sendMetaCapi(event, data, ctx)`
 *
 * In production, fire both client and server with the SAME `eventId`
 * so Meta deduplicates and credits the conversion once.
 */

import type { PixelEventData } from "./types";

const META_GRAPH_VERSION = "v21.0";

export function getMetaPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return id && id.trim() ? id.trim() : null;
}

export function getMetaCapiToken(): string | null {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  return token && token.trim() ? token.trim() : null;
}

export function isMetaConfigured(): boolean {
  return getMetaPixelId() !== null;
}

/**
 * Push an event to the in-page Meta pixel queue. Safe to call before
 * the pixel script has loaded — fbq installs a stub queue.
 */
export function trackMetaBrowser(data: PixelEventData): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    fbq?: (...args: unknown[]) => void;
  };
  if (typeof w.fbq !== "function") return;

  // Standard event names (lowercase keys for content) — see:
  // https://developers.facebook.com/docs/meta-pixel/reference#standard-events
  const params: Record<string, unknown> = {
    event_id: data.eventId,
  };
  if (data.value !== undefined) params.value = data.value;
  if (data.currency) params.currency = data.currency;
  if (data.contentIds) params.content_ids = data.contentIds;
  if (data.contentType) params.content_type = data.contentType;
  if (data.contentName) params.content_name = data.contentName;
  if (data.contentCategory) params.content_category = data.contentCategory;
  if (data.numItems !== undefined) params.num_items = data.numItems;
  if (data.orderId) params.order_id = data.orderId;

  w.fbq("track", data.event, params);
}

/**
 * SHA-256 hash a string (lowercased, trimmed) for Meta CAPI's
 * `email` / `phone` fields. Meta requires the value hashed.
 * Returns the hex digest (lowercase).
 */
async function sha256(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(normalized));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type MetaCapiContext = {
  /** Client IP, from x-forwarded-for / x-real-ip. */
  ip?: string;
  /** User-Agent of the browser. */
  userAgent?: string;
  /** fbp cookie value if present. */
  fbp?: string;
  /** fbc cookie value if present. */
  fbc?: string;
  /** Source URL of the event (page URL). */
  sourceUrl?: string;
};

/**
 * Send a single server-side event to Meta Conversions API.
 * Returns true if accepted, false if not configured / failed.
 * Never throws — tracking failures must not break the host flow.
 */
export async function sendMetaCapi(
  data: PixelEventData,
  ctx: MetaCapiContext = {},
): Promise<boolean> {
  const pixelId = getMetaPixelId();
  const token = getMetaCapiToken();
  if (!pixelId || !token) return false;

  try {
    const userData: Record<string, unknown> = {};
    if (data.email) userData.em = await sha256(data.email);
    if (data.phone) userData.ph = await sha256(data.phone);
    if (data.externalId) userData.external_id = await sha256(data.externalId);
    if (ctx.fbp) userData.fbp = ctx.fbp;
    if (ctx.fbc) userData.fbc = ctx.fbc;
    if (ctx.ip) userData.client_ip_address = ctx.ip;
    if (ctx.userAgent) userData.client_user_agent = ctx.userAgent;

    const customData: Record<string, unknown> = {
      event_id: data.eventId,
    };
    if (data.value !== undefined) customData.value = data.value;
    if (data.currency) customData.currency = data.currency;
    if (data.contentIds) customData.content_ids = data.contentIds;
    if (data.contentType) customData.content_type = data.contentType;
    if (data.contentName) customData.content_name = data.contentName;
    if (data.contentCategory) customData.content_category = data.contentCategory;
    if (data.numItems !== undefined) customData.num_items = data.numItems;
    if (data.orderId) customData.order_id = data.orderId;

    const payload = {
      data: [
        {
          event_name: data.event,
          event_time: data.eventTime ?? Math.floor(Date.now() / 1000),
          event_id: data.eventId,
          action_source: "website",
          event_source_url: ctx.sourceUrl,
          user_data: userData,
          custom_data: customData,
        },
      ],
    };

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // 3s timeout so a slow Meta doesn't stall checkout
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[meta-capi] ${res.status}: ${body.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[meta-capi] failed:", err);
    return false;
  }
}

/**
 * Helper: generate a short unique event ID. Used to dedupe browser +
 * server events for the same logical conversion.
 */
export function newEventId(prefix: PixelEventData["event"] = "Purchase"): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix.toLowerCase()}_${ts}_${rnd}`;
}