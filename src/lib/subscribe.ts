"use server";

import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notifySubscriberAdded } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

const emailSchema = z.string().email("Enter a valid email");

export type Subscriber = {
  id: string;
  email: string;
  createdAt: string;
  source: string;
};

export type SubscribeResult =
  | { ok: true; already: boolean }
  | { ok: false; error: string };

export async function subscribeEmail(
  formData: FormData
): Promise<SubscribeResult> {
  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }
  const email = parsed.data;

  const sb = createAdminClient();

  // Check if already subscribed
  const { data: existing } = await sb
    .from("subscribers")
    .select("id")
    .eq("email", email)
    .single();
  if (existing) return { ok: true, already: true };

  const id = `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await sb.from("subscribers").insert({
    id,
    email,
    created_at: new Date().toISOString(),
    source: "marketing",
  });
  if (error) {
    if (error.code === "23505") return { ok: true, already: true };
    throw error;
  }

  revalidatePath("/admin");
  void notifySubscriberAdded({ email });
  return { ok: true, already: false };
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("subscribers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    email: row.email as string,
    createdAt: row.created_at as string,
    source: row.source as string,
  }));
}
