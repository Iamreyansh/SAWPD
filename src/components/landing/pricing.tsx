"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = {
  id: "free" | "weekly" | "monthly";
  name: string;
  price: string;
  cadence: string;
  badge?: string;
  highlight?: boolean;
  cta: string;
  ctaHref: string;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    cadence: "for 14 days",
    cta: "Start free trial",
    ctaHref: "/apply",
    features: [
      "Full storefront, no card required",
      "Unlimited products",
      "UPI payments, QR included",
      "Order dashboard",
      "Cancel anytime — no questions",
    ],
  },
  {
    id: "weekly",
    name: "Pay-as-you-go",
    price: "₹499",
    cadence: "per week",
    cta: "Start free trial",
    ctaHref: "/apply",
    features: [
      "Everything in Free",
      "Cancel any week",
      "Best for new sellers testing demand",
      "Concierge onboarding",
    ],
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "₹1,499",
    cadence: "per month",
    badge: "Save 25%",
    highlight: true,
    cta: "Start free trial",
    ctaHref: "/apply",
    features: [
      "Everything in Pay-as-you-go",
      "Best value — ₹1,499 vs ~₹1,996 weekly",
      "Custom shop URL",
      "Priority support",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="container-editorial py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-12 max-w-2xl md:mb-16"
      >
        <p className="eyebrow mb-3">Pricing</p>
        <h2 className="display-l text-ink text-balance">
          Try it free. <span className="text-ink/30">Pay only when you stay.</span>
        </h2>
        <p className="mt-5 max-w-md text-[15px] text-ink/60">
          Flat subscription. You keep 100% of every order. Cancel any time.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {plans.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex flex-col rounded-2xl p-7 transition-all duration-300",
              p.highlight
                ? "border border-ink/10 bg-ink text-bone shadow-[0_18px_50px_-20px_rgba(17,17,17,0.35)] md:scale-[1.02]"
                : "border border-ink/[0.07] bg-bone shadow-[0_1px_2px_rgba(17,17,17,0.04)] hover:shadow-[0_4px_18px_-2px_rgba(17,17,17,0.08)]"
            )}
          >
            {p.badge && (
              <span
                className="absolute -top-2.5 right-6 inline-flex items-center rounded-full bg-vermillion px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-bone shadow-glow"
              >
                {p.badge}
              </span>
            )}
            <h3
              className={cn(
                "text-[12px] font-semibold uppercase tracking-[0.18em]",
                p.highlight ? "text-bone/70" : "text-ink/55"
              )}
            >
              {p.name}
            </h3>
            <div className="mt-5 flex items-baseline gap-2">
              <span
                className={cn(
                  "text-5xl font-extrabold tracking-[-0.04em]",
                  p.highlight ? "text-bone" : "text-ink"
                )}
              >
                {p.price}
              </span>
              <span
                className={cn(
                  "text-[14px]",
                  p.highlight ? "text-bone/60" : "text-ink/50"
                )}
              >
                {p.cadence}
              </span>
            </div>

            <ul className="mt-7 space-y-3">
              {p.features.map((f) => (
                <li
                  key={f}
                  className={cn(
                    "flex items-start gap-2.5 text-[13.5px]",
                    p.highlight ? "text-bone/85" : "text-ink/70"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full",
                      p.highlight ? "bg-vermillion/20" : "bg-vermillion/10"
                    )}
                  >
                    <Check
                      className="h-2.5 w-2.5 text-vermillion"
                      strokeWidth={3.5}
                    />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={p.ctaHref}
              className={cn(
                "mt-auto inline-flex h-12 items-center justify-center rounded-full text-[14px] font-semibold transition-all active:scale-[0.98]",
                p.highlight
                  ? "bg-vermillion text-bone hover:bg-vermillion-deep shadow-glow"
                  : "border border-ink/15 bg-bone text-ink hover:bg-ink/[0.04]"
              )}
            >
              {p.cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
