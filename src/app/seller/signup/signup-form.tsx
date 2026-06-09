"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sellerSignupAction,
  type SellerAuthResult,
} from "@/app/seller/actions";

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    const input = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
    startTransition(async () => {
      try {
        const result: SellerAuthResult = await sellerSignupAction(input);
        if (result.ok) {
          router.push("/apply");
          router.refresh();
        } else {
          setError(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        }
      } catch {
        setError("Network error. Please check your connection and try again.");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Email
        </span>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        {fieldErrors.email && (
          <span className="mt-1.5 block text-[12px] text-vermillion">
            {fieldErrors.email}
          </span>
        )}
      </label>
      <label className="block">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Password
        </span>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="8+ chars, 1 cap, 2 digits, 1 symbol"
        />
        {fieldErrors.password && (
          <span className="mt-1.5 block text-[12px] text-vermillion">
            {fieldErrors.password}
          </span>
        )}
        <span className="mt-1.5 block text-[12px] text-ink/45">
          We hash this with bcrypt before storing. You can reset from the login page later.
        </span>
      </label>
      {error && (
        <p className="rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-3 text-[13.5px] text-vermillion">
          {error}
        </p>
      )}
      <Button
        type="submit"
        size="default"
        variant="vermillion"
        disabled={pending}
        className="w-full"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : null}
        Create account
      </Button>
    </form>
  );
}
