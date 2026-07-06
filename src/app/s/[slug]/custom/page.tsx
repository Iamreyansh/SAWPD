import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getStore } from "@/lib/store";
import { listActiveTemplatesForStore } from "@/lib/custom-templates";
import { formatINR } from "@/lib/utils";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  // Custom orders are per-store opt-in; only enumerate stores with the flag.
  // Static prerender still requires at least the empty list.
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Shop Not Found" };
  return {
    title: `Custom Orders · ${store.name}`,
    description: `Place a custom order at ${store.name}.`,
  };
}

export default async function StoreCustomOrdersPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  if (!store.customOrdersEnabled) {
    return (
      <section className="container-editorial flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow mb-3">{store.name}</p>
        <h1 className="display-m text-ink">No custom orders yet</h1>
        <p className="mt-4 max-w-md text-[14px] text-ink/55">
          This shop isn&apos;t accepting custom orders right now. Check back
          later or DM them on Instagram.
        </p>
      </section>
    );
  }

  const templates = await listActiveTemplatesForStore(slug);

  return (
    <section className="container-editorial py-12 md:py-16">
      <div className="mb-10">
        <p className="eyebrow mb-2">{store.name}</p>
        <h1 className="display-l text-ink">Custom orders</h1>
        <p className="mt-3 text-[15px] text-ink/60 max-w-md">
          Pick a form below, fill in the details, and submit. The shop will
          confirm by WhatsApp.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <p className="text-[15px] text-ink/55">No custom orders open.</p>
          <p className="mt-1 text-[13px] text-ink/40">
            Check back later — new forms are added often.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/s/${slug}/custom/${t.id}`}
              className="group block rounded-2xl border border-ink/10 bg-white overflow-hidden transition-all hover:shadow-md"
            >
              {t.imageUrl && (
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={t.imageUrl}
                    alt={t.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-5 space-y-2">
                <h3 className="text-[15px] font-semibold text-ink">
                  {t.name}
                </h3>
                {t.description && (
                  <p className="text-[12.5px] text-ink/55 line-clamp-2">
                    {t.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[12px] text-ink/50">
                    From {formatINR(t.basePrice)}
                  </span>
                  <span className="text-[12.5px] font-semibold text-vermillion">
                    Order now →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}