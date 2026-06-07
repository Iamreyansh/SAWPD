"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";
import { subscribeEmail, type SubscribeResult } from "@/lib/subscribe";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-vermillion px-5 text-[13px] font-semibold text-bone transition-all hover:bg-vermillion-deep active:scale-[0.98] disabled:opacity-50 shadow-glow"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        "Subscribe"
      )}
    </button>
  );
}

export function NewsletterForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SubscribeResult | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setResult(null);
    startTransition(async () => {
      const r = await subscribeEmail(fd);
      setResult(r);
      if (r.ok) {
        e.currentTarget.reset();
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-md flex-col gap-2"
      noValidate
    >
      <div className="flex w-full items-stretch gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="you@brand.com"
          autoComplete="email"
          disabled={pending}
          className="h-10 flex-1 rounded-full border border-ink/15 bg-bone px-4 text-[13.5px] text-ink placeholder:text-ink/35 outline-none transition-colors focus:border-ink/40 disabled:opacity-50"
        />
        <SubmitButton />
      </div>
      {result?.ok && (
        <p className="flex items-center gap-1.5 text-[12px] text-ink/65">
          <Check className="h-3.5 w-3.5 text-vermillion" strokeWidth={2.5} />
          {result.already
            ? "You're already on the list. See you in your inbox."
            : "Done. We'll keep it short and useful."}
        </p>
      )}
      {result && !result.ok && (
        <p className="text-[12px] text-vermillion">{result.error}</p>
      )}
    </form>
  );
}
