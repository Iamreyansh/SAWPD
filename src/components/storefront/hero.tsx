"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import type { HeroVariant } from "@/lib/themes";

type HeroProps = {
  kicker: string;
  headline: string[];
  sub: string;
  imageUrl: string;
  imageAlt: string;
  variant?: HeroVariant;
  imageSide?: "left" | "right";
};

// CSS url() injection guard — strip characters that could break out of
// the url("…") wrapper. Any URL the seller enters here should already
// be a valid https URL (the settings form validates with z.url()), but
// we sanitize defensively in case bad data slips through.
function safeCssUrl(url: string): string {
  if (!url) return "";
  return url.replace(/["\\()\n\r]/g, "");
}

export function Hero({
  kicker,
  headline,
  sub,
  imageUrl,
  imageAlt,
  variant = "side-by-side",
  imageSide = "right",
}: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);

  const lineEase = [0.22, 1, 0.36, 1] as const;
  const safeBgUrl = safeCssUrl(imageUrl);

  // ── Variants ──────────────────────────────────────────────────
  //
  // side-by-side (default / Editorial, Craft)
  //   Text on one side, image on the other. Wide, magazine-style.
  //
  // full-bleed (Bold)
  //   Image fills the whole hero. Text overlays the image with a
  //   bottom-left dark gradient.
  //
  // centered (Minimal)
  //   Image on top, text centered below. Narrow column.
  if (variant === "full-bleed") {
    return (
      <FullBleedHero
        ref={ref}
        kicker={kicker}
        headline={headline}
        sub={sub}
        imageUrl={imageUrl}
        imageAlt={imageAlt}
        imageY={imageY}
        imageScale={imageScale}
        textY={textY}
        lineEase={lineEase}
      />
    );
  }
  if (variant === "centered") {
    return (
      <CenteredHero
        kicker={kicker}
        headline={headline}
        sub={sub}
        imageUrl={imageUrl}
        imageAlt={imageAlt}
        lineEase={lineEase}
      />
    );
  }
  return (
    <SideBySideHero
      ref={ref}
      kicker={kicker}
      headline={headline}
      sub={sub}
      imageUrl={imageUrl}
      imageAlt={imageAlt}
      imageSide={imageSide}
      imageY={imageY}
      imageScale={imageScale}
      textY={textY}
      lineEase={lineEase}
      safeBgUrl={safeBgUrl}
    />
  );
}

// ── Side-by-side ────────────────────────────────────────────────

function SideBySideHero({
  ref,
  kicker,
  headline,
  sub,
  imageUrl,
  imageAlt,
  imageSide,
  imageY,
  imageScale,
  textY,
  lineEase,
  safeBgUrl,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  kicker: string;
  headline: string[];
  sub: string;
  imageUrl: string;
  imageAlt: string;
  imageSide: "left" | "right";
  imageY: any;
  imageScale: any;
  textY: any;
  lineEase: readonly [number, number, number, number];
  safeBgUrl: string;
}) {
  return (
    <section
      ref={ref as React.RefObject<HTMLDivElement>}
      className="relative overflow-hidden pt-8 md:pt-16"
      style={{ backgroundColor: "var(--theme-bg)" }}
    >
      <div className="container-editorial">
        {/* Mobile: image first */}
        <div className="md:hidden">
          <motion.div
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: lineEase }}
            className="relative aspect-[4/5] w-full overflow-hidden"
            style={{ borderRadius: "var(--theme-radius-lg)" }}
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.06 }}
              transition={{ duration: 12, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0"
              style={{ backgroundImage: `url(${safeBgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
              aria-hidden="true"
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 items-end md:grid-cols-12" style={{ gap: "var(--theme-hero-gap, 3rem)" }}>
          {/* Text */}
          <motion.div
            style={{ y: textY }}
            className={`md:col-span-7 ${imageSide === "left" ? "md:order-2 md:pl-8" : "md:pr-8"}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: lineEase }}
              className="eyebrow mb-5 md:mb-7"
              style={{ color: "var(--theme-primary)" }}
            >
              {kicker}
            </motion.div>

            <h1 className="display-l" style={{ color: "var(--theme-ink)" }}>
              {headline.map((line, i) => (
                <span key={i} className="block overflow-hidden pb-2">
                  <motion.span
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{
                      duration: 0.9,
                      delay: 0.2 + i * 0.12,
                      ease: lineEase,
                    }}
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
              transition={{ duration: 0.7, delay: 0.7, ease: lineEase }}
              className="mt-6 max-w-md text-[15px] md:mt-8 md:text-base"
              style={{ color: "var(--theme-muted)" }}
            >
              {sub}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mt-10 hidden items-center gap-3 md:flex"
            >
              <span className="hairline w-12" style={{ backgroundColor: "var(--theme-line)" }} />
              <span className="eyebrow-ink" style={{ color: "var(--theme-muted)" }}>
                Scroll to shop
              </span>
            </motion.div>
          </motion.div>

          {/* Desktop image */}
          <div className={`hidden md:col-span-5 md:block ${imageSide === "left" ? "md:order-1" : ""}`}>
            <motion.div
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.3, delay: 0.15, ease: lineEase }}
              className="relative aspect-[4/5] w-full overflow-hidden"
              style={{ borderRadius: "var(--theme-radius-lg)" }}
            >
              <motion.div
                style={{ y: imageY, scale: imageScale }}
                className="absolute inset-0"
              >
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  priority
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="object-cover"
                />
              </motion.div>
              <div
                className="pointer-events-none absolute inset-0 ring-1 ring-inset"
                style={{
                  borderRadius: "var(--theme-radius-lg)",
                  // @ts-expect-error ringColor via CSS var
                  "--tw-ring-color": "var(--theme-line)",
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Full-bleed ──────────────────────────────────────────────────

function FullBleedHero({
  ref,
  kicker,
  headline,
  sub,
  imageUrl,
  imageAlt,
  imageY,
  imageScale,
  textY,
  lineEase,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  kicker: string;
  headline: string[];
  sub: string;
  imageUrl: string;
  imageAlt: string;
  imageY: any;
  imageScale: any;
  textY: any;
  lineEase: readonly [number, number, number, number];
}) {
  return (
    <section
      ref={ref as React.RefObject<HTMLDivElement>}
      className="relative overflow-hidden"
      style={{ backgroundColor: "var(--theme-bg)" }}
    >
      <div className="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
        {imageUrl ? (
          <motion.div
            style={{ y: imageY, scale: imageScale }}
            className="absolute inset-0"
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        ) : null}
        {/* Dark gradient overlay so the text reads on any photo. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0) 70%)",
          }}
        />
        <div className="container-editorial relative flex h-full flex-col justify-end pb-12 md:pb-16">
          <motion.div
            style={{ y: textY }}
            className="max-w-2xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: lineEase }}
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--theme-primary)" }}
            >
              {kicker}
            </motion.div>
            <h1
              className="display-l"
              style={{
                color: "#FFFFFF",
                fontSize: "clamp(2.4rem, 5vw, 4.6rem)",
                lineHeight: 1.05,
              }}
            >
              {headline.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p
              className="mt-5 max-w-md text-[15px] md:text-base"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {sub}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Centered (Minimal) ──────────────────────────────────────────

function CenteredHero({
  kicker,
  headline,
  sub,
  imageUrl,
  imageAlt,
  lineEase,
}: {
  kicker: string;
  headline: string[];
  sub: string;
  imageUrl: string;
  imageAlt: string;
  lineEase: readonly [number, number, number, number];
}) {
  return (
    <section
      className="pt-16 pb-8 md:pt-24"
      style={{ backgroundColor: "var(--theme-bg)" }}
    >
      <div className="container-editorial">
        {imageUrl ? (
          <div
            className="mx-auto w-full max-w-3xl overflow-hidden"
            style={{
              aspectRatio: "4/5",
              borderRadius: "var(--theme-radius-lg)",
            }}
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={1200}
              height={1500}
              priority
              className="h-full w-full object-cover"
              sizes="(min-width: 768px) 768px, 100vw"
            />
          </div>
        ) : null}
        <div className="mx-auto mt-10 max-w-xl text-center md:mt-14">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--theme-muted)" }}
          >
            {kicker}
          </p>
          <h1
            className="mt-4"
            style={{
              color: "var(--theme-ink)",
              fontSize: "clamp(2.2rem, 4.6vw, 3.4rem)",
              lineHeight: 1.1,
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            {headline.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p
            className="mx-auto mt-5 max-w-md text-[15px] md:text-base"
            style={{ color: "var(--theme-muted)" }}
          >
            {sub}
          </p>
        </div>
      </div>
    </section>
  );
}
