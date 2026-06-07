"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 60], [0.6, 0.92]);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => setScrolled(v > 8));
    return () => unsub();
  }, [scrollY]);

  return (
    <motion.header
      style={{ backgroundColor: useTransform(bgOpacity, (o) => `rgba(250,249,247,${o})`) }}
      className={cn(
        "sticky top-0 z-50 backdrop-blur-md transition-shadow",
        scrolled && "shadow-[0_1px_0_0_rgba(17,17,17,0.06)]"
      )}
    >
      <div className="container-editorial flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-bone font-bold tracking-tight text-sm">
            S
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
            SAWPD
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-ink/70 md:flex">
          <a href="#how" className="transition-colors hover:text-ink">How it works</a>
          <a href="#pricing" className="transition-colors hover:text-ink">Pricing</a>
          <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
          <Link href="/s/riya" className="transition-colors hover:text-ink">Demo shop →</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/apply"
            className="inline-flex h-10 items-center justify-center rounded-full bg-vermillion px-5 text-[13.5px] font-semibold text-bone transition-all hover:bg-vermillion-deep active:scale-[0.98] shadow-glow"
          >
            Apply
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
