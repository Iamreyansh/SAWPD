"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminError({
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
      <p className="eyebrow mb-6 text-vermillion">Admin hiccup</p>
      <h1 className="display-m text-ink text-balance">
        That page didn&apos;t load.
      </h1>
      <p className="mt-4 max-w-md text-[14.5px] text-ink/60">
        Try again, or head back to the overview.
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
          <Link href="/admin">Back to admin</Link>
        </Button>
      </div>
    </main>
  );
}
