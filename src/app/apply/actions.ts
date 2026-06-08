"use server";

import { z } from "zod";
import { addApplication } from "@/lib/applications";
import { getCurrentSeller } from "@/lib/seller-auth";
import { notifyApplicationReceived } from "@/lib/notify";
import type { ApplicationInput } from "@/types/applications";
import { formLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";
import { requireCaptcha } from "@/lib/captcha";

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
  captchaToken: z.string().optional().or(z.literal("")),
});

export type ApplyResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitApplication(
  input: unknown
): Promise<ApplyResult> {
  const ip = await getClientIp();
  if (!formLimiter.check(`apply:${ip}`)) {
    return { ok: false, error: "Too many submissions. Please wait a moment and try again." };
  }

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

  // CAPTCHA verification
  const captchaError = await requireCaptcha(parsed.data.captchaToken);
  if (captchaError) return { ok: false, error: captchaError };

  // If the applicant is signed in, attach their sellerId so the admin
  // approval flow can hand the resulting store back to the same account.
  const seller = await getCurrentSeller();
  const app = await addApplication(parsed.data as ApplicationInput, {
    sellerId: seller?.id,
  });
  await notifyApplicationReceived({
    storeName: app.storeName,
    applicantName: app.fullName,
    email: app.email,
    instagramHandle: app.instagramHandle,
  });
  return { ok: true, id: app.id };
}
