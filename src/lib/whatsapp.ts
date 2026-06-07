/**
 * Build a `https://wa.me/<phone>?text=<message>` deep link.
 * Phone must be in international format with no spaces (e.g. "919876543210" or "+919876543210").
 */
export function buildWhatsAppLink(
  phone: string | undefined | null,
  message: string
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function ownerContactMessage(opts: {
  storeName: string;
  orderId: string;
  customerName?: string;
  intent?: "question" | "support" | "general";
}): string {
  const intent = opts.intent ?? "question";
  const greet = opts.customerName ? `Hi ${opts.customerName}, ` : "Hi, ";
  const opener =
    intent === "support"
      ? `${greet}I need help with my order`
      : intent === "general"
        ? `${greet}I have a question about your store`
        : `${greet}I have a question about my order ${opts.orderId}`;
  return `${opener} from ${opts.storeName} (order ${opts.orderId}).`;
}
