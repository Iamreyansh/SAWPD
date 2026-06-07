"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const items = [
  "A real, active Instagram account with a clear niche.",
  "You're already selling — or about to launch your first collection.",
  "You can fulfill the orders you receive, on time.",
  "The account is yours, not a brand impersonation.",
];

export function WhatWeVerify() {
  return (
    <section className="container-editorial py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12"
      >
        <div className="md:col-span-5">
          <p className="eyebrow mb-3">What we verify</p>
          <h2 className="display-m text-ink text-balance">
            We approve by hand.
            <br />
            <span className="text-ink/30">Every shop, every time.</span>
          </h2>
          <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-ink/60">
            We&apos;re a curated platform, not a marketplace. Every
            application is reviewed by a person within 24 hours. Here&apos;s
            what we look for:
          </p>
        </div>
        <ul className="md:col-span-7 space-y-3">
          {items.map((text, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: 8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex items-start gap-3 rounded-xl border border-ink/10 bg-bone p-4"
            >
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink text-bone">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-[14.5px] leading-relaxed text-ink">{text}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
