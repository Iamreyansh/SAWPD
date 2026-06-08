import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function appendAudit(event: AuditEvent): Promise<void> {
  try {
    const sb = createAdminClient();
    await sb.from("audit_log").insert({
      id: crypto.randomBytes(6).toString("hex"),
      at: new Date().toISOString(),
      event,
    });
  } catch (err) {
    console.error("audit log failed:", err);
  }
}

export async function readRecentAudit(limit = 10): Promise<AuditEntry[]> {
  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("audit_log")
      .select("*")
      .order("at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      at: row.at as string,
      event: row.event as AuditEvent,
    }));
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
