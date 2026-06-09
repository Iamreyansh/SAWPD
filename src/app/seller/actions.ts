"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSeller, verifyPassword, normalizeEmail } from "@/lib/sellers";
import {
  createSellerSession,
  clearSellerSession,
  getCurrentSeller,
  setActiveStoreSlug,
} from "@/lib/seller-auth";
import { getStoreForSeller } from "@/lib/store";
import { loginLimiter, formLimiter } from "@/lib/rate-limit";
import { loginProtection } from "@/lib/brute-force";
import { getClientIp } from "@/lib/get-ip";
import { requireCaptcha } from "@/lib/captcha";
import { checkPasswordStrength } from "@/lib/password";

const baseSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your email")
    .email("Enter a valid email")
    .transform(normalizeEmail),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(128, "Under 128 characters"),
});

const loginSchema = baseSchema;

const signupSchema = baseSchema.extend({
  captchaToken: z.string().optional().or(z.literal("")),
});

export type SellerAuthResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function sellerSignupAction(input: unknown): Promise<SellerAuthResult> {
  try {
    const ip = await getClientIp();
    if (!formLimiter.check(`signup:${ip}`)) {
      return { ok: false, error: "Too many signups. Please wait a moment." };
    }

    const parsed = signupSchema.safeParse(input);
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

    // Password strength check
    const { strength, errors } = checkPasswordStrength(parsed.data.password);
    if (strength === "weak") {
      return {
        ok: false,
        error: "Password is too weak.",
        fieldErrors: { password: errors[0] },
      };
    }

    const result = await createSeller(parsed.data);
    if (!result.ok) {
      if (result.error === "email_taken") {
        return {
          ok: false,
          error: "An account with that email already exists. Try logging in.",
          fieldErrors: { email: "Already registered" },
        };
      }
      return { ok: false, error: "Couldn't create your account. Check your details." };
    }
    await createSellerSession(result.seller.id);
    return { ok: true };
  } catch (err) {
    console.error("[sellerSignupAction]", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function sellerLoginAction(input: unknown): Promise<SellerAuthResult> {
  try {
    const ip = await getClientIp();
    const key = `seller:${ip}`;

    // Rate limit: 5 attempts per 15 min
    if (!loginLimiter.check(key)) {
      const retryMs = loginLimiter.retryAfter(key);
      const retryMin = Math.ceil(retryMs / 60_000);
      return { ok: false, error: `Too many attempts. Try again in ${retryMin} min.` };
    }

    // Brute-force lockout
    if (loginProtection.isLocked(key)) {
      const lockMs = loginProtection.retryAfter(key);
      const lockMin = Math.ceil(lockMs / 60_000);
      return { ok: false, error: `Account locked. Try again in ${lockMin} min.` };
    }

    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const fieldKey = issue.path[0];
        if (typeof fieldKey === "string" && !fieldErrors[fieldKey]) {
          fieldErrors[fieldKey] = issue.message;
        }
      }
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors,
      };
    }
    const result = await verifyPassword(parsed.data.email, parsed.data.password);
    if (!result.ok) {
      loginProtection.recordFailure(key);
      // Generic error — prevents email enumeration
      return {
        ok: false,
        error: "Invalid email or password.",
        fieldErrors: { email: "Invalid credentials" },
      };
    }
    loginProtection.recordSuccess(key);
    await createSellerSession(result.seller.id);
    return { ok: true };
  } catch (err) {
    console.error("[sellerLoginAction]", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function sellerLogoutAction(): Promise<void> {
  await clearSellerSession();
  redirect("/");
}

/**
 * Switch the active store in the dashboard sidebar.
 * Validates that the slug belongs to the signed-in seller (no IDOR).
 */
export async function setActiveStoreAction(slug: string): Promise<void> {
  const seller = await getCurrentSeller();
  if (!seller) redirect("/seller/login");
  const store = await getStoreForSeller(slug, seller.id);
  if (!store) {
    throw new Error("Store not found or not owned by you.");
  }
  await setActiveStoreSlug(slug);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/promotions");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/returns");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard");
}
