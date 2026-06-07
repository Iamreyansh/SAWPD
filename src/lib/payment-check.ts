/**
 * Lightweight heuristic to check a payment screenshot uploaded by a customer.
 * Real impl: OCR for amount + UPI ref, or a webhook from a payment gateway.
 */
const ACCEPTED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MIN_BYTES = 4 * 1024; // 4KB — too small means blank/corrupt
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export type ScreenshotCheck = {
  valid: boolean;
  mime: string | null;
  approxKb: number;
  reason?: string;
};

const DATA_URL_RE = /^data:([^;,]+);base64,(.+)$/;

export function checkPaymentScreenshot(
  dataUrl: string | undefined | null
): ScreenshotCheck {
  if (!dataUrl) {
    return { valid: false, mime: null, approxKb: 0, reason: "No screenshot uploaded." };
  }
  const m = dataUrl.match(DATA_URL_RE);
  if (!m) {
    // Remote URL (rare in this MVP) — assume valid but unverified.
    return {
      valid: true,
      mime: "remote",
      approxKb: 0,
      reason: "Remote URL — manual review recommended.",
    };
  }
  const mime = m[1];
  const b64 = m[2];
  if (!ACCEPTED_MIMES.has(mime)) {
    return {
      valid: false,
      mime,
      approxKb: 0,
      reason: `Unsupported format (${mime}). Use JPEG, PNG, WebP, or GIF.`,
    };
  }
  const bytes = Math.floor((b64.length * 3) / 4);
  const kb = Math.round(bytes / 1024);
  if (bytes < MIN_BYTES) {
    return {
      valid: false,
      mime,
      approxKb: kb,
      reason: "Image is too small — likely blank or corrupt.",
    };
  }
  if (bytes > MAX_BYTES) {
    return {
      valid: false,
      mime,
      approxKb: kb,
      reason: "Image is too large (max 8MB).",
    };
  }
  return { valid: true, mime, approxKb: kb };
}
