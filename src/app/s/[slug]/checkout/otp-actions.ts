"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { issueOtp, verifyOtp, peekLatestCode } from "@/lib/payment-otp";
import { getOtpProvider, activeOtpProviderId } from "@/lib/otp-provider";
import { checkoutLimiter, formLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";

// ── Issue OTP ────────────────────────────────────────────────────

const requestSchema = z.object({
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .max(20)
    .regex(/^\+?[0-9\s-]+$/, "Digits only"),
});

export type RequestOtpResult =
  | { ok: true; providerId: string; devCode?: string }
  | { ok: false; error: string };

export async function requestCheckoutOtpAction(
  input: unknown,
): Promise<RequestOtpResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid phone." };
  }

  const ip = await getClientIp();
  if (!formLimiter.check(`otp:${ip}`)) {
    return { ok: false, error: "Too many OTP requests. Wait a minute." };
  }

  try {
    const { code, expiresAt } = await issueOtp(parsed.data.phone);
    const provider = getOtpProvider();
    const expiresInMinutes = Math.max(
      1,
      Math.round(
        (new Date(expiresAt).getTime() - Date.now()) / 60000,
      ),
    );
    const result = await provider.send({
      phone: parsed.data.phone,
      code,
      expiresInMinutes,
    });
    if (!result.ok) {
      return {
        ok: false,
        error:
          "Couldn't send the code right now. Please try again or pick a different verification method.",
      };
    }

    // In dev / console provider, surface the code on-screen so the
    // developer (or a manual tester) doesn't need to read logs.
    const isDev =
      process.env.NODE_ENV !== "production" ||
      activeOtpProviderId() === "console";
    return {
      ok: true,
      providerId: result.providerId ?? activeOtpProviderId(),
      devCode: isDev ? code : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "OTP failed",
    };
  }
}

// ── Verify OTP ───────────────────────────────────────────────────

const verifySchema = z.object({
  phone: z.string().min(10).max(20),
  code: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Digits only"),
});

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; error: string; reason?: string };

export async function verifyCheckoutOtpAction(
  input: unknown,
): Promise<VerifyOtpResult> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  const ip = await getClientIp();
  if (!checkoutLimiter.check(`otp-verify:${ip}`)) {
    return { ok: false, error: "Too many attempts. Wait a minute." };
  }

  const result = await verifyOtp(parsed.data.phone, parsed.data.code);
  if (result.ok) return { ok: true };

  const messages: Record<string, string> = {
    no_code: "No code was sent to this number. Tap 'Send code' first.",
    expired: "That code expired. Tap 'Send a new code'.",
    max_attempts: "Too many wrong attempts. Tap 'Send a new code'.",
    wrong_code: "Wrong code. Try again.",
    already_used: "This code was already used.",
  };
  return {
    ok: false,
    error: messages[result.reason] ?? "Verification failed.",
    reason: result.reason,
  };
}

// ── Dev helper: re-fetch latest active code for a phone ───────────
//
// Used by the checkout UI in dev mode to show the code on-screen
// after the customer requests it. Never call this in production —
// `peekLatestCode` is gated by NODE_ENV inside the action.

export async function devPeekOtpCodeAction(
  phone: string,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "Not available." };
  }
  const code = await peekLatestCode(phone);
  if (!code) return { ok: false, error: "No active code." };
  return { ok: true, code };
}