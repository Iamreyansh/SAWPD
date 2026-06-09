import Link from "next/link";
import { requireActiveStore } from "@/lib/seller-auth";
import { listPromosForStore } from "@/lib/promos";
import { PromotionsClient } from "@/components/dashboard/promotions-client";

export const metadata = {
  title: "Dashboard · Promotions",
  description: "Create and manage discount codes for your shop.",
};
export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const store = await requireActiveStore();
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
  const promos = await listPromosForStore(store.slug);
  return <PromotionsClient storeSlug={store.slug} promos={promos} />;
}
