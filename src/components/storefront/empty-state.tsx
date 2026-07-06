"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Store } from "@/types/storefront";
import { buildInstagramUrl } from "@/lib/utils";

export function EmptyStorefront({ store }: { store: Store }) {
  const igUrl = buildInstagramUrl(store.ownerHandle);
  return (
    <section className="container-editorial flex min-h-[60vh] flex-col items-start justify-center py-20">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="eyebrow mb-6"
      >
        {store.heroKicker}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="display-xl text-ink text-balance"
      >
        Nothing here,
        <br />
        <span className="text-ink/30">yet.</span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-8 max-w-md text-[15px] text-ink/60"
      >
        The new collection is being shot. In the meantime, DM{" "}
        <span className="font-semibold text-ink">{store.ownerHandle}</span> to
        order directly — they read every message.
      </motion.p>
      {igUrl && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10"
        >
          <Link
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[15px] font-semibold text-vermillion underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            DM on Instagram →
          </Link>
        </motion.div>
      )}
    </section>
  );
}
