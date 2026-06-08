import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { listLiveProductsForStore } from "@/lib/products";
import { isStoreOpen } from "@/lib/trial";
import { listStoreSlugs } from "@/lib/stores";
import { listOrders } from "@/lib/orders";
import { Hero } from "@/components/storefront/hero";
import { StorefrontHeader } from "@/components/storefront/header";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyStorefront } from "@/components/storefront/empty-state";
import { StorefrontFooter } from "@/components/storefront/footer";
import { CartSheet } from "@/components/storefront/cart-sheet";
import { ProductDetailSheet } from "@/components/storefront/product-detail-sheet";
import type { Product } from "@/types/storefront";
import type { SellerStore } from "@/types/seller";

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
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const store = (await getStore(slug)) as SellerStore | null;
  if (!store) notFound();

  const products = (await listLiveProductsForStore(slug)) as Product[];
  const orders = await listOrders(slug);
  const isOpen = isStoreOpen(store);

  return (
    <>
      <StorefrontHeader store={store} />
      {!isOpen && (
        <div className="border-b border-vermillion/20 bg-vermillion/[0.04]">
          <div className="container-editorial flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[12.5px] text-ink md:px-10">
            <p>
              <span className="font-semibold text-vermillion">Shop paused.</span>{" "}
              New orders are temporarily off while the seller renews their plan.
            </p>
            <Link
              href={`https://instagram.com/${store.ownerHandle.replace("@", "")}`}
              className="font-semibold text-vermillion underline underline-offset-4 hover:opacity-80"
            >
              DM on Instagram instead →
            </Link>
          </div>
        </div>
      )}
      <main>
        <Hero
          kicker={store.heroKicker}
          headline={store.heroHeadline}
          sub={store.heroSub}
          imageUrl={store.heroImage}
          imageAlt={store.name}
        />
        {products.length === 0 ? (
          <EmptyStorefront store={store} />
        ) : (
          <Suspense>
            <ProductGrid products={products} />
          </Suspense>
        )}
      </main>
      <StorefrontFooter store={store} orders={orders} />
      {isOpen && <CartSheet products={products} storeSlug={store.slug} />}
      <ProductDetailSheet products={products} />
    </>
  );
}
