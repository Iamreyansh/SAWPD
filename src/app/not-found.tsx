import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-editorial flex min-h-[80vh] flex-col items-start justify-center py-20">
      <p className="eyebrow mb-6">404</p>
      <h1 className="display-l text-ink text-balance">
        Nothing here,
        <br />
        <span className="text-ink/30">yet.</span>
      </h1>
      <p className="mt-6 max-w-md text-[15px] text-ink/60">
        The page you were looking for has moved, been renamed, or never existed.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="default" variant="default">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild size="default" variant="ghost">
          <Link href="/s/riya">Visit the demo shop</Link>
        </Button>
      </div>
    </main>
  );
}
