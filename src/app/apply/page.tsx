import Link from "next/link";
import { getCurrentSeller } from "@/lib/seller-auth";
import { ApplyForm } from "./apply-form";

export const metadata = {
  title: "Apply for access — SAWPD",
  description:
    "Apply to sell on SAWPD. We hand-review every shop and most decisions land within 24 hours.",
};

export default async function ApplyPage() {
  const seller = await getCurrentSeller();
  return (
    <div>
      {seller ? (
        <SignedInBanner email={seller.email} />
      ) : (
        <SignedOutBanner />
      )}
      <ApplyForm signedIn={Boolean(seller)} />
    </div>
  );
}

function SignedInBanner({ email }: { email: string }) {
  return (
    <div className="border-b border-ink/[0.06] bg-bone">
      <div className="container-editorial flex flex-wrap items-center justify-between gap-3 py-3 text-[12.5px]">
        <p className="text-ink/65">
          Applying as <span className="font-semibold text-ink">{email}</span> — your
          shop will be linked to this account.
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

function SignedOutBanner() {
  return (
    <div className="border-b border-ink/[0.06] bg-vermillion/5">
      <div className="container-editorial flex flex-wrap items-center justify-between gap-3 py-3 text-[12.5px]">
        <p className="text-ink/75">
          <span className="font-semibold text-ink">Heads up:</span> create a free
          seller account first so we can link this application to your dashboard.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/seller/signup"
            className="font-semibold text-vermillion hover:underline"
          >
            Create account →
          </Link>
          <Link
            href="/seller/login"
            className="text-ink/55 hover:text-ink hover:underline"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
