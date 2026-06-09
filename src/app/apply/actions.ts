"use server";

import { z } from "zod";
import { addApplication } from "@/lib/applications";
import { getCurrentSeller } from "@/lib/seller-auth";
import { getStoresForSeller } from "@/lib/store";
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
  storeName: z.string().min(2, "Shop name is required"),
  niche: z.enum(["fashion", "beauty", "home", "art", "jewelry", "other"], {
    required_error: "Pick a niche",
  }),
  followerCount: z.coerce.number().int().min(0).optional(),
  salesCadence: z.enum(["daily", "weekly", "monthly"]).optional(),
  salesCount: z.coerce.number().int().min(0).optional(),
  averageOrderValue: z.coerce.number().int().min(0).optional(),
  currentSetup: z.string().optional().or(z.literal("")),
  topProducts: z.string().optional().or(z.literal("")),
  referralSource: z.string().optional().or(z.literal("")),
  motivation: z.string().optional().or(z.literal("")),
  captchaToken: z.string().optional().or(z.literal("")),
});

export type ApplyResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitApplication(
  input: unknown
): Promise<ApplyResult> {
  try {
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

    const seller = await getCurrentSeller();
    // Session expired mid-form — user created account but cookie is gone
    if (!seller) {
      return {
        ok: false,
        error: "Your session expired. Please log in again and resubmit your application.",
      };
    }
    // Prevent duplicate applications if seller already has a shop
    if (seller) {
      const existingStores = await getStoresForSeller(seller.id);
      if (existingStores.length > 0) {
        return {
          ok: false,
          error: "You already have a shop. Please visit your dashboard to apply for an additional shop.",
        };
      }
    }
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
  } catch (err) {
    console.error("[submitApplication] unexpected error:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
