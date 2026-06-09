import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const COOKIE_NAME = "sawpd_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 8) {
    throw new Error(
      "ADMIN_SECRET env var is required (min 8 chars). Add it to .env.local."
    );
  }
  return secret;
}

function getSigningSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || getSecret();
  return secret;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function checkPassword(input: string): boolean {
  const secret = getSecret();
  if (input.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(input), Buffer.from(secret));
  } catch {
    return false;
  }
}

export async function createAdminSession(): Promise<void> {
  const signingSecret = getSigningSecret();
  const sessionId = randomUUID();
  const sig = sign(sessionId, signingSecret);
  const store = await cookies();
  store.set(COOKIE_NAME, `${sessionId}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const c = store.get(COOKIE_NAME);
  if (!c) return false;
  const dot = c.value.lastIndexOf(".");
  if (dot <= 0) return false;
  const sessionId = c.value.slice(0, dot);
  const sig = c.value.slice(dot + 1);
  if (!sessionId || !sig) return false;
  const signingSecret = getSigningSecret();
  const expected = sign(sessionId, signingSecret);
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
