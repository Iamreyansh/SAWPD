import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const AUDIT_FILE = path.join(DATA_DIR, "audit.log");

export type AuditEvent =
  | { kind: "admin_login" }
  | { kind: "admin_logout" }
  | { kind: "application_decided"; applicationId: string; storeName: string; decision: "approved" | "rejected" }
  | { kind: "application_emailed"; applicationId: string; storeName: string; subject: string }
  | { kind: "store_suspended"; storeSlug: string; storeName: string; reason?: string }
  | { kind: "store_reactivated"; storeSlug: string; storeName: string }
  | { kind: "store_plan_changed"; storeSlug: string; storeName: string; fromPlan: string | null; toPlan: "weekly" | "monthly" | "none" }
  | { kind: "return_requested"; storeSlug: string; returnId: string; orderId: string; productTitle: string; qty: number }
  | { kind: "return_decided"; storeSlug: string; returnId: string; orderId: string; decision: "approved" | "rejected" | "refunded" };

export type AuditEntry = {
  id: string;
  at: string;
  event: AuditEvent;
};

/**
 * Append a structured event to `data/audit.log` (JSONL). Best-effort: errors
 * are swallowed so a broken audit log never blocks an admin action.
 */
export async function appendAudit(event: AuditEvent): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const entry: AuditEntry = {
      id: crypto.randomBytes(6).toString("hex"),
      at: new Date().toISOString(),
      event,
    };
    await fs.appendFile(AUDIT_FILE, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    console.error("audit log failed:", err);
  }
}

/**
 * Read the last N entries (newest first). Cheap because we only need a tail
 * view of the admin overview.
 */
export async function readRecentAudit(limit = 10): Promise<AuditEntry[]> {
  try {
    const raw = await fs.readFile(AUDIT_FILE, "utf-8");
    const lines = raw.split("\n").filter(Boolean);
    const out: AuditEntry[] = [];
    for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
      try {
        out.push(JSON.parse(lines[i]) as AuditEntry);
      } catch {
        // skip malformed line
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function describeAuditEvent(entry: AuditEntry): string {
  const e = entry.event;
  switch (e.kind) {
    case "admin_login":
      return "Admin signed in";
    case "admin_logout":
      return "Admin signed out";
    case "application_decided":
      return `Application ${e.decision} · ${e.storeName}`;
    case "application_emailed":
      return `Emailed applicant · ${e.storeName} · "${e.subject}"`;
    case "store_suspended":
      return `Suspended ${e.storeName}${e.reason ? ` · ${e.reason}` : ""}`;
    case "store_reactivated":
      return `Reactivated ${e.storeName}`;
    case "store_plan_changed":
      return `Plan changed · ${e.storeName} · ${e.fromPlan ?? "none"} → ${e.toPlan}`;
    case "return_requested":
      return `Return requested · ${e.productTitle} × ${e.qty} · order ${e.orderId}`;
    case "return_decided":
      return `Return ${e.decision} · order ${e.orderId}`;
  }
}
