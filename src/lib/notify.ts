import "server-only";
import { promises as fs } from "fs";
import path from "path";

/**
 * Minimal notification transport. The MVP has no email provider; notifications
 * are written to `data/notifications.log` (one JSON line per send) and also
 * echoed to the server console. Swap in Resend / Postmark / SES here later
 * by replacing `deliver()`.
 */
export type NotificationKind =
  | "application_received"
  | "application_decided"
  | "order_placed"
  | "order_verified"
  | "order_shipped"
  | "trial_ending"
  | "subscriber_added"
  | "low_stock"
  | "admin_message";

export type Notification = {
  id: string;
  createdAt: string;
  kind: NotificationKind;
  to: string;
  subject: string;
  body: string;
  meta?: Record<string, string | number>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(DATA_DIR, "notifications.log");

const MAX_LOG_BYTES = 256 * 1024; // 256KB rolling cap

async function appendNotification(n: Notification): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const stat = await fs.stat(LOG_FILE);
    if (stat.size > MAX_LOG_BYTES) {
      // Truncate to last 200 lines to keep the file bounded.
      const raw = await fs.readFile(LOG_FILE, "utf-8");
      const lines = raw.split("\n").filter(Boolean);
      const tail = lines.slice(-200).join("\n") + "\n";
      await fs.writeFile(LOG_FILE, tail, "utf-8");
    }
  } catch {
    // file does not exist yet — fine
  }
  await fs.appendFile(LOG_FILE, JSON.stringify(n) + "\n", "utf-8");
}

function generateId(): string {
  return `ntf_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

async function deliver(n: Notification): Promise<void> {
  // Replace this with a real provider later. For now: log + persist.
  console.log(`[notify] ${n.kind} → ${n.to}: ${n.subject}`);
  await appendNotification(n);
}

function adminInbox(): string | null {
  const v = process.env.NOTIFY_EMAIL;
  return v && v.trim() ? v.trim() : null;
}

export async function notifyApplicationReceived(params: {
  storeName: string;
  applicantName: string;
  email: string;
  instagramHandle: string;
}): Promise<void> {
  const to = adminInbox();
  if (!to) return;
  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind: "application_received",
    to,
    subject: `New application: ${params.storeName}`,
    body: `${params.applicantName} (@${params.instagramHandle}, ${params.email}) just applied for "${params.storeName}".`,
    meta: { storeName: params.storeName },
  });
}

export async function notifyApplicationDecided(params: {
  storeName: string;
  applicantEmail: string;
  decision: "approved" | "rejected";
  reviewerNote?: string;
}): Promise<void> {
  // Applicant confirmation goes to the admin inbox as a record; in a real
  // build the `to` would be params.applicantEmail.
  const to = adminInbox();
  if (!to) return;
  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind: "application_decided",
    to,
    subject: `Application ${params.decision}: ${params.storeName}`,
    body:
      params.decision === "approved"
        ? `${params.storeName} was approved. Trial starts now. Note: ${params.reviewerNote || "—"}`
        : `${params.storeName} was rejected. Note: ${params.reviewerNote || "—"} Reply to ${params.applicantEmail}.`,
  });
}

export async function notifyOrderPlaced(params: {
  storeName: string;
  storeEmail: string | undefined;
  orderId: string;
  customerName: string;
  total: number;
}): Promise<void> {
  const to = params.storeEmail || adminInbox();
  if (!to) return;
  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind: "order_placed",
    to,
    subject: `New order ${params.orderId} · ${params.storeName}`,
    body: `${params.customerName} placed an order worth ₹${params.total}. Verify their UPI screenshot in the dashboard.`,
    meta: { orderId: params.orderId, total: params.total },
  });
}

export async function notifyOrderStatusChanged(params: {
  storeName: string;
  storeEmail: string | undefined;
  orderId: string;
  customerName: string;
  status: "verified" | "shipped" | "completed" | "cancelled";
  trackingNote?: string;
}): Promise<void> {
  const to = adminInbox(); // status emails go to the admin inbox for now
  if (!to) return;
  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind:
      params.status === "verified"
        ? "order_verified"
        : params.status === "shipped"
          ? "order_shipped"
          : "order_placed",
    to,
    subject: `Order ${params.orderId} → ${params.status}`,
    body: `${params.storeName}: order from ${params.customerName} is now ${params.status}${
      params.trackingNote ? ` (${params.trackingNote})` : ""
    }.`,
  });
}

export async function notifyTrialEnding(params: {
  storeName: string;
  storeEmail: string | undefined;
  daysLeft: number;
}): Promise<void> {
  const to = params.storeEmail || adminInbox();
  if (!to) return;
  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind: "trial_ending",
    to,
    subject: `${params.storeName}: trial ends in ${params.daysLeft}d`,
    body: `Your SAWPD trial ends in ${params.daysLeft} day(s). Pick a plan to keep selling.`,
  });
}

export async function notifySubscriberAdded(params: {
  email: string;
}): Promise<void> {
  const to = adminInbox();
  if (!to) return;
  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind: "subscriber_added",
    to,
    subject: "New newsletter subscriber",
    body: `${params.email} just subscribed to SAWPD updates.`,
  });
}

export async function notifyLowStock(params: {
  storeName: string;
  storeEmail: string | undefined;
  products: { title: string; stockCount: number }[];
}): Promise<void> {
  if (params.products.length === 0) return;
  const to = params.storeEmail || adminInbox();
  if (!to) return;
  const list = params.products
    .map((p) => `  · ${p.title} — ${p.stockCount} left`)
    .join("\n");
  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind: "low_stock",
    to,
    subject: `${params.storeName}: ${params.products.length} product${params.products.length === 1 ? "" : "s"} running low`,
    body: `The following pieces on ${params.storeName} are running low:\n${list}\n\nRestock them in the dashboard.`,
    meta: { count: params.products.length },
  });
}

/**
 * Generic outbound email helper. Used by the admin "Email the applicant"
 * action so the manual outreach goes through the same logging path as the
 * templated notifications. Logs to the notifications file but does not
 * require a real `NOTIFY_EMAIL` env — the recipient is the `to` passed in.
 */
export async function notifyStoreEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind: "admin_message",
    to: params.to,
    subject: params.subject,
    body: params.body,
    meta: { source: "admin_manual" },
  });
}
