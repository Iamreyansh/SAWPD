import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Hourglass } from "lucide-react";
import { listStoreSummaries } from "@/lib/stores";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Live shops — SAWPD",
  description:
    "Browse Instagram creators selling on SAWPD. Pay via UPI, get it shipped.",
};

export const dynamic = "force-dynamic";

export default async function ShopsPage() {
  const summaries = await listStoreSummaries();
  const live = summaries.filter((s) => s.productCount > 0);
  const comingSoon = summaries.filter((s) => s.productCount === 0);

  return (
    <div className="min-h-screen bg-bone">
      <header className="border-b border-ink/[0.06] bg-bone/95 backdrop-blur-md">
        <div className="container-editorial flex h-16 items-center justify-between">
          <Logo invert />
          <Link
            href="/apply"
            className="inline-flex h-10 items-center justify-center rounded-full bg-vermillion px-5 text-[13.5px] font-semibold text-bone transition-all hover:bg-vermillion-deep active:scale-[0.98] shadow-glow"
          >
            Open a shop
          </Link>
        </div>
      </header>

      <main className="container-editorial pb-24 pt-12 md:pb-32 md:pt-20">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3">Live shops</p>
          <h1 className="display-l text-ink text-balance">
            Browse shops. <span className="text-ink/30">Pay via UPI.</span>
          </h1>
          <p className="mt-4 text-[15px] text-ink/60">
            Real creators, real products, real orders. Open any shop, add a
            piece to cart, and pay with UPI.
          </p>
        </div>

        {live.length > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((s) => (
              <Link
                key={s.store.slug}
                href={`/s/${s.store.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-bone transition-all hover:border-ink/25 hover:shadow-[0_18px_50px_-20px_rgba(17,17,17,0.18)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink/[0.04]">
                  <Image
                    src={s.store.heroImage}
                    alt={s.store.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-bone/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink">
                    <span
                      className={
                        "h-1.5 w-1.5 rounded-full " +
                        (s.open ? "bg-vermillion" : "bg-ink/40")
                      }
                    />
                    {s.open ? "Open" : "Paused"}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[18px] font-bold tracking-[-0.02em] text-ink">
                      {s.store.name}
                    </p>
                    <span className="text-[12.5px] text-ink/50 tabular-nums">
                      {s.productCount} pieces
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink/55">
                    {s.store.heroKicker} · {s.store.ownerHandle}
                  </p>
                  <p className="mt-3 text-[12.5px] text-ink/60">
                    {s.orderCount} order{s.orderCount === 1 ? "" : "s"} to date
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-vermillion transition-transform group-hover:translate-x-0.5">
                    Visit shop
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {comingSoon.length > 0 && (
          <div className="mt-12">
            <div className="mb-5 flex items-center gap-3">
              <span className="hairline flex-1" />
              <p className="eyebrow-ink">Coming soon</p>
              <span className="hairline flex-1" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {comingSoon.map((s) => (
                <div
                  key={s.store.slug}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-dashed border-ink/15 bg-bone/60"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink/[0.04]">
                    <Image
                      src={s.store.heroImage}
                      alt={s.store.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover opacity-50 grayscale"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-bone/40">
                      <div className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-bone">
                        <Hourglass className="h-3 w-3" strokeWidth={2.25} />
                        Coming soon
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[18px] font-bold tracking-[-0.02em] text-ink">
                        {s.store.name}
                      </p>
                      <span className="text-[12.5px] text-ink/40 tabular-nums">
                        —
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink/45">
                      {s.store.heroKicker} · {s.store.ownerHandle}
                    </p>
                    <p className="mt-3 text-[12.5px] text-ink/50">
                      Setting up shop. Follow them on Instagram for first drops.
                    </p>
                    <a
                      href={`https://instagram.com/${s.store.ownerHandle.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink/55 transition-colors hover:text-ink"
                    >
                      Follow {s.store.ownerHandle} on Instagram
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {live.length === 0 && comingSoon.length === 0 && (
          <div className="mt-16 rounded-2xl border border-dashed border-ink/15 p-12 text-center">
            <p className="text-[15px] text-ink/60">
              No live shops yet. Be the first —
              <Link
                href="/apply"
                className="ml-1 font-semibold text-vermillion hover:underline"
              >
                apply for access →
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
