import "server-only";
import { Resend } from "resend";

/**
 * Email notification transport backed by Resend.
 *
 * Required env vars:
 *   RESEND_API_KEY  — your Resend API key (re_...)
 *   EMAIL_FROM      — sender address, must use a verified domain
 *                     (default: "SAWPD <onboarding@resend.dev>" for dev)
 *
 * In development Resend allows sending to your own email only.
 * In production verify a custom domain at resend.com/domains.
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

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[notify] RESEND_API_KEY not set — emails will be skipped");
    return null;
  }
  return new Resend(key);
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || "SAWPD <onboarding@resend.dev>";
}

function generateId(): string {
  return `ntf_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function kindToLabel(kind: NotificationKind): string {
  const labels: Record<NotificationKind, string> = {
    application_received: "New Application",
    application_decided: "Application Update",
    order_placed: "New Order",
    order_verified: "Order Verified",
    order_shipped: "Order Shipped",
    trial_ending: "Trial Ending",
    subscriber_added: "New Subscriber",
    low_stock: "Low Stock Alert",
    admin_message: "Message from SAWPD",
  };
  return labels[kind];
}

async function deliver(n: Notification): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: n.to,
      subject: n.subject,
      html: buildHtmlEmail(n),
    });
    if (error) {
      console.error(`[notify] Resend error for ${n.kind}:`, error);
    }
  } catch (err) {
    console.error(`[notify] Failed to send ${n.kind} to ${n.to}:`, err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlEmail(n: Notification): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f0;color:#1a1a1a;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:24px 32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:2px;">SAWPD</span>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#999;">${escapeHtml(kindToLabel(n.kind))}</p>
      <h2 style="margin:0 0 24px;font-size:20px;font-weight:600;">${escapeHtml(n.subject)}</h2>
      <div style="font-size:15px;line-height:1.6;color:#444;white-space:pre-wrap;">${escapeHtml(n.body)}</div>
    </div>
    <div style="padding:16px 32px;background:#f9f9f6;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">SAWPD — storefronts for Instagram creators</p>
    </div>
  </div>
</body>
</html>`;
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
  // Send decision email to the applicant
  const approved =
    params.decision === "approved"
      ? `Congratulations! Your store "${params.storeName}" has been approved.\n\nYour 14-day free trial starts now. Log in at ${process.env.NEXT_PUBLIC_APP_URL || "https://sawpd.com"}/seller/login to set up your store.`
      : `Thank you for applying. Unfortunately, "${params.storeName}" was not approved at this time.\n\n${params.reviewerNote ? `Note: ${params.reviewerNote}` : ""}\n\nYou can reapply at ${process.env.NEXT_PUBLIC_APP_URL || "https://sawpd.com"}/apply.`;

  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind: "application_decided",
    to: params.applicantEmail,
    subject: `Your application ${params.decision}: ${params.storeName}`,
    body: approved,
  });
}

export async function notifyOrderPlaced(params: {
  storeName: string;
  storeEmail: string | undefined;
  orderId: string;
  customerName: string;
  total: number;
}): Promise<void> {
  // Notify the seller
  if (params.storeEmail) {
    await deliver({
      id: generateId(),
      createdAt: new Date().toISOString(),
      kind: "order_placed",
      to: params.storeEmail,
      subject: `New order ${params.orderId} · ${params.storeName}`,
      body: `${params.customerName} placed an order worth ₹${params.total}.\n\nVerify their UPI screenshot in the dashboard.`,
      meta: { orderId: params.orderId, total: params.total },
    });
  }
  // Also notify admin as backup
  const adminEmail = adminInbox();
  if (adminEmail && adminEmail !== params.storeEmail) {
    await deliver({
      id: generateId(),
      createdAt: new Date().toISOString(),
      kind: "order_placed",
      to: adminEmail,
      subject: `New order ${params.orderId} · ${params.storeName}`,
      body: `${params.customerName} placed an order worth ₹${params.total} on ${params.storeName}.`,
      meta: { orderId: params.orderId, total: params.total },
    });
  }
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
          : params.status === "completed"
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
  const to = params.storeEmail;
  if (!to) return;
  await deliver({
    id: generateId(),
    createdAt: new Date().toISOString(),
    kind: "trial_ending",
    to,
    subject: `${params.storeName}: trial ends in ${params.daysLeft} day${params.daysLeft === 1 ? "" : "s"}`,
    body: `Your SAWPD trial for "${params.storeName}" ends in ${params.daysLeft} day${params.daysLeft === 1 ? "" : "s"}.\n\nPick a plan to keep your store live: ${process.env.NEXT_PUBLIC_APP_URL || "https://sawpd.com"}/dashboard/settings`,
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
  const to = params.storeEmail;
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
    body: `The following products on ${params.storeName} are running low on stock:\n${list}\n\nRestock them in your dashboard.`,
    meta: { count: params.products.length },
  });
}

/**
 * Generic outbound email helper. Used by the admin "Email the applicant"
 * action so the manual outreach goes through the same notification path.
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
