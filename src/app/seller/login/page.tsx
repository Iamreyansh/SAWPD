import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/seller-auth";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Log in",
  description: "Log in to manage your shop on SAWPD.",
};

export default async function SellerLoginPage() {
  const seller = await getCurrentSeller();
  if (seller) redirect("/dashboard");
  return (
    <div className="min-h-screen bg-bone">
      <header className="border-b border-ink/[0.06] bg-bone/95 backdrop-blur-md">
        <div className="container-editorial flex h-16 items-center justify-between">
          <Logo invert />
          <Link
            href="/seller/signup"
            className="text-[13.5px] font-semibold text-ink/65 transition-colors hover:text-ink"
          >
            New here? Create an account →
          </Link>
        </div>
      </header>
      <main className="container-editorial pb-24 pt-12 md:pb-32 md:pt-20">
        <div className="mx-auto max-w-md">
          <p className="eyebrow mb-3">Welcome back</p>
          <h1 className="display-l text-ink text-balance">
            Log in. <span className="text-ink/30">Run your shop.</span>
          </h1>
          <p className="mt-4 text-[15px] text-ink/60">
            Pick up where you left off — orders, products, promotions, returns.
          </p>
          <div className="mt-10">
            <LoginForm />
          </div>
          <div className="mt-8 rounded-2xl border border-ink/10 bg-bone p-6 text-center">
            <p className="text-[14px] text-ink/60">
              Don&apos;t have an account yet?
            </p>
            <Link
              href="/seller/signup"
              className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-ink/15 bg-bone px-6 text-[14px] font-semibold text-ink transition-all hover:bg-ink/[0.04] active:scale-[0.98]"
            >
              Create an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
