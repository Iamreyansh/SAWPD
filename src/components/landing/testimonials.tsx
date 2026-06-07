import { Quote } from "lucide-react";

const testimonials = [
  {
    initials: "AS",
    name: "Ananya Subramanian",
    handle: "@ananyastudio.in",
    niche: "Fashion",
    quote:
      "I used to lose half my night chasing DMs and writing UPI IDs by hand. Now the link in my bio does the work, and I get to actually design.",
  },
  {
    initials: "KE",
    name: "Kabir Engineer",
    handle: "@earthen.co",
    niche: "Home & ceramics",
    quote:
      "Selling on SAWPD is the closest thing to running my own site without the headache. Customers pay, I verify a screenshot, and ship.",
  },
  {
    initials: "PM",
    name: "Priya Menon",
    handle: "@priyabeauty.com",
    niche: "Skincare",
    quote:
      "I dropped a UPI link in my Stories and got 14 orders the same evening. No middleman, no waiting for transfers.",
  },
  {
    initials: "AR",
    name: "Aanya Reddy",
    handle: "@aanya.jewels",
    niche: "Jewelry",
    quote:
      "The hand-review is what made me trust it. Real people, real shop. My customers feel that — and they come back.",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="container-editorial py-24 md:py-32">
      <div className="mb-12 max-w-2xl md:mb-16">
        <p className="eyebrow mb-3">Loved by creators</p>
        <h2 className="display-l text-ink text-balance">
          The shop in their bio.
          <br />
          <span className="text-ink/30">The hours back in their week.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {testimonials.map((t, i) => (
          <figure
            key={t.handle}
            className={
              "flex flex-col rounded-2xl border border-ink/10 bg-bone p-7 " +
              (i === 0 ? "md:col-span-2 md:flex-row md:items-stretch md:gap-8" : "")
            }
          >
            <div className={i === 0 ? "md:flex-1" : ""}>
              <Quote
                className="h-5 w-5 text-vermillion"
                strokeWidth={2.25}
                aria-hidden
              />
              <blockquote className="mt-5 text-[18px] font-medium leading-[1.4] tracking-[-0.01em] text-ink md:text-[20px]">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-bone"
                >
                  {t.initials}
                </span>
                <span className="leading-tight">
                  <span className="block text-[14px] font-semibold text-ink">
                    {t.name}
                  </span>
                  <span className="block text-[12.5px] text-ink/55">
                    {t.handle} · {t.niche}
                  </span>
                </span>
              </figcaption>
            </div>
            {i === 0 && (
              <div className="relative mt-8 hidden aspect-[4/3] flex-shrink-0 overflow-hidden rounded-xl md:mt-0 md:block md:w-72">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80')",
                  }}
                />
              </div>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
