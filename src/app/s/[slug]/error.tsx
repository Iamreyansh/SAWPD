"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StorefrontError({
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
    <main className="container-editorial flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="eyebrow mb-6 text-vermillion">Shop hiccup</p>
      <h1 className="display-m text-ink text-balance">
        We couldn&apos;t load this shop.
      </h1>
      <p className="mt-4 max-w-md text-[14.5px] text-ink/60">
        Try again, or head back to the edit.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
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
