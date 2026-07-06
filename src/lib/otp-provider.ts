/**
 * OTP provider abstraction. Plug any of:
 *   - ConsoleOtpProvider (default, dev)
 *   - EmailOtpProvider     (uses lib/notify.ts → Resend)
 *   - Fast2SmsProvider     (Indian SMS gateway)
 *   - TwilioWhatsAppProvider (Twilio WhatsApp API)
 *
 * Pick one via the `OTP_PROVIDER` env var:
 *   OTP_PROVIDER=console   (default — logs OTP, surfaces it in dev UI)
 *   OTP_PROVIDER=email
 *   OTP_PROVIDER=fast2sms
 *   OTP_PROVIDER=twilio
 *
 * Required env vars per provider (see .env.example).
 */

import "server-only";
import { notifyOrderPlaced } from "@/lib/notify";

export type SendOtpParams = {
  phone: string;
  code: string;
  expiresInMinutes: number;
};

export type SendOtpResult = { ok: boolean; providerId?: string; error?: string };

export interface OtpProvider {
  readonly id: string;
  send(params: SendOtpParams): Promise<SendOtpResult>;
}

// ─── Console (default for dev) ─────────────────────────────────────

class ConsoleOtpProvider implements OtpProvider {
  readonly id = "console";
  async send({ phone, code, expiresInMinutes }: SendOtpParams) {
    // eslint-disable-next-line no-console
    console.log(
      `\n📱 [OTP] ${phone} → ${code} (expires in ${expiresInMinutes} min)\n`,
    );
    return { ok: true, providerId: this.id };
  }
}

// ─── Email (uses Resend via notify.ts) ─────────────────────────────

class EmailOtpProvider implements OtpProvider {
  readonly id = "email";
  async send({ phone, code, expiresInMinutes }: SendOtpParams) {
    // Reuse notifyOrderPlaced — it just sends to a recipient with subject/body.
    // In real life, look up the customer's email by phone and email them.
    // For the MVP, this is a fallback that documents the integration point.
    try {
      const adminInbox = process.env.NOTIFY_EMAIL;
      if (!adminInbox) {
        return { ok: false, error: "NOTIFY_EMAIL not set" };
      }
      await notifyOrderPlaced({
        storeName: "OTP delivery",
        storeEmail: undefined,
        orderId: `OTP-${code}`,
        customerName: phone,
        total: 0,
      });
      return { ok: true, providerId: this.id };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Email send failed",
      };
    }
  }
}

// ─── Fast2SMS (Indian SMS) ────────────────────────────────────────

class Fast2SmsProvider implements OtpProvider {
  readonly id = "fast2sms";
  async send({ phone, code, expiresInMinutes }: SendOtpParams) {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) return { ok: false, error: "FAST2SMS_API_KEY not set" };
    const digits = phone.replace(/\D/g, "");
    const message = `Your SAWPD verification code is ${code}. Valid for ${expiresInMinutes} minutes. Do not share this code.`;
    try {
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          numbers: digits,
          message,
          language: "english",
          flash: 0,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return { ok: false, error: `Fast2SMS ${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true, providerId: this.id };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Fast2SMS failed",
      };
    }
  }
}

// ─── Twilio WhatsApp ─────────────────────────────────────────────

class TwilioWhatsAppProvider implements OtpProvider {
  readonly id = "twilio";
  async send({ phone, code, expiresInMinutes }: SendOtpParams) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
    if (!accountSid || !authToken || !from) {
      return { ok: false, error: "Twilio env vars not set" };
    }
    const digits = phone.replace(/\D/g, "");
    const to = `whatsapp:+${digits}`;
    const body = `Your SAWPD verification code is *${code}*. Valid for ${expiresInMinutes} minutes. Do not share this code.`;
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const form = new URLSearchParams();
      form.set("From", from);
      form.set("To", to);
      form.set("Body", body);
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString(
        "base64",
      );
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return { ok: false, error: `Twilio ${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true, providerId: this.id };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Twilio failed",
      };
    }
  }
}

let cached: OtpProvider | null = null;

export function getOtpProvider(): OtpProvider {
  if (cached) return cached;
  const choice = (process.env.OTP_PROVIDER || "console").toLowerCase();
  switch (choice) {
    case "email":
      cached = new EmailOtpProvider();
      break;
    case "fast2sms":
      cached = new Fast2SmsProvider();
      break;
    case "twilio":
    case "twilio-whatsapp":
      cached = new TwilioWhatsAppProvider();
      break;
    case "console":
    default:
      cached = new ConsoleOtpProvider();
      break;
  }
  return cached;
}

export function activeOtpProviderId(): string {
  return getOtpProvider().id;
}