"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  checkPassword,
  clearAdminSession,
  createAdminSession,
  isAdmin,
} from "@/lib/admin-auth";
import { decideApplication, getApplication } from "@/lib/applications";
import { notifyApplicationDecided } from "@/lib/notify";
import { appendAudit } from "@/lib/audit";
import { addStore, getStore, updateStore } from "@/lib/store";
import { activatePlanMock } from "@/lib/store";
import { notifyLowStock, notifyStoreEmail } from "@/lib/notify";
import { listProductsForStore } from "@/lib/products";
import { loginLimiter } from "@/lib/rate-limit";
import { loginProtection } from "@/lib/brute-force";
import { getClientIp } from "@/lib/get-ip";
import { deleteUploadIfLocal } from "@/lib/uploads";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSellerSession } from "@/lib/seller-auth";
import { LOW_STOCK_THRESHOLD } from "@/lib/utils";

async function requireAdmin(): Promise<boolean> {
  return isAdmin();
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const ip = await getClientIp();
  const key = `admin:${ip}`;

  // Rate limit: 5 attempts per 15 min
  if (!loginLimiter.check(key)) {
    const retryMs = loginLimiter.retryAfter(key);
    const retryMin = Math.ceil(retryMs / 60_000);
    return { ok: false, error: `Too many attempts. Try again in ${retryMin} min.` };
  }

  // Brute-force lockout: 5 failures = 15 min lock
  if (loginProtection.isLocked(key)) {
    const lockMs = loginProtection.retryAfter(key);
    const lockMin = Math.ceil(lockMs / 60_000);
    return { ok: false, error: `Account locked. Try again in ${lockMin} min.` };
  }

  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { ok: false, error: "Password is required." };
  }
  if (!checkPassword(password)) {
    loginProtection.recordFailure(key);
    return { ok: false, error: "Wrong password." };
  }
  loginProtection.recordSuccess(key);
  await createAdminSession();
  await appendAudit({ kind: "admin_login" });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearAdminSession();
  await appendAudit({ kind: "admin_logout" });
  redirect("/admin/login");
}

const decisionSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  reviewerNote: z.string().optional().default(""),
});

export type DecisionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function decideAction(input: unknown): Promise<DecisionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }
  if (parsed.data.decision === "rejected" && !parsed.data.reviewerNote.trim()) {
    return { ok: false, error: "A reason is required when rejecting." };
  }
  const original = await getApplication(parsed.data.applicationId);
  if (!original) {
    return { ok: false, error: "Application not found." };
  }
  if (original.status !== "pending") {
    return {
      ok: false,
      error: `Application has already been ${original.status}. No changes made.`,
    };
  }
  if (parsed.data.decision === "approved") {
    if (!original.sellerId) {
      return {
        ok: false,
        error:
          "This application has no linked seller account. The applicant must sign up at /seller/signup before they can be approved.",
      };
    }
    const existing = await getStore(
      (original.storeName ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    );
    if (existing) {
      return {
        ok: false,
        error: "A store with that slug already exists. Edit the application first.",
      };
    }
  }
  const updated = await decideApplication(
    parsed.data.applicationId,
    parsed.data.decision,
    parsed.data.reviewerNote.trim()
  );
  if (!updated) {
    return { ok: false, error: "Application not found." };
  }
  if (original) {
    await notifyApplicationDecided({
      storeName: original.storeName,
      applicantEmail: original.email,
      decision: parsed.data.decision,
      reviewerNote: parsed.data.reviewerNote.trim() || undefined,
    });
  }

  // On approval, provision the store. The seller's id is read from the
  // application (the seller attached it when they submitted via /apply
  // while signed in). Trial of 14 days, plan = null until the seller
  // picks one from /dashboard/settings.
  if (parsed.data.decision === "approved" && original.sellerId) {
    const trialEndsAt = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();
    const heroImage =
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80&auto=format&fit=crop";
    const created = await addStore(
      {
        name: original.storeName,
        ownerHandle: original.instagramHandle.replace(/^@/, "") || original.storeName.toLowerCase(),
        heroImage,
        heroKicker: original.niche,
        heroHeadline: [original.storeName, "by " + original.fullName.split(" ")[0]],
        heroSub: "Welcome to " + original.storeName + " on SAWPD.",
        upiId: "your-upi@bank",
        notifyEmail: original.email,
        whatsapp: original.phone,
        returnsPolicy: { enabled: false, windowDays: 7, mode: "any" },
      },
      original.sellerId
    );
    await updateStore(created.slug, { trialEndsAt });
  }

  if (original) {
    await appendAudit({
      kind: "application_decided",
      applicationId: parsed.data.applicationId,
      storeName: original.storeName,
      decision: parsed.data.decision,
    });
  }
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
  return { ok: true };
}

const emailApplicantSchema = z.object({
  applicationId: z.string().min(1),
  subject: z.string().min(1, "Subject is required").max(140, "Keep subject under 140 characters"),
  body: z.string().min(1, "Message is required").max(4000, "Keep message under 4000 characters"),
});

export type EmailApplicantResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function emailApplicantAction(input: unknown): Promise<EmailApplicantResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = emailApplicantSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }
  const app = await getApplication(parsed.data.applicationId);
  if (!app) return { ok: false, error: "Application not found." };
  await notifyStoreEmail({
    to: app.email,
    subject: parsed.data.subject,
    body: parsed.data.body,
  });
  await appendAudit({
    kind: "application_emailed",
    applicationId: app.id,
    storeName: app.storeName,
    subject: parsed.data.subject,
  });
  revalidatePath(`/admin/applications/${app.id}`);
  return { ok: true };
}

const suspendSchema = z.object({
  storeSlug: z.string().min(1),
  reason: z.string().max(280).optional().default(""),
});

export type SuspendResult = { ok: true } | { ok: false; error: string };

export async function suspendStoreAction(input: unknown): Promise<SuspendResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const store = await getStore(parsed.data.storeSlug);
  if (!store) return { ok: false, error: "Store not found." };
  await updateStore(store.slug, { paused: true, pausedReason: parsed.data.reason.trim() || undefined });
  await appendAudit({
    kind: "store_suspended",
    storeSlug: store.slug,
    storeName: store.name,
    reason: parsed.data.reason.trim() || undefined,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${store.slug}`);
  revalidatePath(`/s/${store.slug}`);
  return { ok: true };
}

export async function reactivateStoreAction(input: unknown): Promise<SuspendResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const store = await getStore(parsed.data.storeSlug);
  if (!store) return { ok: false, error: "Store not found." };
  await updateStore(store.slug, { paused: false, pausedReason: undefined });
  await appendAudit({
    kind: "store_reactivated",
    storeSlug: store.slug,
    storeName: store.name,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${store.slug}`);
  revalidatePath(`/s/${store.slug}`);
  return { ok: true };
}

const planChangeSchema = z.object({
  storeSlug: z.string().min(1),
  plan: z.enum(["weekly", "monthly", "none"]),
});

export type ChangePlanResult = { ok: true } | { ok: false; error: string };

export async function changeStorePlanAction(input: unknown): Promise<ChangePlanResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = planChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const store = await getStore(parsed.data.storeSlug);
  if (!store) return { ok: false, error: "Store not found." };
  const fromPlan = store.plan ?? null;
  if (parsed.data.plan === "none") {
    await updateStore(store.slug, { plan: undefined, trialEndsAt: undefined });
  } else {
    const result = await activatePlanMock(store.slug, parsed.data.plan);
    if (!result) return { ok: false, error: "Could not activate plan." };
  }
  await appendAudit({
    kind: "store_plan_changed",
    storeSlug: store.slug,
    storeName: store.name,
    fromPlan,
    toPlan: parsed.data.plan,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${store.slug}`);
  return { ok: true };
}

export type ForceLowStockResult = { ok: true; count: number } | { ok: false; error: string };

export async function adminForceLowStockAction(storeSlug: string): Promise<ForceLowStockResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const store = await getStore(storeSlug);
  if (!store) return { ok: false, error: "Store not found." };
  const products = await listProductsForStore(storeSlug);
  const flagged = products
    .filter((p) => p.isAvailable && p.stockCount > 0 && p.stockCount <= LOW_STOCK_THRESHOLD)
    .map((p) => ({ title: p.title, stockCount: p.stockCount }));
  if (flagged.length === 0) return { ok: true, count: 0 };
  await notifyLowStock({
    storeName: store.name,
    storeEmail: store.notifyEmail || undefined,
    products: flagged,
  });
  return { ok: true, count: flagged.length };
}

// ---------- Manual subscription override (giveaway / extension) ----------

const accessOverrideSchema = z.object({
  storeSlug: z.string().min(1),
  plan: z.enum(["weekly", "monthly", "none"]),
  /**
   * YYYY-MM-DD. Omit (or empty string) to clear the expiry — a permanent
   * giveaway or an extension that never lapses. Ignored when
   * `plan !== "none"`.
   */
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  reason: z.string().min(3, "Reason is required (for audit).").max(280),
  /** Optional internal note to the seller (separate from audit). */
  note: z.string().max(500).optional(),
});

export type AccessOverrideResult =
  | { ok: true; trialEndsAt: string | null }
  | { ok: false; error: string };

export async function setStoreAccessAction(
  input: unknown
): Promise<AccessOverrideResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = accessOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const store = await getStore(parsed.data.storeSlug);
  if (!store) return { ok: false, error: "Store not found." };

  // Plan: "none" → store's access is governed by the trial window.
  //   - If an expiresAt was given, stamp it (end-of-day IST).
  //   - Otherwise leave it null (permanent).
  // Plan: "weekly" / "monthly" → access is governed by the plan; set
  //   a renewal-style date so the dashboard reads correctly.
  let trialEndsAt: string | null = null;
  if (parsed.data.plan === "none") {
    if (parsed.data.expiresAt && parsed.data.expiresAt.length > 0) {
      const [y, m, d] = parsed.data.expiresAt.split("-").map(Number);
      const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 0);
      trialEndsAt = dt.toISOString();
    }
  } else {
    const dt = new Date();
    dt.setDate(dt.getDate() + 30);
    dt.setHours(23, 59, 59, 0);
    trialEndsAt = dt.toISOString();
  }

  const updated = await updateStore(store.slug, {
    plan: parsed.data.plan === "none" ? undefined : parsed.data.plan,
    trialEndsAt: trialEndsAt ?? undefined,
  });
  if (!updated) {
    return { ok: false, error: "Could not update store." };
  }
  const finalTrialEndsAt = updated.trialEndsAt ?? null;

  await appendAudit({
    kind: "store_access_overridden",
    storeSlug: store.slug,
    storeName: store.name,
    plan: parsed.data.plan,
    trialEndsAt: finalTrialEndsAt,
    reason: parsed.data.reason,
  });

  // Notify the seller if they have an email on file. Best-effort.
  if (store.notifyEmail) {
    try {
      const when = finalTrialEndsAt
        ? `until ${new Date(finalTrialEndsAt).toLocaleDateString("en-IN")}`
        : "with no expiry";
      const subject =
        parsed.data.plan === "none"
          ? "Your SAWPD shop access has been updated"
          : `Your SAWPD subscription was set to ${parsed.data.plan}`;
      const body =
        `Hi ${store.name} team,\n\n` +
        `An admin has updated your subscription:\n\n` +
        `  Plan: ${parsed.data.plan === "none" ? "No plan" : parsed.data.plan}\n` +
        `  Access: ${when}\n` +
        `  Reason: ${parsed.data.reason}\n\n` +
        (parsed.data.note ? `Note: ${parsed.data.note}\n\n` : "") +
        `— SAWPD admin`;
      await notifyStoreEmail({
        to: store.notifyEmail,
        subject,
        body,
      });
    } catch (err) {
      console.error("[admin] seller notification failed:", err);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${store.slug}`);
  revalidatePath(`/s/${store.slug}`);
  return { ok: true, trialEndsAt: finalTrialEndsAt };
}

// ---------- Permanent purge (inactive stores only) --------------------

const purgeSchema = z.object({
  storeSlug: z.string().min(1),
  confirm: z.literal("PURGE"),
  reason: z.string().min(3).max(280),
});

export type PurgeStoreResult = { ok: true } | { ok: false; error: string };

export async function purgeInactiveStoreAction(
  input: unknown
): Promise<PurgeStoreResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = purgeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const store = await getStore(parsed.data.storeSlug);
  if (!store) return { ok: false, error: "Store not found." };

  // Safety guard: only allow purging inactive stores. An active
  // store may have customers mid-checkout — force the admin to
  // suspend first.
  const { isStoreOpen } = await import("@/lib/trial");
  if (isStoreOpen(store)) {
    return {
      ok: false,
      error:
        "Store is currently active. Suspend it first (Store state panel above) before purging.",
    };
  }

  const sb = createAdminClient();

  // Best-effort: remove uploaded product images from Supabase Storage.
  const products = await listProductsForStore(store.slug);
  for (const p of products) {
    for (const img of p.images) {
      await deleteUploadIfLocal(img.url);
    }
  }

  // Explicit deletes for each child table. Our schema has
  // ON DELETE CASCADE on most, but doing it explicitly gives a cleaner
  // log and works even if a future migration drops a cascade.
  await sb.from("products").delete().eq("store_slug", store.slug);
  await sb.from("orders").delete().eq("store_slug", store.slug);
  await sb.from("promos").delete().eq("store_slug", store.slug);
  await sb.from("billing").delete().eq("store_slug", store.slug);
  await sb.from("returns").delete().eq("store_slug", store.slug);
  // Phase 3 tables
  await sb.from("service_slots").delete().eq("store_slug", store.slug);
  // service_bookings has order_id FK; orders are gone first.
  // Custom-orders tables
  await sb.from("custom_orders").delete().eq("store_slug", store.slug);
  await sb.from("custom_templates").delete().eq("store_slug", store.slug);

  const { error: delErr } = await sb
    .from("stores")
    .delete()
    .eq("slug", store.slug);
  if (delErr) return { ok: false, error: delErr.message };

  await appendAudit({
    kind: "store_purged",
    storeSlug: store.slug,
    storeName: store.name,
    reason: parsed.data.reason,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  return { ok: true };
}

// ---------- Hard delete ----------

const deleteStoreSchema = z.object({
  storeSlug: z.string().min(1),
  confirm: z.literal("DELETE"),
});

export type DeleteStoreResult = { ok: true } | { ok: false; error: string };

export async function deleteStoreAction(input: unknown): Promise<DeleteStoreResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = deleteStoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Type DELETE to confirm." };
  }
  const store = await getStore(parsed.data.storeSlug);
  if (!store) return { ok: false, error: "Store not found." };

  const sb = createAdminClient();

  // Delete products and their images
  const products = await listProductsForStore(store.slug);
  for (const p of products) {
    for (const img of p.images) {
      await deleteUploadIfLocal(img.url);
    }
  }
  await sb.from("products").delete().eq("store_slug", store.slug);

  // Delete orders
  await sb.from("orders").delete().eq("store_slug", store.slug);

  // Delete promos
  await sb.from("promos").delete().eq("store_slug", store.slug);

  // Delete billing
  await sb.from("billing").delete().eq("store_slug", store.slug);

  // Delete returns
  await sb.from("returns").delete().eq("store_slug", store.slug);

  // Delete the store
  await sb.from("stores").delete().eq("slug", store.slug);

  await appendAudit({
    kind: "store_deleted",
    storeSlug: store.slug,
    storeName: store.name,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath(`/s/${store.slug}`);
  return { ok: true };
}

const deleteApplicationSchema = z.object({
  applicationId: z.string().min(1),
  confirm: z.literal("DELETE"),
});

export type DeleteApplicationResult = { ok: true } | { ok: false; error: string };

export async function deleteApplicationAction(
  input: unknown
): Promise<DeleteApplicationResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = deleteApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Type DELETE to confirm." };
  }
  const app = await getApplication(parsed.data.applicationId);
  if (!app) return { ok: false, error: "Application not found." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("applications")
    .delete()
    .eq("id", parsed.data.applicationId);
  if (error) return { ok: false, error: error.message };

  await appendAudit({
    kind: "application_deleted",
    applicationId: app.id,
    storeName: app.storeName,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  return { ok: true };
}

// ---------- Impersonate a seller (admin demo helper) ----------

/**
 * Mints a `sawpd_seller` session cookie for the store's owner, then
 * redirects to `/dashboard`. The admin now sees the seller's view
 * exactly as the seller would.
 *
 * Used by /admin/demo for quick live demos. The original admin
 * session is preserved (separate cookie). To return to admin, the
 * admin signs out from the seller dashboard and visits /admin again.
 */
export async function impersonateSellerAction(storeSlug: string): Promise<never> {
  if (!(await requireAdmin())) {
    throw new Error("Unauthorized.");
  }
  const store = await getStore(storeSlug);
  if (!store) {
    throw new Error("Store not found.");
  }

  await createSellerSession(store.sellerId);

  // Append a custom audit row directly so the impersonation is
  // recorded even though it doesn't match any of the typed event
  // kinds. This is admin-only, server-side, and self-auditing.
  try {
    const sb = createAdminClient();
    await sb.from("audit_log").insert({
      id: `aud_${crypto.randomUUID().slice(0, 8)}`,
      at: new Date().toISOString(),
      event: {
        kind: "admin_impersonated",
        storeSlug: store.slug,
        storeName: store.name,
        sellerId: store.sellerId,
      },
    });
  } catch (err) {
    console.error("[admin] impersonation audit failed:", err);
  }

  redirect("/dashboard");
}
