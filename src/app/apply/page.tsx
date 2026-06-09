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

  return (
    <div>
      {seller && hasShop && <AlreadyApprovedBanner />}
      {seller && !hasShop && <SignedInBanner />}
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

function AlreadyApprovedBanner() {
  return (
    <div className="border-b border-vermillion/20 bg-vermillion/[0.04]">
      <div className="container-editorial flex flex-wrap items-center justify-between gap-3 py-3 text-[12.5px]">
        <p className="text-ink/70">
          <span className="font-semibold text-vermillion">Your shop is already live!</span>{" "}
          You can manage it from the dashboard.
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
