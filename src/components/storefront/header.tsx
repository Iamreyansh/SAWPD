"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import type { Store } from "@/types/storefront";
import { CartTrigger } from "./cart-trigger";

export function StorefrontHeader({ store, compactName = false }: { store: Store; compactName?: boolean }) {
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 60], [0.6, 0.85]);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => {
      setHidden(v > 280 && !compactName);
    });
    return () => unsub();
  }, [scrollY, compactName]);

  const initials = store.name.slice(0, 1).toUpperCase();

  return (
    <motion.header
      style={{ backgroundColor: useTransform(bgOpacity, (o) => `rgba(245,242,236,${o})`) }}
      className="sticky top-0 z-40 backdrop-blur-md transition-colors"
    >
      <div className="container-editorial flex h-16 items-center justify-between">
        <Link href={`/s/${store.slug}`} className="group flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-bone font-bold tracking-tight">
            {initials}
          </span>
          <motion.span
            animate={{ opacity: hidden ? 0 : 1, width: hidden ? 0 : "auto" }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden whitespace-nowrap text-[15px] font-semibold tracking-[-0.02em] text-ink"
          >
            {store.name}
          </motion.span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-ink/50 sm:inline truncate max-w-[120px]">{store.ownerHandle}</span>
          <CartTrigger />
        </div>
      </div>
      <div className="h-px w-full bg-ink/[0.06]" />
    </motion.header>
  );
}
