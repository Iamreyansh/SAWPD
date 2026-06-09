import { IndianRupee, ShieldCheck, Hand, MapPin } from "lucide-react";

const items = [
  {
    icon: IndianRupee,
    title: "Pay-as-you-go or monthly",
    body: "₹499/wk or ₹1,499/mo. Pause or cancel any time. No per-sale fee.",
  },
  {
    icon: ShieldCheck,
    title: "100% of every sale",
    body: "Money goes customer → your UPI → your bank. We never touch it.",
  },
  {
    icon: Hand,
    title: "Hand-reviewed",
    body: "Every shop is approved by a real person within 24 hours.",
  },
  {
    icon: MapPin,
    title: "Made in India",
    body: "Built for Indian creators, by Indians. Hindi & English.",
  },
];

export function TrustStrip() {
  return (
    <section className="border-y border-ink/[0.06] bg-ink text-bone">
      <div className="container-editorial py-16 md:py-20">
        <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4 md:gap-y-0">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <div
                key={it.title}
                className={
                  "flex items-start gap-4 " +
                  (i > 0 ? "md:border-l md:border-bone/15 md:pl-8" : "")
                }
              >
                <span className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-bone/10">
                  <Icon className="h-5 w-5 text-vermillion" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.01em] text-bone">
                    {it.title}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-bone/60">
                    {it.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
