import { verifyTurnstile } from "@/components/ui/turnstile";
import { getClientIp } from "@/lib/get-ip";

/**
 * Verify a Turnstile CAPTCHA token. Returns null on success,
 * or an error string to return to the client.
 */
export async function requireCaptcha(
  token: string | undefined | null
): Promise<string | null> {
  if (!token) return "Please complete the CAPTCHA.";
  const ip = await getClientIp();
  const { success } = await verifyTurnstile(token, ip);
  if (!success) return "CAPTCHA verification failed. Please try again.";
  return null;
}
