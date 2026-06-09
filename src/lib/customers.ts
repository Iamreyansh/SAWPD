import "server-only";
import type { Order, OrderStatus } from "@/types/seller";

export type Customer = {
  name: string;
  phone: string;
  phoneDigits: string;
  email?: string;
  orderCount: number;
  cancelledCount: number;
  lifetimeValue: number;
  lastOrderAt: string;
  lastOrderStatus: OrderStatus;
  lastOrderId: string;
};

const REVENUE_STATUSES: OrderStatus[] = [
  "awaiting_payment",
  "awaiting_verification",
  "verified",
  "shipped",
  "completed",
];

function normalizePhone(p: string): string {
  return p.replace(/[^\d]/g, "");
}

export function aggregateCustomers(orders: Order[]): Customer[] {
  const map = new Map<string, Customer>();
  // Sort by createdAt desc so the first occurrence per phone is the "most recent"
  const sorted = [...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  for (const o of sorted) {
    const digits = normalizePhone(o.customer.phone);
    if (!digits) continue;
    const existing = map.get(digits);
    if (!existing) {
      map.set(digits, {
        name: o.customer.name,
        phone: o.customer.phone,
        phoneDigits: digits,
        email: o.customer.email,
        orderCount: 1,
        cancelledCount: o.status === "cancelled" ? 1 : 0,
        lifetimeValue: REVENUE_STATUSES.includes(o.status) ? o.total : 0,
        lastOrderAt: o.createdAt,
        lastOrderStatus: o.status,
        lastOrderId: o.id,
      });
    } else {
      existing.orderCount += 1;
      if (o.status === "cancelled") existing.cancelledCount += 1;
      if (REVENUE_STATUSES.includes(o.status)) existing.lifetimeValue += o.total;
      // Since sorted desc, existing fields stay as the most recent
      if (!existing.email && o.customer.email) existing.email = o.customer.email;
    }
  }
  return [...map.values()].sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

export function customersToCsv(customers: Customer[]): string {
  const header = ["Name", "Phone", "Email", "Orders", "Cancelled", "Lifetime Value (INR)", "Last Order Date", "Last Order ID", "Last Status"];
  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.email ?? "",
    String(c.orderCount),
    String(c.cancelledCount),
    String(c.lifetimeValue),
    new Date(c.lastOrderAt).toISOString(),
    c.lastOrderId,
    c.lastOrderStatus,
  ]);
  return toCsv([header, ...rows]);
}

export function ordersToCsv(orders: Order[]): string {
  const header = [
    "Order ID",
    "Created At",
    "Customer Name",
    "Customer Phone",
    "Customer Email",
    "Status",
    "Items",
    "Subtotal",
    "Discount",
    "Promo Code",
    "Total",
    "Tracking Note",
    "Verified At",
    "Shipped At",
    "Completed At",
    "Cancelled At",
  ];
  const rows = orders.map((o) => [
    o.id,
    new Date(o.createdAt).toISOString(),
    o.customer.name,
    o.customer.phone,
    o.customer.email ?? "",
    o.status,
    o.lines.map((l) => `${l.qty}x ${l.title}`).join(" | "),
    o.subtotal != null ? String(o.subtotal) : "",
    o.discountAmount != null ? String(o.discountAmount) : "",
    o.promoCode ?? "",
    String(o.total),
    o.trackingNote ?? "",
    o.verifiedAt ?? "",
    o.shippedAt ?? "",
    o.completedAt ?? "",
    o.cancelledAt ?? "",
  ]);
  return toCsv([header, ...rows]);
}

function toCsv(rows: string[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          let s = String(cell ?? "");
          // Prevent CSV injection: prefix formula-triggering characters
          if (/^[=+\-@\t\r]/.test(s)) {
            s = "'" + s;
          }
          if (/[",\n\r]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    )
    .join("\n");
}
