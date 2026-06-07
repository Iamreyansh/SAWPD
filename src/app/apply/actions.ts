"use server";

import { z } from "zod";
import { addApplication } from "@/lib/applications";
import { notifyApplicationReceived } from "@/lib/notify";
import type { ApplicationInput } from "@/types/applications";

const applySchema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  instagramHandle: z
    .string()
    .min(1, "Your Instagram handle is required")
    .transform((s) => s.replace(/^@/, "").trim())
    .pipe(z.string().min(1, "Your Instagram handle is required")),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .regex(/^[0-9+\s-]+$/, "Digits only"),
  storeName: z.string().min(2, "Name your shop"),
  niche: z.enum(["fashion", "beauty", "home", "art", "jewelry", "other"]),
  followerCount: z.coerce.number().int().min(0, "Enter a number"),
  salesCadence: z.enum(["daily", "weekly", "monthly"]),
  salesCount: z.coerce.number().int().min(0, "Enter a number"),
  averageOrderValue: z.coerce.number().int().min(0, "Enter a number in ₹"),
  currentSetup: z.string().min(2, "Tell us how you sell today"),
  websiteUrl: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  topProducts: z
    .string()
    .min(10, "Name your top 3 best-sellers (at least 10 characters)"),
  referralSource: z.string().min(1, "Tell us how you heard about us"),
  motivation: z
    .string()
    .min(20, "A little more — at least 20 characters"),
});

export type ApplyResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitApplication(
  input: unknown
): Promise<ApplyResult> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const app = await addApplication(parsed.data as ApplicationInput);
  await notifyApplicationReceived({
    storeName: app.storeName,
    applicantName: app.fullName,
    email: app.email,
    instagramHandle: app.instagramHandle,
  });
  return { ok: true, id: app.id };
}
