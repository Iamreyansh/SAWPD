"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, useTransition } from "react";
import { LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { sellerLogoutAction } from "@/app/seller/actions";
import { Logo } from "@/components/ui/logo";

export type HeaderSeller = {
  email: string;
};

export function MarketingHeader({ seller }: { seller?: HeaderSeller | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 60], [0.6, 0.92]);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => setScrolled(v > 8));
    return () => unsub();
  }, [scrollY]);

  function handleLogout() {
    startTransition(async () => {
      await sellerLogoutAction();
    });
  }

  return (
    <motion.header
      style={{ backgroundColor: useTransform(bgOpacity, (o) => `rgba(250,249,247,${o})`) }}
      className={cn(
        "sticky top-0 z-50 backdrop-blur-md transition-shadow",
        scrolled && "shadow-[0_1px_0_0_rgba(17,17,17,0.06)]"
      )}
    >
      <div className="container-editorial flex h-16 items-center justify-between">
        <Logo invert />
        <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-ink/70 md:flex">
          <a href="#how" className="transition-colors hover:text-ink">How it works</a>
          <a href="#pricing" className="transition-colors hover:text-ink">Pricing</a>
          <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
          <Link href="/s/riya" className="transition-colors hover:text-ink">Demo shop →</Link>
        </nav>
        <div className="flex items-center gap-2">
          {seller ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-ink/10 bg-bone px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/20"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-bone text-[11px] font-bold">
                  {seller.email.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{seller.email}</span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-ink/10 bg-bone py-1.5 shadow-float">
                    <div className="border-b border-ink/[0.06] px-4 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-ink/45">Signed in as</p>
                      <p className="mt-0.5 truncate text-[13px] font-medium text-ink">{seller.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] text-ink/70 transition-colors hover:bg-ink/[0.03] hover:text-ink"
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={pending}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13.5px] text-ink/70 transition-colors hover:bg-ink/[0.03] hover:text-ink"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={2} />
                      {pending ? "Logging out…" : "Log out"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/seller/login"
                className="hidden h-10 items-center justify-center rounded-full px-4 text-[13.5px] font-semibold text-ink/65 transition-colors hover:text-ink sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/apply"
                className="inline-flex h-10 items-center justify-center rounded-full bg-vermillion px-5 text-[13.5px] font-semibold text-bone transition-all hover:bg-vermillion-deep active:scale-[0.98] shadow-glow"
              >
                Apply
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
