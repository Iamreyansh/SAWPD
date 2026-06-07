"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <main className="container-editorial flex min-h-[80vh] flex-col items-start justify-center py-20">
      <p className="eyebrow mb-6 text-vermillion">Something went wrong</p>
      <h1 className="display-l text-ink text-balance">
        We hit a snag.
      </h1>
      <p className="mt-6 max-w-md text-[15px] text-ink/60">
        The page crashed before it could load. You can try again, or head back
        to safety.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[12px] text-ink/40">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-10 flex flex-wrap gap-3">
        <Button onClick={reset} size="default" variant="default">
          Try again
        </Button>
        <Button asChild size="default" variant="ghost">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
