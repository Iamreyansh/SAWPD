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
      <div className="container-editorial py-14 md:py-16">
        <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:gap-y-0">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <div
                key={it.title}
                className={
                  "flex items-start gap-3 " +
                  (i > 0 ? "md:border-l md:border-bone/15 md:pl-6" : "")
                }
              >
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-bone/10">
                  <Icon className="h-4 w-4 text-vermillion" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-bone">
                    {it.title}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-bone/55">
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
