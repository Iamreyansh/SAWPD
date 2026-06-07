"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(fd);
      if (result && "ok" in result && !result.ok) {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Password
        </span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
        />
      </label>
      {error && (
        <p className="rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-3 text-[13px] text-vermillion">
          {error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        variant="vermillion"
        className="w-full"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
