"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  checkPassword,
  clearAdminSession,
  createAdminSession,
} from "@/lib/admin-auth";
import { decideApplication, getApplication } from "@/lib/applications";
import { notifyApplicationDecided } from "@/lib/notify";
import { appendAudit } from "@/lib/audit";
import { getStore, updateStore } from "@/lib/store";
import { activatePlanMock } from "@/lib/store";
import { notifyLowStock, notifyStoreEmail } from "@/lib/notify";
import { listProductsForStore } from "@/lib/products";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { ok: false, error: "Password is required." };
  }
  if (!checkPassword(password)) {
    return { ok: false, error: "Wrong password." };
  }
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
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }
  if (parsed.data.decision === "rejected" && !parsed.data.reviewerNote.trim()) {
    return { ok: false, error: "A reason is required when rejecting." };
  }
  const updated = await decideApplication(
    parsed.data.applicationId,
    parsed.data.decision,
    parsed.data.reviewerNote.trim()
  );
  if (!updated) {
    return { ok: false, error: "Application not found." };
  }
  const original = await getApplication(parsed.data.applicationId);
  if (original) {
    await notifyApplicationDecided({
      storeName: original.storeName,
      applicantEmail: original.email,
      decision: parsed.data.decision,
      reviewerNote: parsed.data.reviewerNote.trim() || undefined,
    });
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
  const store = await getStore(storeSlug);
  if (!store) return { ok: false, error: "Store not found." };
  const products = await listProductsForStore(storeSlug);
  const flagged = products
    .filter((p) => p.isAvailable && p.stockCount > 0 && p.stockCount <= 5)
    .map((p) => ({ title: p.title, stockCount: p.stockCount }));
  if (flagged.length === 0) return { ok: true, count: 0 };
  await notifyLowStock({
    storeName: store.name,
    storeEmail: store.notifyEmail || undefined,
    products: flagged,
  });
  return { ok: true, count: flagged.length };
}
