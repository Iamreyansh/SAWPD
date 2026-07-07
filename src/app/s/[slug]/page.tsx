import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { getStore } from "@/lib/store";
import { listLiveProductsForStore } from "@/lib/products";
import { isStoreOpen } from "@/lib/trial";
import { listStoreSlugs } from "@/lib/stores";
import { getStoreFooterStats } from "@/lib/orders";
import { listSlotsForStore } from "@/lib/service-slots";
import { Hero } from "@/components/storefront/hero";
import { StorefrontHeader } from "@/components/storefront/header";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyStorefront } from "@/components/storefront/empty-state";
import { StorefrontFooter } from "@/components/storefront/footer";
import { CartSheet } from "@/components/storefront/cart-sheet";
import { ProductDetailSheet } from "@/components/storefront/product-detail-sheet";
import { ThemeProvider } from "@/components/storefront/theme-provider";
import { THEMES, DEFAULT_THEME, isThemeId } from "@/lib/themes";
import type { Product } from "@/types/storefront";
import type { SellerStore } from "@/types/seller";
import { buildInstagramUrl } from "@/lib/utils";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await listStoreSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Not found" };
  return {
    title: `${store.name} — Shop on SAWPD`,
    description: store.heroSub,
  };
}

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { slug } = await params;
  const { theme: previewTheme } = await searchParams;
  const store = (await getStore(slug)) as SellerStore | null;
  if (!store) notFound();

  const products = (await listLiveProductsForStore(slug)) as Product[];
  const isOpen = isStoreOpen(store);
  const stats = await getStoreFooterStats(slug);

  // Pre-load service slots for any service products so the detail
  // sheet can render the slot picker without an extra fetch.
  const serviceProducts = products.filter((p) => p.kind === "service");
  const serviceSlots: Record<string, Awaited<ReturnType<typeof listSlotsForStore>>> = {};
  if (serviceProducts.length > 0) {
    const allSlots = await listSlotsForStore(slug, {
      from: new Date(),
    });
    for (const slot of allSlots) {
      (serviceSlots[slot.productId] ??= []).push(slot);
    }
  }

  if (!isOpen) {
    return (
      <div className="flex min-h-screen flex-col">
        <StorefrontHeader store={store} />
        <main className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
          <div className="mx-auto max-w-md">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-vermillion/10">
              <svg className="h-7 w-7 text-vermillion" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 className="display-m text-ink">Shop paused</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/60">
              This shop is temporarily closed. The seller is renewing their plan
              or making updates.
            </p>
            {buildInstagramUrl(store.ownerHandle) && (
              <Link
                href={buildInstagramUrl(store.ownerHandle)!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-bone transition-colors hover:bg-ink/90"
              >
                DM on Instagram
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </Link>
            )}
          </div>
        </main>
        <StorefrontFooter store={store} stats={stats} />
      </div>
    );
  }
  // Resolve the active theme + overrides for this store.
// If the URL has `?theme=<id>`, use that for the live preview — this
// lets the seller preview a theme on the real storefront without
// saving it first. (Validation is strict; unknown ids fall through
// to the saved theme.)
const previewId = isThemeId(previewTheme) ? previewTheme : null;
const themeId = previewId ?? (isThemeId(store.themeId) ? store.themeId : DEFAULT_THEME);
const theme = THEMES[themeId];

  return (
    <ThemeProvider
      themeId={themeId}
      overrides={store.themeOverrides ?? null}
    >
      {previewId && (
        <div className="bg-ink text-bone">
          <div className="container-editorial flex flex-wrap items-center justify-between gap-3 py-2 text-[12px]">
            <span>
              Previewing{" "}
              <strong>{THEMES[previewId].name}</strong> — this is a
              live preview, not your saved theme.
            </span>
            <Link
              href={`/s/${store.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-bone/30 bg-bone/10 px-3 py-1 text-[11.5px] font-semibold text-bone transition-colors hover:bg-bone/20"
            >
              Exit preview
            </Link>
          </div>
        </div>
      )}
      <div className="flex min-h-screen flex-col">
        <StorefrontHeader store={store} />
        <main className="flex-1">
          <Hero
            kicker={store.heroKicker}
            headline={store.heroHeadline}
            sub={store.heroSub}
            imageUrl={store.heroImage}
            imageAlt={store.name}
            variant={theme.heroVariant}
            imageSide={theme.heroImageSide}
          />
          {store.customOrdersEnabled && (
            <div className="container-editorial">
              <Link
                href={`/s/${store.slug}/custom`}
                className="mt-8 mb-2 flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 transition-colors"
                style={{
                  borderColor: "var(--theme-primary)",
                  backgroundColor: "var(--theme-accent-bg)",
                  color: "var(--theme-ink)",
                }}
              >
                <div className="flex items-center gap-3">
                  <Sparkles style={{ color: "var(--theme-primary)" }} className="h-4 w-4" />
                  <div>
                    <p
                      className="text-[13.5px] font-semibold"
                      style={{ color: "var(--theme-ink)" }}
                    >
                      Custom orders open
                    </p>
                    <p
                      className="text-[11.5px]"
                      style={{ color: "var(--theme-muted)" }}
                    >
                      Need something special? Place a custom request.
                    </p>
                  </div>
                </div>
                <ArrowRight style={{ color: "var(--theme-primary)" }} className="h-4 w-4" />
              </Link>
            </div>
          )}
          {products.length === 0 ? (
            <EmptyStorefront store={store} />
          ) : (
            <Suspense>
              <ProductGrid products={products} density={theme.cardDensity} />
            </Suspense>
          )}
        </main>
        <StorefrontFooter store={store} stats={stats} />
        <CartSheet products={products} storeSlug={store.slug} />
        <ProductDetailSheet
          products={products}
          serviceSlots={serviceSlots}
        />
      </div>
    </ThemeProvider>
  );
}
