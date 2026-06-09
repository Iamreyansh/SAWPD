"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { Store } from "@/types/storefront";

export type StoreStats = {
  weekCount: number;
  totalCount: number;
  customerCount: number;
} | null;

export function StorefrontFooter({
  store,
  stats,
}: {
  store: Store;
  stats?: StoreStats;
}) {
  return (
    <footer className="border-t border-ink/[0.06] bg-bone">
      {stats && (
        <div className="border-b border-ink/[0.06] bg-ink/[0.02]">
          <div className="container-editorial flex flex-wrap items-center justify-between gap-3 py-3 text-[12.5px] text-ink/65">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-vermillion" strokeWidth={2.25} />
              <span className="font-semibold text-ink/80">
                {stats.weekCount} piece{stats.weekCount === 1 ? "" : "s"} sold
              </span>{" "}
              in the last 7 days
            </span>
            <span className="text-ink/45">
              {stats.totalCount} sold to date · {stats.customerCount} customer
              {stats.customerCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}
      <div className="container-editorial py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-start gap-10 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-md">
            <p className="display-m text-ink text-balance">
              That&apos;s the whole shop.
            </p>
            <p className="mt-3 text-[14px] text-ink/55">
              Run by {store.name} · Powered by SAWPD
            </p>
          </div>
          <a
            href={`https://instagram.com/${store.ownerHandle.replace("@", "")}`}
            className="text-[15px] font-semibold text-vermillion underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Follow on Instagram →
          </a>
        </motion.div>
        <div className="mt-12 flex flex-col gap-2 text-[12px] text-ink/40 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
          <p>Made with SAWPD</p>
        </div>
      </div>
    </footer>
  );
}
