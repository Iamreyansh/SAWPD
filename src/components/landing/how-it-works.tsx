"use client";

import { motion } from "framer-motion";
import { ClipboardList, Upload, Send } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Apply in 5 minutes",
    body: "Tell us about your shop, your sales, and your Instagram. We approve within 24 hours.",
  },
  {
    n: "02",
    icon: Upload,
    title: "Add your pieces",
    body: "Upload photos, prices, stock. Edit anytime. Each piece takes about 10 minutes to add.",
  },
  {
    n: "03",
    icon: Send,
    title: "Share your link",
    body: "Drop your shop link in your bio. Customers pay via UPI, send a screenshot, you confirm and ship.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="container-editorial py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-12 max-w-2xl md:mb-16"
      >
        <p className="eyebrow mb-3">How it works</p>
        <h2 className="display-l text-ink text-balance">
          Three steps. <span className="text-ink/30">One afternoon.</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-ink/10 bg-bone p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/40 tabular-nums">
                  {s.n}
                </span>
                <Icon className="h-5 w-5 text-vermillion" strokeWidth={1.75} />
              </div>
              <h3 className="mt-8 text-[20px] font-semibold tracking-[-0.02em] text-ink">
                {s.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink/60">
                {s.body}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
