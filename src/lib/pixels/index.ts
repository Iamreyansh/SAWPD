/**
 * Barrel export for the pixel module.
 *
 * Client code: import from "@/lib/pixels" (auto-uses client-safe files).
 * Server code: import from "@/lib/pixels/server" (marked "server-only").
 *
 * Layout/page init: import metaBrowserInit from "@/lib/pixels/meta"
 * and googleBrowserInit from "@/lib/pixels/google".
 */

export type { PixelEvent, PixelEventData, PixelCurrency } from "./types";
export {
  getMetaPixelId,
  isMetaConfigured,
  trackMetaBrowser,
  newEventId,
} from "./meta";
export {
  getGa4MeasurementId,
  getGoogleAdsId,
  isGoogleConfigured,
  metaEventToGa4,
  trackGa4Browser,
  trackGoogleAdsConversion,
} from "./google";
export { makeEvent, fireClientEvent } from "./client";