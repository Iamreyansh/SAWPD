import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/seller-auth";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Create your seller account — SAWPD",
  description:
    "Sign up to open a shop on SAWPD. We'll guide you through the application.",
};

export default async function SellerSignupPage() {
  const seller = await getCurrentSeller();
  if (seller) redirect("/dashboard");
  return (
    <div className="min-h-screen bg-bone">
      <header className="border-b border-ink/[0.06] bg-bone/95 backdrop-blur-md">
        <div className="container-editorial flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-bone font-bold tracking-tight text-sm">
              S
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
              SAWPD
            </span>
          </Link>
          <Link
            href="/seller/login"
            className="text-[13.5px] font-semibold text-ink/65 transition-colors hover:text-ink"
          >
            Already have an account? Log in →
          </Link>
        </div>
      </header>
      <main className="container-editorial pb-24 pt-12 md:pb-32 md:pt-20">
        <div className="mx-auto max-w-md">
          <p className="eyebrow mb-3">Create your account</p>
          <h1 className="display-l text-ink text-balance">
            Open a shop. <span className="text-ink/30">Tell us your email.</span>
          </h1>
          <p className="mt-4 text-[15px] text-ink/60">
            One account, one or many shops. You can re-apply for additional
            shops later from the dashboard.
          </p>
          <div className="mt-10">
            <SignupForm />
          </div>
          <p className="mt-6 text-[12.5px] text-ink/50">
            By signing up you agree to our terms. We hand-review every shop and
            most decisions land within 24 hours.
          </p>
        </div>
      </main>
    </div>
  );
}
