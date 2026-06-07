"use server";

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notifySubscriberAdded } from "@/lib/notify";

const DATA_DIR = path.join(process.cwd(), "data");
const SUBSCRIBERS_FILE = path.join(DATA_DIR, "subscribers.json");

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

async function readSubs(): Promise<Subscriber[]> {
  try {
    const raw = await fs.readFile(SUBSCRIBERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Subscriber[]) : [];
  } catch {
    return [];
  }
}

async function writeSubs(subs: Subscriber[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(subs, null, 2), "utf-8");
}

export async function subscribeEmail(
  formData: FormData
): Promise<SubscribeResult> {
  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }
  const email = parsed.data;
  const subs = await readSubs();
  if (subs.some((s) => s.email === email)) {
    return { ok: true, already: true };
  }
  const sub: Subscriber = {
    id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    email,
    createdAt: new Date().toISOString(),
    source: "marketing",
  };
  subs.unshift(sub);
  await writeSubs(subs);
  revalidatePath("/admin");
  void notifySubscriberAdded({ email: sub.email });
  return { ok: true, already: false };
}

export async function listSubscribers(): Promise<Subscriber[]> {
  return readSubs();
}
