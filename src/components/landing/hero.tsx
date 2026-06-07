"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 md:pt-20">
      <div className="container-editorial">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-7">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease }}
              className="eyebrow mb-6 md:mb-8"
            >
              For Instagram creators
            </motion.p>

            <h1 className="display-xl text-ink max-w-3xl text-balance">
              {["Your Instagram.", "Now a checkout."].map((line, i) => (
                <span key={i} className="block overflow-hidden">
                  <motion.span
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease }}
                    className="block"
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6, ease }}
              className="mt-6 max-w-xl text-[16px] text-ink/60 md:mt-8 md:text-[17px]"
            >
              A beautiful, shareable shop that lives at the link in your bio.
              Your customers pay via UPI. You verify, you ship.
              <span className="text-ink"> Pay a flat subscription. Keep 100%.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.85, ease }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <Link
                href="/apply"
                className="inline-flex h-14 items-center justify-center rounded-full bg-vermillion px-8 text-[15px] font-semibold text-bone shadow-soft transition-all hover:bg-vermillion/90 active:scale-[0.98]"
              >
                Apply for access
              </Link>
              <Link
                href="/s/riya"
                className="inline-flex h-14 items-center justify-center rounded-full border border-ink/15 bg-transparent px-8 text-[15px] font-semibold text-ink transition-all hover:bg-ink/[0.04] active:scale-[0.98]"
              >
                See a live shop →
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-ink/50"
            >
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-vermillion" />
                14 days free · no card
              </span>
              <span className="hidden sm:inline">·</span>
              <span>From ₹499/wk after trial</span>
              <span className="hidden sm:inline">·</span>
              <span>Cancel anytime</span>
            </motion.div>
          </div>

          <div className="md:col-span-5">
            <PhoneMockup />
          </div>
        </div>
      </div>
      <StatsStrip />
    </section>
  );
}

function PhoneMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 1, delay: 0.5, ease }}
      className="relative mx-auto w-full max-w-[320px]"
    >
      <div className="absolute -left-12 -top-8 h-40 w-40 rounded-full bg-vermillion/15 blur-3xl" />
      <div className="absolute -bottom-10 -right-8 h-40 w-40 rounded-full bg-ink/[0.06] blur-3xl" />

      <div className="relative rounded-[42px] border-[10px] border-ink bg-ink p-1 shadow-[0_30px_80px_-20px_rgba(17,17,17,0.4)]">
        <div className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
        <div className="relative overflow-hidden rounded-[32px] bg-bone">
          <div className="px-5 pb-3 pt-10">
            <p className="eyebrow text-[10px]">Summer / 25</p>
            <p className="mt-2 text-[22px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
              New drops.
              <br />
              Handpicked.
            </p>
            <p className="mt-2 text-[11px] text-ink/55">
              Curated by Riya · 12 pieces
            </p>
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1551803091-e20673f15770?auto=format&fit=crop&w=800&q=80"
              alt="Pleated Trouser"
              fill
              sizes="(min-width: 768px) 320px, 80vw"
              className="object-cover"
              priority
            />
            <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-bone/95 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.15em] text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-vermillion" />
              New
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-[14px] font-semibold text-ink">Pleated Trouser</p>
              <p className="text-[12px] text-ink/55">₹1,490</p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-full bg-vermillion px-4 text-[12px] font-semibold text-bone shadow-glow"
            >
              Add
            </button>
          </div>
          <div className="mx-3 mb-4 flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-bone">
            <p className="text-[11.5px] text-bone/65">3 items · ₹3,470</p>
            <p className="text-[12px] font-semibold text-vermillion">Checkout →</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatsStrip() {
  const stats = [
    { value: "200+", label: "active shops" },
    { value: "10K+", label: "orders processed" },
    { value: "₹40L+", label: "paid to creators" },
    { value: "100%", label: "yours, every sale" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 1.0, ease }}
      className="container-editorial mt-16 md:mt-24"
    >
      <div className="rounded-2xl border border-ink/10 bg-bone/60 p-6 backdrop-blur-sm md:p-8">
        <div className="grid grid-cols-2 gap-y-6 md:grid-cols-4 md:gap-y-0">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={
                "flex flex-col items-center text-center " +
                (i > 0 ? "md:border-l md:border-ink/10" : "")
              }
            >
              <p className="text-3xl font-extrabold tracking-[-0.04em] text-ink md:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-[12px] font-medium uppercase tracking-[0.12em] text-ink/55">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
