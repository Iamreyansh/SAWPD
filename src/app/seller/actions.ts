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

const schema = z.object({
  email: z
    .string()
    .min(1, "Enter your email")
    .email("Enter a valid email")
    .transform(normalizeEmail),
  password: z
    .string()
    .min(8, "At least 8 characters"),
});

export type SellerAuthResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function sellerSignupAction(input: unknown): Promise<SellerAuthResult> {
  const parsed = schema.safeParse(input);
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
}

export async function sellerLoginAction(input: unknown): Promise<SellerAuthResult> {
  const parsed = schema.safeParse(input);
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
  const result = await verifyPassword(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    if (result.error === "not_found") {
      return {
        ok: false,
        error: "No account with that email. Sign up first.",
        fieldErrors: { email: "No account" },
      };
    }
    return {
      ok: false,
      error: "Wrong password.",
      fieldErrors: { password: "Wrong password" },
    };
  }
  await createSellerSession(result.seller.id);
  return { ok: true };
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
  revalidatePath(`/dashboard/`);
  redirect("/dashboard");
}
