import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { listStoreSummaries } from "@/lib/stores";

export async function FeaturedShops() {
  const summaries = await listStoreSummaries();
  const shops = summaries.filter((s) => s.productCount > 0);

  if (shops.length === 0) return null;

  return (
    <section id="shops" className="container-editorial py-24 md:py-32">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14">
        <div className="max-w-xl">
          <p className="eyebrow mb-3">Browse live shops</p>
          <h2 className="display-l text-ink text-balance">
            Real shops. <span className="text-ink/30">Real orders.</span>
          </h2>
          <p className="mt-4 text-[15px] text-ink/60">
            Open a shop. Add it to your cart. Pay via UPI like a real customer.
          </p>
        </div>
        <Link
          href="/shops"
          className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-ink/65 transition-colors hover:text-ink"
        >
          See all shops
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </Link>
      </div>

      <div className="-mx-5 md:-mx-10">
        <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 md:px-10 md:gap-6">
          {shops.map((s) => (
            <Link
              key={s.store.slug}
              href={`/s/${s.store.slug}`}
              className="group flex w-[78vw] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-ink/10 bg-bone transition-all hover:border-ink/25 hover:shadow-[0_18px_50px_-20px_rgba(17,17,17,0.18)] sm:w-[360px]"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink/[0.04]">
                <Image
                  src={s.store.heroImage}
                  alt={s.store.name}
                  fill
                  sizes="(min-width: 640px) 360px, 78vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/40 to-transparent" />
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
                  <span className="text-[12.5px] text-ink/50">
                    {s.productCount} pieces
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-ink/55">
                  {s.store.heroKicker} · {s.store.ownerHandle}
                </p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-[12.5px] font-semibold text-ink/65">
                    {s.orderCount} order{s.orderCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-vermillion transition-transform group-hover:translate-x-0.5">
                    Visit shop
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
