"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error so we can see it in the browser console —
    // the digest is the only thing shown on screen for privacy.
    // eslint-disable-next-line no-console
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl py-20">
      <p className="eyebrow mb-6 text-vermillion">Dashboard hiccup</p>
      <h1 className="display-m text-ink text-balance">
        That didn&apos;t load.
      </h1>
      <p className="mt-4 max-w-md text-[14.5px] text-ink/60">
        A panel failed to render. Try again, or come back later.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[12px] text-ink/40">
          ref: {error.digest}
        </p>
      )}
      {error.message && process.env.NODE_ENV !== "production" && (
        <pre className="mt-3 max-w-2xl overflow-x-auto rounded-lg border border-vermillion/20 bg-vermillion/[0.04] p-3 text-[11px] text-vermillion">
          {error.message}
        </pre>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset} size="default" variant="default">
          Try again
        </Button>
        <Button asChild size="default" variant="ghost">
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      </div>
    </main>
  );
}
