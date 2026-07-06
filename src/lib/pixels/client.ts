/**
 * Client-side event dispatcher. Reads pixel config from env vars and
 * fans an event out to every configured provider.
 *
 * Called from React event handlers (add-to-cart, open product sheet,
 * checkout page mount, etc.). Use `fireServerEvent` from server
 * actions for purchases and leads so they hit CAPI.
 */

import type { PixelEventData } from "./types";
import { trackMetaBrowser, newEventId } from "./meta";
import { trackGa4Browser } from "./google";

/**
 * Build an event payload with sensible defaults.
 * Use this from client code to ensure every event has a unique ID
 * (for browser+server dedup) and a consistent shape.
 */
export function makeEvent(
  event: PixelEventData["event"],
  data: Omit<PixelEventData, "event" | "eventId"> & { eventId?: string } = {} as never,
): PixelEventData {
  return {
    eventId: data.eventId ?? newEventId(event),
    currency: "INR",
    ...data,
    event,
  };
}

/**
 * Fan an event out to every configured pixel.
 * Silently no-ops if no pixels are configured.
 */
export function fireClientEvent(data: PixelEventData): void {
  try {
    trackMetaBrowser(data);
    trackGa4Browser(data);
  } catch (err) {
    console.error("[pixel] client event failed:", err);
  }
}