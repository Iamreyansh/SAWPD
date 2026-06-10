import "server-only";
import { randomUUID } from "crypto";
import type { Application, ApplicationInput } from "@/types/applications";
import { createAdminClient } from "@/lib/supabase/admin";

function rowToApp(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    instagramHandle: row.instagram_handle as string,
    email: row.email as string,
    phone: row.phone as string,
    storeName: row.store_name as string,
    niche: row.niche as Application["niche"],
    followerCount: row.follower_count as number,
    salesCadence: row.sales_cadence as Application["salesCadence"],
    salesCount: row.sales_count as number,
    averageOrderValue: row.average_order_value as number,
    currentSetup: row.current_setup as string,
    websiteUrl: (row.website_url as string) ?? undefined,
    topProducts: row.top_products as string,
    referralSource: row.referral_source as string,
    motivation: row.motivation as string,
    createdAt: row.created_at as string,
    status: row.status as Application["status"],
    reviewedAt: (row.reviewed_at as string) ?? undefined,
    reviewerNote: (row.reviewer_note as string) ?? undefined,
    trialEndsAt: (row.trial_ends_at as string) ?? undefined,
    plan: (row.plan as Application["plan"]) ?? undefined,
    sellerId: (row.seller_id as string) ?? undefined,
  };
}

export async function listApplications(): Promise<Application[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToApp);
}

export async function getApplication(id: string): Promise<Application | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToApp(data);
}

export async function getApplicationByEmail(email: string): Promise<Application | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("applications")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return rowToApp(data);
}

export async function addApplication(
  input: ApplicationInput,
  options?: { sellerId?: string }
): Promise<Application> {
  const app: Application = {
    id: `app_${randomUUID().slice(0, 8)}`,
    fullName: input.fullName,
    instagramHandle: input.instagramHandle,
    email: input.email,
    phone: input.phone,
    storeName: input.storeName || "TBD",
    niche: input.niche || "other",
    followerCount: input.followerCount ?? 0,
    salesCadence: input.salesCadence || "weekly",
    salesCount: input.salesCount ?? 0,
    averageOrderValue: input.averageOrderValue ?? 0,
    currentSetup: input.currentSetup || "",
    websiteUrl: input.websiteUrl || undefined,
    topProducts: input.topProducts || "",
    referralSource: input.referralSource || "",
    motivation: input.motivation || "",
    createdAt: new Date().toISOString(),
    status: "pending",
    ...(options?.sellerId ? { sellerId: options.sellerId } : {}),
  };

  const sb = createAdminClient();
  const { error } = await sb.from("applications").insert({
    id: app.id,
    full_name: app.fullName,
    instagram_handle: app.instagramHandle,
    email: app.email,
    phone: app.phone,
    store_name: app.storeName,
    niche: app.niche,
    follower_count: app.followerCount,
    sales_cadence: app.salesCadence,
    sales_count: app.salesCount,
    average_order_value: app.averageOrderValue,
    current_setup: app.currentSetup,
    website_url: app.websiteUrl || null,
    top_products: app.topProducts,
    referral_source: app.referralSource,
    motivation: app.motivation,
    created_at: app.createdAt,
    status: app.status,
    seller_id: app.sellerId || null,
  });
  if (error) throw error;

  return app;
}

export async function decideApplication(
  id: string,
  decision: "approved" | "rejected",
  reviewerNote: string
): Promise<Application | null> {
  const now = new Date().toISOString();
  const trialEndsAt =
    decision === "approved"
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const sb = createAdminClient();
  // Conditional update: only proceed if application is still pending (prevents race condition)
  const { data, error } = await sb
    .from("applications")
    .update({
      status: decision,
      reviewed_at: now,
      reviewer_note: reviewerNote,
      trial_ends_at: trialEndsAt,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error || !data) {
    // Application was already decided by another admin
    return null;
  }

  return getApplication(id);
}
