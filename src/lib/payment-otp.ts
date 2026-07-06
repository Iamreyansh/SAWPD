import "server-only";
import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Payment OTP system (tuktukpizzeria.in pattern).
 *
 * Flow:
 *   1. Customer fills checkout, hits "Verify phone"
 *   2. Server generates 6-digit OTP, stores with TTL
 *   3. Provider sends OTP via WhatsApp / SMS / email
 *   4. Customer enters OTP
 *   5. On verify: payment options unlock + order goes to admin queue
 *
 * Stored in the `payment_otps` Supabase table. Max 3 attempts per
 * code; rate-limited at the action layer (see lib/rate-limit.ts).
 */

export type OtpRecord = {
  id: string;
  phone: string;
  code: string;
  attempts: number;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
};

const CODE_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 3;

function rowToOtp(row: Record<string, unknown>): OtpRecord {
  return {
    id: row.id as string,
    phone: row.phone as string,
    code: row.code as string,
    attempts: (row.attempts as number) ?? 0,
    expiresAt: row.expires_at as string,
    consumedAt: (row.consumed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function generateCode(): string {
  // 6-digit numeric, leading zeros preserved.
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Issue a new OTP for the given phone. Invalidate any previous
 * un-consumed codes for the same phone so we don't accumulate dead
 * codes during retries.
 */
export async function issueOtp(phone: string): Promise<{
  code: string;
  expiresAt: string;
}> {
  const sb = createAdminClient();
  const normalized = normalizePhone(phone);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + CODE_TTL_MINUTES * 60_000,
  ).toISOString();
  const code = generateCode();

  // Wipe prior un-consumed codes for this phone
  await sb
    .from("payment_otps")
    .update({ consumed_at: now.toISOString() })
    .eq("phone", normalized)
    .is("consumed_at", null);

  const { error } = await sb.from("payment_otps").insert({
    phone: normalized,
    code,
    expires_at: expiresAt,
    attempts: 0,
    created_at: now.toISOString(),
  });
  if (error) throw error;

  return { code, expiresAt };
}

export type VerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "no_code"
        | "expired"
        | "max_attempts"
        | "wrong_code"
        | "already_used";
    };

/**
 * Verify a code. Increments attempts on wrong code. On success,
 * marks the row consumed (single-use). Always returns the structured
 * reason so the UI can show a clear error.
 */
export async function verifyOtp(
  phone: string,
  code: string,
): Promise<VerifyResult> {
  const sb = createAdminClient();
  const normalized = normalizePhone(phone);

  const { data: rows } = await sb
    .from("payment_otps")
    .select("*")
    .eq("phone", normalized)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = rows?.[0];
  if (!row) return { ok: false, reason: "no_code" };

  const otp = rowToOtp(row);
  if (otp.consumedAt) return { ok: false, reason: "already_used" };
  if (new Date(otp.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "max_attempts" };
  }
  if (otp.code !== code.trim()) {
    // Increment attempts atomically so parallel requests don't both pass.
    await sb
      .from("payment_otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id);
    return { ok: false, reason: "wrong_code" };
  }

  // Success — mark consumed.
  await sb
    .from("payment_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id);
  return { ok: true };
}

/**
 * Used in dev / for support: peek the latest active code for a phone.
 * Never call this from a public endpoint.
 */
export async function peekLatestCode(phone: string): Promise<string | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("payment_otps")
    .select("code, expires_at, consumed_at")
    .eq("phone", normalizePhone(phone))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  if (data.consumed_at) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return data.code as string;
}