"use client";

/**
 * Live theme preview modal.
 *
 * Renders a fully-themed mini-storefront using the seller's actual
 * data (name, hero, a sample of their products). Switching themes
 * inside the modal updates the CSS variables in real time so the
 * seller can A/B compare before committing.
 *
 * The "Open full storefront" link passes `?theme=<id>` to the real
 * /s/<slug> page so the seller can preview on their actual URL
 * without saving first.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEMES, getEffectiveCssVars, type ThemeId } from "@/lib/themes";
import { formatINR, cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All themes (for the side-picker inside the modal). */
  themes: typeof THEMES;
  /** Currently previewed theme id. */
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  /** Seller's data for the mini-storefront. */
  storeSlug: string;
  storeName: string;
  ownerHandle: string;
  heroKicker: string;
  heroHeadline: string[];
  heroSub: string;
  heroImage: string;
  /** Sample products to show. 0–3 items. */
  sampleProducts: { title: string; price: number; imageUrl: string }[];
  /** Optional per-store override (primary / font) to apply on top. */
  overrides?: { primary?: string; fontFamily?: string } | null;
  /** Currently-saved theme id — used to label the "current" badge. */
  currentThemeId: ThemeId;
};

export function ThemePreviewModal({
  open,
  onOpenChange,
  themes,
  themeId,
  onThemeChange,
  storeSlug,
  storeName,
  ownerHandle,
  heroKicker,
  heroHeadline,
  heroSub,
  heroImage,
  sampleProducts,
  overrides,
  currentThemeId,
}: Props) {
  const theme = themes[themeId];
  const cssVars = useMemo(
    () => getEffectiveCssVars(themeId, overrides ?? null),
    [themeId, overrides],
  );

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const previewStorefrontHref = `/s/${storeSlug}?theme=${themeId}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={`${theme.name} theme preview`}
            data-theme={themeId}
            className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-3xl bg-bone shadow-2xl md:inset-8"
            style={cssVars as React.CSSProperties}
          >
            {/* Modal header — theme picker + actions */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-b p-4"
              style={{ borderColor: "var(--theme-line, rgba(0,0,0,0.08))" }}
            >
              <div className="flex items-center gap-3">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--theme-muted)" }}
                >
                  Preview
                </p>
                <h2
                  className="text-[16px] font-semibold tracking-[-0.01em]"
                  style={{ color: "var(--theme-ink)" }}
                >
                  {theme.name}
                </h2>
                {theme.isNew && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      backgroundColor: "var(--theme-primary)",
                      color: "var(--theme-bg)",
                    }}
                  >
                    New
                  </span>
                )}
                {themeId === currentThemeId && (
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]"
                    style={{
                      borderColor: "var(--theme-line)",
                      color: "var(--theme-muted)",
                    }}
                  >
                    Current
                  </span>
                )}
                <p
                  className="hidden text-[12px] sm:block"
                  style={{ color: "var(--theme-muted)" }}
                >
                  {theme.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={previewStorefrontHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-bone px-3 text-[12px] font-semibold transition-colors"
                  style={{
                    borderColor: "var(--theme-line, rgba(0,0,0,0.10))",
                    color: "var(--theme-ink)",
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Open full storefront
                </Link>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close preview"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-bone"
                  style={{
                    borderColor: "var(--theme-line, rgba(0,0,0,0.10))",
                    color: "var(--theme-ink)",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar — theme switcher */}
              <aside
                className="hidden w-56 shrink-0 overflow-y-auto border-r p-3 md:block"
                style={{ borderColor: "var(--theme-line, rgba(0,0,0,0.08))" }}
              >
                <p
                  className="px-2 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--theme-muted)" }}
                >
                  {Object.keys(themes).length} themes
                </p>
                <ul className="space-y-1">
                  {Object.values(themes).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => onThemeChange(t.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-[12.5px] transition-all",
                          t.id === themeId ? "shadow-sm" : "hover:opacity-90",
                        )}
                        style={{
                          backgroundColor:
                            t.id === themeId
                              ? "var(--theme-bg, #fff)"
                              : "transparent",
                          borderColor:
                            t.id === themeId
                              ? "var(--theme-primary)"
                              : "var(--theme-line, rgba(0,0,0,0.10))",
                          color: "var(--theme-ink)",
                        }}
                      >
                        <span
                          className="h-6 w-6 shrink-0 rounded-md border"
                          style={{
                            background: `linear-gradient(135deg, ${t.preview.primary}, ${t.preview.bg})`,
                            borderColor: "rgba(0,0,0,0.10)",
                          }}
                          aria-hidden
                        />
                        <span className="flex-1 truncate font-medium">
                          {t.name}
                        </span>
                        {t.id === currentThemeId && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]"
                            style={{
                              backgroundColor: "var(--theme-muted)",
                              color: "var(--theme-bg)",
                            }}
                          >
                            Live
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>

              {/* Main — live preview */}
              <div
                className="flex-1 overflow-y-auto"
                style={{ backgroundColor: "var(--theme-bg)" }}
              >
                <MiniStorefront
                  themeId={themeId}
                  storeName={storeName}
                  ownerHandle={ownerHandle}
                  heroKicker={heroKicker}
                  heroHeadline={heroHeadline}
                  heroSub={heroSub}
                  heroImage={heroImage}
                  sampleProducts={sampleProducts}
                />
              </div>
            </div>

            {/* Footer — actions */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-t bg-bone p-4"
              style={{ borderColor: "var(--theme-line, rgba(0,0,0,0.08))" }}
            >
              <button
                type="button"
                onClick={() => onThemeChange(currentThemeId)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 text-[12px] font-medium text-ink/65 transition-colors hover:text-ink"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to {themes[currentThemeId].name}
              </button>
              <p
                className="text-[11.5px]"
                style={{ color: "var(--theme-muted)" }}
              >
                No changes are saved until you click <strong>Apply</strong>.
              </p>
              <Link
                href={previewStorefrontHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 text-[12px] font-medium text-ink/65 transition-colors hover:text-ink"
              >
                <ExternalLink className="h-3 w-3" />
                Open in new tab
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Mini storefront (live preview) ─────────────────────────────

function MiniStorefront({
  themeId,
  storeName,
  ownerHandle,
  heroKicker,
  heroHeadline,
  heroSub,
  heroImage,
  sampleProducts,
}: {
  themeId: ThemeId;
  storeName: string;
  ownerHandle: string;
  heroKicker: string;
  heroHeadline: string[];
  heroSub: string;
  heroImage: string;
  sampleProducts: { title: string; price: number; imageUrl: string }[];
}) {
  // Mock data so the preview always has something to show even when
  // the seller hasn't added products yet.
  const mock: { title: string; price: number; imageUrl: string }[] = [
    { title: "Pebble bowl", price: 1490, imageUrl: heroImage },
    { title: "Linen apron", price: 2290, imageUrl: heroImage },
    { title: "Brass spoon", price: 690, imageUrl: heroImage },
  ];
  const products =
    sampleProducts.length > 0 ? sampleProducts.slice(0, 3) : mock;

  return (
    <div data-theme-preview={themeId} className="space-y-0">
      {/* Mini header */}
      <div className="flex items-center justify-between border-b px-8 py-4"
        style={{ borderColor: "var(--theme-line, rgba(0,0,0,0.08))" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold"
            style={{
              backgroundColor: "var(--theme-primary)",
              color: "var(--theme-bg)",
            }}
          >
            {storeName.slice(0, 1).toUpperCase()}
          </span>
          <span
            className="text-[14px] font-semibold tracking-[-0.01em]"
            style={{ color: "var(--theme-ink)" }}
          >
            {storeName}
          </span>
        </div>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--theme-muted)" }}
        >
          @{ownerHandle}
        </span>
      </div>

      {/* Hero — uses the theme's hero variant */}
      <HeroPreview
        themeId={themeId}
        kicker={heroKicker}
        headline={heroHeadline}
        sub={heroSub}
        imageUrl={heroImage}
      />

      {/* Sample products */}
      <div className="px-8 py-12">
        <div className="mb-6 flex items-end justify-between">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--theme-muted)" }}
          >
            Recent
          </p>
          <p
            className="text-[11.5px]"
            style={{ color: "var(--theme-muted)" }}
          >
            Sample of {products.length}
          </p>
        </div>
        <div
          className={cn(
            "grid gap-4",
            products.length === 1
              ? "grid-cols-1 sm:grid-cols-2"
              : products.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3",
          )}
        >
          {products.map((p, i) => (
            <div key={i} className="space-y-2">
              <div
                className="aspect-square w-full overflow-hidden"
                style={{
                  borderRadius: "var(--theme-radius, 1rem)",
                  backgroundColor: "var(--theme-accent-bg, rgba(0,0,0,0.04))",
                }}
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <p
                className="truncate text-[13px] font-medium"
                style={{ color: "var(--theme-ink)" }}
              >
                {p.title}
              </p>
              <p
                className="text-[12.5px] font-semibold tabular-nums"
                style={{ color: "var(--theme-ink)" }}
              >
                {formatINR(p.price)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="border-t px-8 py-6 text-center"
        style={{ borderColor: "var(--theme-line, rgba(0,0,0,0.08))" }}
      >
        <p
          className="text-[11px]"
          style={{ color: "var(--theme-muted)" }}
        >
          Powered by SAWPD
        </p>
      </div>
    </div>
  );
}

// ── Mini hero (3 variants) ─────────────────────────────────────

function HeroPreview({
  themeId,
  kicker,
  headline,
  sub,
  imageUrl,
}: {
  themeId: ThemeId;
  kicker: string;
  headline: string[];
  sub: string;
  imageUrl: string;
}) {
  const variant = THEMES[themeId]?.heroVariant ?? "side-by-side";
  const side = THEMES[themeId]?.heroImageSide ?? "right";

  if (variant === "full-bleed") {
    return (
      <div
        className="relative h-72 overflow-hidden"
        style={{ backgroundColor: "var(--theme-bg)" }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 80%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-8">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--theme-primary)" }}
          >
            {kicker || "New collection"}
          </p>
          {headline.map((line, i) => (
            <p
              key={i}
              className="block text-[26px] font-semibold leading-[1.05] tracking-[-0.02em]"
              style={{ color: "#FFFFFF" }}
            >
              {line || "Latest drop"}
            </p>
          ))}
          <p
            className="mt-2 max-w-md text-[12px]"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {sub || "Hand-picked pieces, ready to ship."}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "centered") {
    return (
      <div
        className="px-8 py-14"
        style={{ backgroundColor: "var(--theme-bg)" }}
      >
        <div
          className="mx-auto mb-8 aspect-[4/5] max-w-md overflow-hidden"
          style={{ borderRadius: "var(--theme-radius-lg, 1.5rem)" }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="mx-auto max-w-xl text-center">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--theme-muted)" }}
          >
            {kicker || "New collection"}
          </p>
          {headline.map((line, i) => (
            <p
              key={i}
              className="block text-[28px] font-medium leading-[1.1] tracking-[-0.02em]"
              style={{ color: "var(--theme-ink)" }}
            >
              {line || "Latest drop"}
            </p>
          ))}
          <p
            className="mx-auto mt-3 max-w-md text-[12.5px]"
            style={{ color: "var(--theme-muted)" }}
          >
            {sub || "Hand-picked pieces, ready to ship."}
          </p>
        </div>
      </div>
    );
  }

  // side-by-side (default)
  const textFirst = side === "left";
  return (
    <div
      className="grid items-end gap-8 px-8 py-12 md:grid-cols-12"
      style={{ backgroundColor: "var(--theme-bg)" }}
    >
      <div
        className={cn(
          "md:col-span-7",
          textFirst ? "md:order-2 md:pl-8" : "md:pr-8",
        )}
      >
        <p
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "var(--theme-primary)" }}
        >
          {kicker || "New collection"}
        </p>
        {headline.map((line, i) => (
          <p
            key={i}
            className="block text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]"
            style={{ color: "var(--theme-ink)" }}
          >
            {line || "Latest drop"}
          </p>
        ))}
        <p
          className="mt-3 max-w-md text-[12.5px]"
          style={{ color: "var(--theme-muted)" }}
        >
          {sub || "Hand-picked pieces, ready to ship."}
        </p>
      </div>
      <div
        className={cn(
          "md:col-span-5",
          textFirst ? "md:order-1" : "",
        )}
      >
        <div
          className="aspect-[4/5] w-full overflow-hidden"
          style={{ borderRadius: "var(--theme-radius-lg, 1.5rem)" }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
      </div>
    </div>
  );
}