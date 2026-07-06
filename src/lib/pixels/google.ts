/**
 * Google Ads + GA4 helpers.
 *
 * - `gtag.js` is loaded once in the root layout with both the
 *   `AW-XXXXXXXX` (Google Ads) and `G-XXXXXXXX` (GA4) IDs.
 * - Browser events use `gtag('event', name, params)`.
 * - Server-side Enhanced Conversions hit the Measurement Protocol
 *   API (GA4) — for the MVP we only do client-side. Add the GA4
 *   MP secret later if you need server-only attribution.
 *
 * Event-name mapping (we send the standard Meta-style names; this
 * module translates them to GA4's snake_case taxonomy):
 *
 *   PageView          -> page_view
 *   ViewContent       -> view_item
 *   AddToCart         -> add_to_cart
 *   InitiateCheckout  -> begin_checkout
 *   Purchase          -> purchase
 *   Lead              -> generate_lead
 */

import type { PixelEvent, PixelEventData } from "./types";

export function getGa4MeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  return id && id.trim() ? id.trim() : null;
}

export function getGoogleAdsId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  return id && id.trim() ? id.trim() : null;
}

export function isGoogleConfigured(): boolean {
  return getGa4MeasurementId() !== null || getGoogleAdsId() !== null;
}

const META_TO_GA4: Record<PixelEvent, string> = {
  PageView: "page_view",
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  Lead: "generate_lead",
};

export function metaEventToGa4(event: PixelEvent): string {
  return META_TO_GA4[event] ?? event.toLowerCase();
}

/**
 * Push an event to gtag. Safe to call before the script has loaded —
 * gtag installs a queue under `window.dataLayer`.
 */
export function trackGa4Browser(data: PixelEventData): void {
  if (typeof window === "undefined") return;
  const w = window as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;

  const ga4Event = metaEventToGa4(data.event);
  const params: Record<string, unknown> = {
    // transaction_id is what GA4 uses to dedupe
    transaction_id: data.eventId,
    send_page_view: false,
  };
  if (data.value !== undefined) params.value = data.value;
  if (data.currency) params.currency = data.currency;
  if (data.contentIds) params.items = data.contentIds.map((id, i) => ({
    item_id: id,
    item_name: data.contentName,
    item_category: data.contentCategory,
    price: data.value !== undefined && data.numItems
      ? data.value / data.numItems
      : undefined,
    index: i,
  }));
  if (data.numItems !== undefined) {
    // GA4 expects `items` array; if we don't have it, set quantity on event.
    if (!params.items) params.quantity = data.numItems;
  }
  if (data.orderId) params.transaction_id = data.orderId || data.eventId;

  w.gtag("event", ga4Event, params);
}

/**
 * Fire a Google Ads conversion for the same logical event.
 * No-op if the conversion label env var is missing.
 *
 * `eventId` should match the GA4 transaction_id so GA4 can dedupe
 * against the Google Ads conversion import.
 */
export function trackGoogleAdsConversion(
  data: PixelEventData,
  conversionLabel: string,
): void {
  if (typeof window === "undefined") return;
  const adsId = getGoogleAdsId();
  if (!adsId) return;
  const w = window as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;

  w.gtag("event", "conversion", {
    send_to: `${adsId}/${conversionLabel}`,
    value: data.value,
    currency: data.currency,
    transaction_id: data.orderId ?? data.eventId,
  });
}