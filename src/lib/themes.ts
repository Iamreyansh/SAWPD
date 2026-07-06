/**
 * Per-store storefront themes. Each theme defines:
 *   - CSS variables injected on the storefront root (colors, fonts, sizing)
 *   - Layout variants consumed by <Hero>, <ProductGrid>, etc.
 *
 * Adding a new theme = add an entry to `THEMES` below. No DB schema
 * changes required.
 *
 * Sellers can layer their own customisation on top of a preset via the
 * `themeOverrides` blob on `stores` (e.g. just override `--color-primary`).
 */

export type ThemeId = "editorial" | "minimal" | "bold" | "craft";

export const DEFAULT_THEME: ThemeId = "editorial";

export type HeroVariant = "side-by-side" | "full-bleed" | "centered";
export type CardDensity = "compact" | "comfortable" | "spacious";

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  /** A short blurb shown in the picker card. */
  blurb: string;
  /** CSS variables injected on the storefront root. */
  cssVars: Record<string, string>;
  /** Hero layout — passed to <Hero variant="..."> */
  heroVariant: HeroVariant;
  /** Whether the hero image is on the left or right (side-by-side only). */
  heroImageSide: "left" | "right";
  /** Card grid density — passed to <ProductGrid density="..."> */
  cardDensity: CardDensity;
  /** Two colours used in the picker card preview. */
  preview: { primary: string; bg: string; ink: string };
};

/**
 * Theme presets. The keys MUST match the values in src/types/seller.ts
 * `ThemeId` and the `theme_id` strings stored in the DB.
 */
export const THEMES: Record<ThemeId, Theme> = {
  // ── Editorial (current default — magazine-style) ───────────────
  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "Magazine-style with vermillion accents and confident type.",
    blurb: "The default — magazine-style, vermillion, generous whitespace.",
    heroVariant: "side-by-side",
    heroImageSide: "right",
    cardDensity: "comfortable",
    preview: {
      primary: "#FF4A1C",
      bg: "#F5F2EC",
      ink: "#1A1A1A",
    },
    cssVars: {
      "--theme-primary": "#FF4A1C",
      "--theme-primary-deep": "#DC320C",
      "--theme-bg": "#F5F2EC",
      "--theme-bg-soft": "#FAF9F7",
      "--theme-ink": "#1A1A1A",
      "--theme-muted": "#6B6B6B",
      "--theme-line": "rgba(26,26,26,0.10)",
      "--theme-accent-bg": "rgba(255,74,28,0.10)",
      "--theme-radius": "1rem",
      "--theme-radius-lg": "1.5rem",
      "--theme-hero-gap": "3rem",
      "--theme-card-radius": "1rem",
    },
  },

  // ── Minimal (whitespace-heavy, monochromatic) ──────────────────
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Lots of whitespace, thin lines, monochrome palette.",
    blurb: "Quiet, confident, lots of breathing room.",
    heroVariant: "centered",
    heroImageSide: "right",
    cardDensity: "spacious",
    preview: {
      primary: "#111111",
      bg: "#FAFAFA",
      ink: "#111111",
    },
    cssVars: {
      "--theme-primary": "#111111",
      "--theme-primary-deep": "#000000",
      "--theme-bg": "#FAFAFA",
      "--theme-bg-soft": "#FFFFFF",
      "--theme-ink": "#111111",
      "--theme-muted": "#8A8A8A",
      "--theme-line": "rgba(17,17,17,0.08)",
      "--theme-accent-bg": "rgba(17,17,17,0.06)",
      "--theme-radius": "0.5rem",
      "--theme-radius-lg": "0.75rem",
      "--theme-hero-gap": "4rem",
      "--theme-card-radius": "0.5rem",
    },
  },

  // ── Bold (chunky type, high contrast, photo-led) ──────────────
  bold: {
    id: "bold",
    name: "Bold",
    description: "Big type, full-bleed image, dark surfaces, loud CTAs.",
    blurb: "Loud, photo-led, made for drops and limited drops.",
    heroVariant: "full-bleed",
    heroImageSide: "right",
    cardDensity: "compact",
    preview: {
      primary: "#FFD400",
      bg: "#0E0E0E",
      ink: "#FFFFFF",
    },
    cssVars: {
      "--theme-primary": "#FFD400",
      "--theme-primary-deep": "#E5BE00",
      "--theme-bg": "#0E0E0E",
      "--theme-bg-soft": "#1A1A1A",
      "--theme-ink": "#FFFFFF",
      "--theme-muted": "#A8A8A8",
      "--theme-line": "rgba(255,255,255,0.12)",
      "--theme-accent-bg": "rgba(255,212,0,0.18)",
      "--theme-radius": "0.75rem",
      "--theme-radius-lg": "1rem",
      "--theme-hero-gap": "2.5rem",
      "--theme-card-radius": "0.5rem",
    },
  },

  // ── Craft (warm earth tones, handmade vibe) ───────────────────
  craft: {
    id: "craft",
    name: "Craft",
    description: "Warm earth tones, rounded corners, soft and personal.",
    blurb: "Warm, personal, suits ceramic / candle / leather sellers.",
    heroVariant: "side-by-side",
    heroImageSide: "left",
    cardDensity: "comfortable",
    preview: {
      primary: "#A8694A",
      bg: "#F7EFE6",
      ink: "#3B2A1F",
    },
    cssVars: {
      "--theme-primary": "#A8694A",
      "--theme-primary-deep": "#7E4D34",
      "--theme-bg": "#F7EFE6",
      "--theme-bg-soft": "#FBF6EF",
      "--theme-ink": "#3B2A1F",
      "--theme-muted": "#8A6F5C",
      "--theme-line": "rgba(59,42,31,0.12)",
      "--theme-accent-bg": "rgba(168,105,74,0.14)",
      "--theme-radius": "1.25rem",
      "--theme-radius-lg": "2rem",
      "--theme-hero-gap": "3rem",
      "--theme-card-radius": "1.25rem",
    },
  },
};

export const THEME_LIST: Theme[] = Object.values(THEMES);

/**
 * Per-store customisation layer on top of a preset. Only the keys
 * present in this blob override the theme defaults.
 */
export type ThemeOverrides = {
  primary?: string;
  /** A single Google font family (e.g. "Inter, sans-serif"). */
  fontFamily?: string;
};

export function getEffectiveCssVars(
  themeId: ThemeId,
  overrides: ThemeOverrides | null | undefined,
): Record<string, string> {
  const base = THEMES[themeId] ?? THEMES[DEFAULT_THEME];
  if (!overrides) return base.cssVars;
  const out: Record<string, string> = { ...base.cssVars };
  if (overrides.primary) {
    out["--theme-primary"] = overrides.primary;
    out["--theme-primary-deep"] = overrides.primary;
    // Re-derive the accent tint at runtime via a fixed opacity.
    out["--theme-accent-bg"] = `${overrides.primary}1F`; // ~12% hex alpha
  }
  if (overrides.fontFamily) {
    out["--theme-font-display"] = overrides.fontFamily;
    out["--theme-font-body"] = overrides.fontFamily;
  }
  return out;
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && value in THEMES;
}