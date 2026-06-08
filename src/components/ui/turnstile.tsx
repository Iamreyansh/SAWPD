"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";

type TurnstileWidgetProps = {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
};

export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = "light",
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Turnstile script
  useEffect(() => {
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }
    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`);
    if (existing) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Render widget when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return; // already rendered

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      "error-callback": onError,
      "expired-callback": onExpire,
      theme,
      appearance: "interaction-only",
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey, onVerify, onExpire, onError, theme]);

  return <div ref={containerRef} className={className} />;
}

/**
 * Server-side Turnstile verification.
 * Call this from server actions to validate the CAPTCHA token.
 */
export async function verifyTurnstile(
  token: string,
  ip?: string
): Promise<{ success: boolean }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // If Turnstile is not configured, skip verification (dev mode)
    console.warn("TURNSTILE_SECRET_KEY not set — CAPTCHA verification skipped");
    return { success: true };
  }

  const formData = new URLSearchParams();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    }
  );

  const data = await res.json();
  return { success: data.success === true };
}
