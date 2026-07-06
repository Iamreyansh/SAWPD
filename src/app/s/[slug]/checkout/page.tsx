import { notFound } from "next/navigation";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { listLiveProductsForStore } from "@/lib/products";
import { listStoreSlugs } from "@/lib/stores";
import { isStoreOpen } from "@/lib/trial";
import { StorefrontHeader } from "@/components/storefront/header";
import { CheckoutClient } from "./checkout-client";

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
  if (!store) return { title: "Checkout" };
  return {
    title: `Checkout · ${store.name}`,
    description: `Complete your order and pay via UPI. UPI payments land directly in ${store.name}'s account.`,
  };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  const isOpen = isStoreOpen(store);

  if (!isOpen) {
    return (
      <div className="flex min-h-screen flex-col">
        <StorefrontHeader store={store} compactName />
        <main className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
          <div className="mx-auto max-w-md">
            <h1 className="display-m text-ink">Shop paused</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/60">
              This shop is temporarily closed. You cannot place orders right now.
            </p>
            <Link
              href={`/s/${slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-bone transition-colors hover:bg-ink/90"
            >
              Back to shop
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const upiNotConfigured =
    !store.upiId || store.upiId.trim() === "" || store.upiId === "your-upi@bank";

  if (upiNotConfigured) {
    return (
      <div className="flex min-h-screen flex-col">
        <StorefrontHeader store={store} compactName />
        <main className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
          <div className="mx-auto max-w-md">
            <h1 className="display-m text-ink">Payments not set up</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/60">
              This shop hasn&apos;t configured UPI payments yet. Please check
              back later or contact the shop owner.
            </p>
            <Link
              href={`/s/${slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-bone transition-colors hover:bg-ink/90"
            >
              Back to shop
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const products = await listLiveProductsForStore(slug);

  return (
    <>
      <StorefrontHeader store={store} compactName />
      <CheckoutClient store={store} products={products} />
    </>
  );
}
