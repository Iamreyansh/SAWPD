"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function FinalCta() {
  return (
    <section className="container-editorial py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl bg-ink px-8 py-20 text-center text-bone md:px-16 md:py-28"
      >
        <p className="eyebrow mb-5 text-vermillion">Ready when you are</p>
        <h2 className="display-l text-bone max-w-3xl mx-auto text-balance">
          Apply in 5 minutes.
          <br />
          <span className="text-bone/40">Start selling today.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[15px] text-bone/60">
          We review every application by hand. You&apos;ll hear back within 24
          hours.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/apply"
            className="inline-flex h-14 items-center justify-center rounded-full bg-vermillion px-8 text-[15px] font-semibold text-bone transition-all hover:bg-vermillion/90 active:scale-[0.98]"
          >
            Apply for access
          </Link>
          <Link
            href="/s/riya"
            className="inline-flex h-14 items-center justify-center rounded-full border border-bone/20 px-8 text-[15px] font-semibold text-bone transition-all hover:bg-bone/5 active:scale-[0.98]"
          >
            See a live shop →
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
