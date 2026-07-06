/**
 * Build UPI deep links for common Indian payment apps.
 * Apps register URL schemes that open with prefilled payee + amount.
 *
 * Schemes used:
 *   gpay://   - Google Pay (tez)
 *   phonepe:// - PhonePe
 *   paytmmp:// - Paytm
 *   bhim://   - BHIM
 *
 * `pa` is the payee UPI VPA. `pn` is payee name (display only).
 * `am` is amount. `cu` is currency. `tn` is transaction note.
 *
 * Most apps also accept a fallback universal UPI link:
 *   upi://pay?pa=...&pn=...&am=...
 *
 * Apps register the same `upi://` scheme so the universal link is the
 * safest bet. We fall back to it if a specific app link fails.
 */

export type AppDeepLinkInput = {
  upiId: string;
  payeeName: string;
  amountInr: number;
  orderId: string;
  transactionNote?: string;
};

const tn = (orderId: string, note?: string) =>
  encodeURIComponent((note ? note + " · " : "") + orderId);

export function buildGpayLink(input: AppDeepLinkInput): string {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.payeeName,
    am: String(input.amountInr),
    cu: "INR",
    tn: tn(input.orderId, input.transactionNote),
  });
  return `tez://upi/pay?${params.toString()}`;
}

export function buildPhonepeLink(input: AppDeepLinkInput): string {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.payeeName,
    am: String(input.amountInr),
    cu: "INR",
    tn: tn(input.orderId, input.transactionNote),
  });
  return `phonepe://pay?${params.toString()}`;
}

export function buildPaytmLink(input: AppDeepLinkInput): string {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.payeeName,
    am: String(input.amountInr),
    cu: "INR",
    tn: tn(input.orderId, input.transactionNote),
  });
  return `paytmmp://pay?${params.toString()}`;
}

export function buildBhimLink(input: AppDeepLinkInput): string {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.payeeName,
    am: String(input.amountInr),
    cu: "INR",
    tn: tn(input.orderId, input.transactionNote),
  });
  return `bhim://pay?${params.toString()}`;
}

/**
 * Generic UPI link — works in any app that supports the universal
 * `upi://` scheme. Use as a fallback when the specific app fails.
 */
export function buildUniversalUpiLink(input: AppDeepLinkInput): string {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.payeeName,
    am: String(input.amountInr),
    cu: "INR",
    tn: tn(input.orderId, input.transactionNote),
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Set of app-specific deeplinks for the "Pay with" picker on the
 * checkout success view. The UI lists these and lets the customer
 * tap their preferred app.
 */
export function listPaymentApps(input: AppDeepLinkInput): {
  id: string;
  label: string;
  href: string;
}[] {
  return [
    {
      id: "gpay",
      label: "Google Pay",
      href: buildGpayLink(input),
    },
    {
      id: "phonepe",
      label: "PhonePe",
      href: buildPhonepeLink(input),
    },
    {
      id: "paytm",
      label: "Paytm",
      href: buildPaytmLink(input),
    },
    {
      id: "bhim",
      label: "BHIM",
      href: buildBhimLink(input),
    },
  ];
}