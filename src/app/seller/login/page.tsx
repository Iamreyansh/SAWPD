import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSeller } from "@/lib/seller-auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Log in — SAWPD",
  description: "Log in to manage your shop on SAWPD.",
};

export default async function SellerLoginPage() {
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
        </div>
      </main>
    </div>
  );
}
