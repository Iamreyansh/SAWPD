/**
 * Shared types for analytics/tracking pixels.
 *
 * All pixels are no-ops unless the corresponding env vars are set, so
 * the app works in dev without any pixel IDs configured. Production
 * events dedupe client + server via a shared `event_id`.
 */

/**
 * Standard e-commerce events. Names are platform-agnostic — each
 * provider maps them to its own event taxonomy:
 *   - Meta:    PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, Lead
 *   - GA4:     page_view, view_item, add_to_cart, begin_checkout, purchase, generate_lead
 *   - Google Ads: same as GA4 + conversion label
 */
export type PixelEvent =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead";

/**
 * Common currency. We only sell in INR right now; expand later.
 */
export type PixelCurrency = "INR";

/**
 * Payload sent to every provider. Each provider picks the fields it
 * cares about and ignores the rest.
 */
export type PixelEventData = {
  /** Unique ID for this event — used for client/server deduplication. */
  eventId: string;

  /** Event name (Meta names). GA4 mapper translates these. */
  event: PixelEvent;

  /** ISO timestamp; defaults to "now" on the platform if omitted. */
  eventTime?: number;

  /** Monetary value. */
  value?: number;
  currency?: PixelCurrency;

  /** Order/cart identifiers. */
  orderId?: string;

  /** Items in the cart/order. content_ids can be a comma-joined string. */
  contentIds?: string[];
  contentType?: "product" | "product_group";
  contentName?: string;
  contentCategory?: string;

  /** Number of items in the event (e.g. checkout qty). */
  numItems?: number;

  /** Free-form UTM/source attribution. */
  source?: string;

  /** Customer identifiers (hashed on server before sending to Meta). */
  email?: string;
  phone?: string;
  externalId?: string;

  /** Anything else providers might want. */
  raw?: Record<string, unknown>;
};