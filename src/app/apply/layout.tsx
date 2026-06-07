import Link from "next/link";

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-bone/85 backdrop-blur-md">
        <div className="container-editorial flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-bone font-bold text-sm">
              IS
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
              SAWPD
            </span>
          </Link>
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
