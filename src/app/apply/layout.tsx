import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-bone/85 backdrop-blur-md">
        <div className="container-editorial flex h-16 items-center justify-between">
          <Logo invert />
          <Link
            href="/"
            className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-ink/50 transition-colors hover:text-ink"
          >
            ← Back
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
