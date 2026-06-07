const logos = [
  "Inc42",
  "YourStory",
  "Instagram India",
  "Mint",
  "Forbes India",
  "The Ken",
];

export function LogoWall() {
  return (
    <section className="border-y border-ink/[0.06] bg-bone/40 py-10 md:py-12">
      <div className="container-editorial">
        <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/45">
          As featured in
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
          {logos.map((l, i) => (
            <span
              key={l}
              className="flex items-center gap-x-8 md:gap-x-12"
            >
              <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink/55 md:text-[17px]">
                {l}
              </span>
              {i < logos.length - 1 && (
                <span
                  aria-hidden
                  className="hidden h-3 w-px bg-ink/15 last:hidden md:inline-block"
                />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
