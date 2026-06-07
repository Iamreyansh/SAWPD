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
    console.error(error);
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
