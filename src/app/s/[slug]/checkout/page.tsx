import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { listLiveProductsForStore } from "@/lib/products";
import { listStoreSlugs } from "@/lib/stores";
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
    title: `Checkout · ${store.name} — SAWPD`,
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

  const products = await listLiveProductsForStore(slug);

  return (
    <>
      <StorefrontHeader store={store} compactName />
      <CheckoutClient store={store} products={products} />
    </>
  );
}
