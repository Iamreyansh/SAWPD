import Link from "next/link";
import { getCurrentSeller } from "@/lib/seller-auth";
import { getStoresForSeller } from "@/lib/store";
import { ApplyForm } from "./apply-form";

export const metadata = {
  title: "Apply for access — SAWPD",
  description:
    "Apply to sell on SAWPD. We hand-review every shop and most decisions land within 24 hours.",
};

export default async function ApplyPage() {
  const seller = await getCurrentSeller();
  const stores = seller ? await getStoresForSeller(seller.id) : [];
  const hasShop = stores.length > 0;

  if (seller && hasShop) {
    return <AlreadyHasShopMessage storeName={stores[0].name} storeSlug={stores[0].slug} />;
  }

  return (
    <div>
      {seller && <SignedInBanner />}
      <ApplyForm signedIn={Boolean(seller)} />
    </div>
  );
}

function SignedInBanner() {
  return (
    <div className="border-b border-ink/[0.06] bg-bone">
      <div className="container-editorial flex flex-wrap items-center justify-between gap-3 py-3 text-[12.5px]">
        <p className="text-ink/65">
          Your shop will be linked to this account.
        </p>
        <Link
          href="/dashboard"
          className="font-semibold text-vermillion hover:underline"
        >
          Go to dashboard →
        </Link>
      </div>
    </div>
  );
}

function AlreadyHasShopMessage({ storeName, storeSlug }: { storeName: string; storeSlug: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="eyebrow mb-3">Shop already exists</p>
        <h1 className="display-m text-ink">You already have a shop!</h1>
        <p className="mt-3 text-[14px] text-ink/65">
          Your shop <span className="font-semibold text-ink">{storeName}</span> is
          already live. To apply for an additional shop, submit a new application
          from your dashboard.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-full bg-vermillion px-6 text-[13px] font-semibold tracking-[-0.01em] text-bone transition-colors hover:bg-vermillion-deep"
          >
            Go to dashboard →
          </Link>
          <Link
            href={`/s/${storeSlug}`}
            className="inline-flex h-11 items-center justify-center rounded-full border border-ink/15 px-6 text-[13px] font-semibold tracking-[-0.01em] text-ink transition-colors hover:bg-ink/[0.03]"
          >
            View my shop
          </Link>
        </div>
        <p className="mt-5 text-[12px] text-ink/45">
          Want to apply with a different account?{" "}
          <Link href="/seller/login" className="font-semibold text-ink/60 hover:text-ink hover:underline">
            Switch account
          </Link>
        </p>
      </div>
    </main>
  );
}
