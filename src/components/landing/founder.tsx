export function Founder() {
  return (
    <section className="container-editorial py-24 md:py-32">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12 md:gap-16">
        <div className="md:col-span-5">
          <div className="relative mx-auto w-full max-w-[340px]">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-ink/[0.04]">
              <div
                className="h-full w-full bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?auto=format&fit=crop&w=1200&q=80')",
                }}
                aria-hidden
              />
            </div>
            <div className="absolute -bottom-4 -right-4 rounded-2xl bg-ink px-5 py-4 text-bone shadow-[0_18px_50px_-20px_rgba(17,17,17,0.35)]">
              <p className="eyebrow text-vermillion">Founder</p>
              <p className="mt-1 text-[15px] font-semibold">Rey</p>
              <p className="text-[11.5px] text-bone/55">Built this in Bangalore</p>
            </div>
          </div>
        </div>
        <div className="md:col-span-7">
          <p className="eyebrow mb-3">A note from the founder</p>
          <h2 className="display-m text-ink text-balance">
            I watched a friend lose 9 hours a week to DMs.
          </h2>
          <div className="mt-5 space-y-4 text-[15.5px] leading-[1.65] text-ink/70">
            <p>
              She sold earrings out of her bedroom. She was good at it. But every
              order was a 12-message thread: size, colour, UPI ID, screenshot,
              address, repeat. She shipped anyway.
            </p>
            <p>
              SAWPD is the shop I wish she had. One link in the bio. Pay via
              UPI. Screenshot. Done. You pay a flat subscription; you keep the
              customer, the money, and your evenings back.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
