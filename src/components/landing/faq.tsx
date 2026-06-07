"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Do I need a website to use SAWPD?",
    a: "No. SAWPD is your website. You get a clean, fast shop at sawpd.shop/s/your-handle. Share that link in your Instagram bio and you're live.",
  },
  {
    q: "How do my customers pay?",
    a: "They pay via UPI directly to your UPI ID. We show them your QR code and your handle. They send a screenshot of the payment and you confirm the order from your dashboard. No middleman.",
  },
  {
    q: "What does SAWPD charge on top of my subscription?",
    a: "Nothing. You keep 100% of every sale. We never touch the money — it goes from your customer to your UPI to your bank.",
  },
  {
    q: "What gets my application rejected?",
    a: "Fake accounts, zero sales history with no plan to start, unclear or stolen product photos, or duplicate applications. If you sell something real and have an actual Instagram presence, you're in.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes, on the monthly plan. Point your domain (e.g. shop.yourbrand.com) to your SAWPD URL and we'll handle the SSL.",
  },
  {
    q: "What happens if a customer pays and I don't ship?",
    a: "That's on you. We don't mediate refunds — your reputation and your call. Most sellers resolve disputes in DMs within a day.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="container-editorial py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-12 max-w-2xl"
      >
        <p className="eyebrow mb-3">FAQ</p>
        <h2 className="display-l text-ink text-balance">
          Common questions. <span className="text-ink/30">Honest answers.</span>
        </h2>
      </motion.div>

      <div className="max-w-3xl">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className={cn(
                "border-b border-ink/10",
                i === 0 && "border-t"
              )}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-ink"
                aria-expanded={isOpen}
              >
                <span className="text-[15.5px] font-semibold text-ink">
                  {f.q}
                </span>
                <Plus
                  className={cn(
                    "h-5 w-5 flex-shrink-0 text-ink/50 transition-transform duration-300",
                    isOpen && "rotate-45 text-ink"
                  )}
                  strokeWidth={1.75}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-6 pr-10 text-[14.5px] leading-relaxed text-ink/65">
                      {f.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
