import Link from "next/link";
import { requireSeller } from "@/lib/seller-auth";
import { getActiveStoreForSeller } from "@/lib/store";
import { listProductsForStore } from "@/lib/products";
import { ProductsClient } from "@/components/dashboard/products-client";

export const metadata = { title: "Dashboard · Products" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const seller = await requireSeller();
  const store = await getActiveStoreForSeller(seller.id);
  if (!store) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-ink/15 p-12 text-center">
        <h1 className="display-m text-ink">No shop selected.</h1>
        <p className="mt-3 text-[14px] text-ink/65">
          Apply for a shop to start selling.
        </p>
        <Link
          href="/apply"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-vermillion px-5 text-[12.5px] font-semibold text-bone hover:bg-vermillion-deep"
        >
          Apply now →
        </Link>
      </div>
    );
  }
  const products = await listProductsForStore(store.slug);
  return <ProductsClient storeSlug={store.slug} products={products} />;
}
