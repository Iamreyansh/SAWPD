"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

type HeroProps = {
  kicker: string;
  headline: string[];
  sub: string;
  imageUrl: string;
  imageAlt: string;
};

export function Hero({ kicker, headline, sub, imageUrl, imageAlt }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);

  const lineEase = [0.22, 1, 0.36, 1] as const;

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-bone pt-8 md:pt-16"
    >
      <div className="container-editorial">
        {/* Mobile: image first */}
        <div className="md:hidden">
          <motion.div
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: lineEase }}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl"
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.06 }}
              transition={{ duration: 12, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0"
              style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 items-end gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
          {/* Text */}
          <motion.div
            style={{ y: textY }}
            className="md:col-span-7 md:pr-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: lineEase }}
              className="eyebrow mb-5 md:mb-7"
            >
              {kicker}
            </motion.div>

            <h1 className="display-l text-ink">
              {headline.map((line, i) => (
                <span key={i} className="block overflow-hidden">
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
              className="mt-6 max-w-md text-[15px] text-ink/60 md:mt-8 md:text-base"
            >
              {sub}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mt-10 hidden items-center gap-3 md:flex"
            >
              <span className="hairline w-12" />
              <span className="eyebrow-ink">Scroll to shop</span>
            </motion.div>
          </motion.div>

          {/* Desktop image */}
          <div className="hidden md:col-span-5 md:block">
            <motion.div
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.3, delay: 0.15, ease: lineEase }}
              className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl"
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
              {/* Subtle frame border */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-ink/5" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
