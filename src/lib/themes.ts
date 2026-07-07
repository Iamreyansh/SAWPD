/**
 * Per-store storefront themes. Each theme defines:
 *   - CSS variables injected on the storefront root (colors, fonts, sizing)
 *   - Layout variants consumed by <Hero>, <ProductGrid>, etc.
 *
 * Adding a new theme = add an entry to `THEMES` below. No DB schema
 * changes required.
 *
 * Gallery is curatable — re-order to surface popular themes. Sellers
 * preview before applying, then save via the dashboard settings.
 */

export type ThemeId =
  | "editorial"
  | "minimal"
  | "bold"
  | "craft"
  | "atelier"
  | "neon"
  | "botanic"
  | "memphis"
  | "mono"
  | "sunset"
  | "library"
  | "grid";

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
  preview: { primary: string; bg: string; ink: string; accent?: string };
  /** Category — used for filtering in the picker. */
  category: "Editorial" | "Minimal" | "Bold" | "Craft" | "Modern" | "Vintage";
  /** Google Fonts URL params (subset to latin for size). */
  fonts?: string;
  /** Whether this is a "new" theme — used to badge the card. */
  isNew?: boolean;
};

const FONT_LORAS = ["Cormorant Garamond", "Fraunces", "Lora"];
const FONT_SANS = ["Manrope", "Inter", "Space Grotesk"];

/**
 * Build a Google Fonts URL with the requested families. The picker
 * prefetches the font for the currently-selected theme so the
 * storefront doesn't pop when the theme is applied.
 */
export function buildGoogleFontsUrl(families: string[]): string | null {
  if (families.length === 0) return null;
  const params = new URLSearchParams();
  families.forEach((f) => {
    const isSerif = FONT_LORAS.includes(f);
    params.append(
      "family",
      `${f.replace(/ /g, "+")}:wght@${isSerif ? "400;500;600;700" : "300;400;500;600;700;800"}`,
    );
  });
  return `https://fonts.googleapis.com/css2?${params.toString()}&display=swap`;
}

/**
 * Builds the default CSS-var bag for a theme. Themes only need to
 * override the few that differ from the defaults — most themes
 * inherit radius / line / shadow conventions.
 */
function buildCssVars(input: {
  primary: string;
  primaryDeep?: string;
  bg: string;
  bgSoft?: string;
  ink: string;
  muted: string;
  line?: string;
  accentBg: string;
  radius?: string;
  radiusLg?: string;
  heroGap?: string;
  cardRadius?: string;
  fontDisplay?: string;
  fontBody?: string;
}): Record<string, string> {
  return {
    "--theme-primary": input.primary,
    "--theme-primary-deep": input.primaryDeep ?? input.primary,
    "--theme-bg": input.bg,
    "--theme-bg-soft": input.bgSoft ?? input.bg,
    "--theme-ink": input.ink,
    "--theme-muted": input.muted,
    "--theme-line": input.line ?? "rgba(0,0,0,0.10)",
    "--theme-accent-bg": input.accentBg,
    "--theme-radius": input.radius ?? "1rem",
    "--theme-radius-lg": input.radiusLg ?? "1.5rem",
    "--theme-hero-gap": input.heroGap ?? "3rem",
    "--theme-card-radius": input.cardRadius ?? input.radius ?? "1rem",
    "--theme-font-display": input.fontDisplay ?? "Manrope, sans-serif",
    "--theme-font-body": input.fontBody ?? "Manrope, sans-serif",
  };
}

/**
 * 12 preset themes. Each is a distinct visual identity — not just a
 * color swap. Hero layout, card density, radius, and font family all
 * differ to make the gallery feel like a real theme store.
 */
export const THEMES: Record<ThemeId, Theme> = {
  // ── 1. Editorial (default) ──────────────────────────────────────
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
      accent: "#FFEEE7",
    },
    category: "Editorial",
    fonts: "Manrope",
    cssVars: buildCssVars({
      primary: "#FF4A1C",
      bg: "#F5F2EC",
      bgSoft: "#FAF9F7",
      ink: "#1A1A1A",
      muted: "#6B6B6B",
      accentBg: "#FFEEE7",
    }),
  },

  // ── 2. Minimal ────────────────────────────────────────────────
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
      accent: "#EFEFEF",
    },
    category: "Minimal",
    fonts: "Inter",
    cssVars: buildCssVars({
      primary: "#111111",
      primaryDeep: "#000000",
      bg: "#FAFAFA",
      bgSoft: "#FFFFFF",
      ink: "#111111",
      muted: "#8A8A8A",
      line: "rgba(17,17,17,0.08)",
      accentBg: "rgba(17,17,17,0.06)",
      radius: "0.5rem",
      radiusLg: "0.75rem",
      heroGap: "4rem",
      cardRadius: "0.5rem",
      fontDisplay: "Inter, sans-serif",
      fontBody: "Inter, sans-serif",
    }),
  },

  // ── 3. Bold ───────────────────────────────────────────────────
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
      accent: "#FF4A1C",
    },
    category: "Bold",
    fonts: "Space Grotesk",
    isNew: true,
    cssVars: buildCssVars({
      primary: "#FFD400",
      primaryDeep: "#E5BE00",
      bg: "#0E0E0E",
      bgSoft: "#1A1A1A",
      ink: "#FFFFFF",
      muted: "#A8A8A8",
      line: "rgba(255,255,255,0.12)",
      accentBg: "rgba(255,212,0,0.18)",
      radius: "0.75rem",
      radiusLg: "1rem",
      heroGap: "2.5rem",
      cardRadius: "0.5rem",
      fontDisplay: "'Space Grotesk', sans-serif",
      fontBody: "'Space Grotesk', sans-serif",
    }),
  },

  // ── 4. Craft ───────────────────────────────────────────────────
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
      accent: "#EFD9C2",
    },
    category: "Craft",
    fonts: "Fraunces",
    cssVars: buildCssVars({
      primary: "#A8694A",
      primaryDeep: "#7E4D34",
      bg: "#F7EFE6",
      bgSoft: "#FBF6EF",
      ink: "#3B2A1F",
      muted: "#8A6F5C",
      line: "rgba(59,42,31,0.12)",
      accentBg: "rgba(168,105,74,0.14)",
      radius: "1.25rem",
      radiusLg: "2rem",
      heroGap: "3rem",
      cardRadius: "1.25rem",
      fontDisplay: "'Fraunces', serif",
      fontBody: "'Fraunces', serif",
    }),
  },

  // ── 5. Atelier ───────────────────────────────────────────────
  atelier: {
    id: "atelier",
    name: "Atelier",
    description: "Parisian boutique — gold accents, refined typography, ivory.",
    blurb: "Quiet luxury. For jewellery, ceramics, fragrance.",
    heroVariant: "side-by-side",
    heroImageSide: "right",
    cardDensity: "spacious",
    preview: {
      primary: "#7A5C2E",
      bg: "#FBF7EE",
      ink: "#1F1A12",
      accent: "#E9D9B3",
    },
    category: "Editorial",
    fonts: "Cormorant Garamond,Inter",
    isNew: true,
    cssVars: buildCssVars({
      primary: "#7A5C2E",
      primaryDeep: "#5B4220",
      bg: "#FBF7EE",
      bgSoft: "#FFFCF3",
      ink: "#1F1A12",
      muted: "#7A6A4F",
      line: "rgba(31,26,18,0.10)",
      accentBg: "rgba(233,217,179,0.35)",
      radius: "0.25rem",
      radiusLg: "0.5rem",
      heroGap: "4rem",
      cardRadius: "0.25rem",
      fontDisplay: "'Cormorant Garamond', serif",
      fontBody: "'Inter', sans-serif",
    }),
  },

  // ── 6. Neon ───────────────────────────────────────────────────
  neon: {
    id: "neon",
    name: "Neon",
    description: "Cyberpunk glow, hot pink on black, electric type.",
    blurb: "Loud and modern. For streetwear, sneakers, nightlife.",
    heroVariant: "full-bleed",
    heroImageSide: "right",
    cardDensity: "compact",
    preview: {
      primary: "#FF2EC4",
      bg: "#0A0A12",
      ink: "#F5F5FF",
      accent: "#00E5FF",
    },
    category: "Modern",
    fonts: "Space Grotesk",
    isNew: true,
    cssVars: buildCssVars({
      primary: "#FF2EC4",
      primaryDeep: "#CC1FA0",
      bg: "#0A0A12",
      bgSoft: "#15151F",
      ink: "#F5F5FF",
      muted: "#9090B0",
      line: "rgba(255,46,196,0.20)",
      accentBg: "rgba(255,46,196,0.15)",
      radius: "0.5rem",
      radiusLg: "0.75rem",
      heroGap: "2rem",
      cardRadius: "0.5rem",
      fontDisplay: "'Space Grotesk', sans-serif",
      fontBody: "'Space Grotesk', sans-serif",
    }),
  },

  // ── 7. Botanic ────────────────────────────────────────────────
  botanic: {
    id: "botanic",
    name: "Botanic",
    description: "Sage green + cream, generous spacing, organic type.",
    blurb: "Calm and natural. Suits plants, skincare, home.",
    heroVariant: "centered",
    heroImageSide: "right",
    cardDensity: "spacious",
    preview: {
      primary: "#5A7A5A",
      bg: "#F1EFE7",
      ink: "#1F2A20",
      accent: "#D8E2D5",
    },
    category: "Craft",
    fonts: "Fraunces",
    cssVars: buildCssVars({
      primary: "#5A7A5A",
      primaryDeep: "#446144",
      bg: "#F1EFE7",
      bgSoft: "#F7F5EE",
      ink: "#1F2A20",
      muted: "#6B7A6B",
      line: "rgba(31,42,32,0.10)",
      accentBg: "rgba(90,122,90,0.15)",
      radius: "1rem",
      radiusLg: "1.5rem",
      heroGap: "4rem",
      cardRadius: "1rem",
      fontDisplay: "'Fraunces', serif",
      fontBody: "'Fraunces', serif",
    }),
  },

  // ── 8. Memphis ────────────────────────────────────────────────
  memphis: {
    id: "memphis",
    name: "Memphis",
    description: "Playful, geometric, primary colours, pop-art energy.",
    blurb: "Bold, fun, made for kids, gifts, stationery.",
    heroVariant: "side-by-side",
    heroImageSide: "right",
    cardDensity: "compact",
    preview: {
      primary: "#1F4FE0",
      bg: "#FFFAEB",
      ink: "#1A1A1A",
      accent: "#FF6B6B",
    },
    category: "Bold",
    fonts: "Space Grotesk",
    isNew: true,
    cssVars: buildCssVars({
      primary: "#1F4FE0",
      primaryDeep: "#1638A8",
      bg: "#FFFAEB",
      bgSoft: "#FFF4D9",
      ink: "#1A1A1A",
      muted: "#5C5C5C",
      line: "rgba(31,79,224,0.15)",
      accentBg: "rgba(255,107,107,0.15)",
      radius: "1.25rem",
      radiusLg: "1.75rem",
      heroGap: "2.5rem",
      cardRadius: "1.25rem",
      fontDisplay: "'Space Grotesk', sans-serif",
      fontBody: "'Space Grotesk', sans-serif",
    }),
  },

  // ── 9. Mono ───────────────────────────────────────────────────
  mono: {
    id: "mono",
    name: "Mono",
    description: "Brutalist black & white, sharp corners, type-driven.",
    blurb: "No-fluff product grid. For tech, design objects, minimal brands.",
    heroVariant: "side-by-side",
    heroImageSide: "right",
    cardDensity: "compact",
    preview: {
      primary: "#000000",
      bg: "#FFFFFF",
      ink: "#000000",
      accent: "#F0F0F0",
    },
    category: "Minimal",
    fonts: "Inter",
    cssVars: buildCssVars({
      primary: "#000000",
      primaryDeep: "#000000",
      bg: "#FFFFFF",
      bgSoft: "#FAFAFA",
      ink: "#000000",
      muted: "#666666",
      line: "rgba(0,0,0,0.12)",
      accentBg: "rgba(0,0,0,0.04)",
      radius: "0",
      radiusLg: "0",
      heroGap: "2rem",
      cardRadius: "0",
      fontDisplay: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif",
    }),
  },

  // ── 10. Sunset ───────────────────────────────────────────────
  sunset: {
    id: "sunset",
    name: "Sunset",
    description: "Warm peach-to-lavender gradient, soft shadows, dreamy.",
    blurb: "Soft, romantic, dreamy. For skincare, candles, florals.",
    heroVariant: "full-bleed",
    heroImageSide: "right",
    cardDensity: "spacious",
    preview: {
      primary: "#E25B8E",
      bg: "#FFF1E6",
      ink: "#3A2138",
      accent: "#FBD3B6",
    },
    category: "Modern",
    fonts: "Inter",
    isNew: true,
    cssVars: buildCssVars({
      primary: "#E25B8E",
      primaryDeep: "#B73A6E",
      bg: "#FFF1E6",
      bgSoft: "#FFE4D6",
      ink: "#3A2138",
      muted: "#7A5C5C",
      line: "rgba(58,33,56,0.10)",
      accentBg: "rgba(251,211,182,0.45)",
      radius: "1.5rem",
      radiusLg: "2.25rem",
      heroGap: "3.5rem",
      cardRadius: "1.5rem",
      fontDisplay: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif",
    }),
  },

  // ── 11. Library ───────────────────────────────────────────────
  library: {
    id: "library",
    name: "Library",
    description: "Bookish — forest green, classical serif, parchment.",
    blurb: "Refined, intellectual. For books, stationery, scents.",
    heroVariant: "side-by-side",
    heroImageSide: "right",
    cardDensity: "comfortable",
    preview: {
      primary: "#2F4A35",
      bg: "#F6F2E8",
      ink: "#1A2418",
      accent: "#DCD4B7",
    },
    category: "Vintage",
    fonts: "Lora,Inter",
    cssVars: buildCssVars({
      primary: "#2F4A35",
      primaryDeep: "#1F3324",
      bg: "#F6F2E8",
      bgSoft: "#FAF7EF",
      ink: "#1A2418",
      muted: "#5A6A55",
      line: "rgba(26,36,24,0.12)",
      accentBg: "rgba(220,212,183,0.40)",
      radius: "0.25rem",
      radiusLg: "0.5rem",
      heroGap: "3rem",
      cardRadius: "0.25rem",
      fontDisplay: "'Lora', serif",
      fontBody: "'Inter', sans-serif",
    }),
  },

  // ── 12. Grid ─────────────────────────────────────────────────
  grid: {
    id: "grid",
    name: "Grid",
    description: "Bauhaus-inspired modular grid, primary blue, strong rules.",
    blurb: "Structured, modernist. For design objects, furniture, art.",
    heroVariant: "centered",
    heroImageSide: "right",
    cardDensity: "compact",
    preview: {
      primary: "#1F3FE0",
      bg: "#F2F1ED",
      ink: "#111111",
      accent: "#FFD800",
    },
    category: "Bold",
    fonts: "Inter",
    cssVars: buildCssVars({
      primary: "#1F3FE0",
      primaryDeep: "#1428A8",
      bg: "#F2F1ED",
      bgSoft: "#FFFFFF",
      ink: "#111111",
      muted: "#5A5A5A",
      line: "rgba(17,17,17,0.15)",
      accentBg: "rgba(255,216,0,0.30)",
      radius: "0",
      radiusLg: "0",
      heroGap: "2rem",
      cardRadius: "0",
      fontDisplay: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif",
    }),
  },
};

/**
 * Curated display order for the picker. Editorial is always first
 * (the default). "New" themes surface next to draw the eye.
 */
export const THEME_LIST: Theme[] = (Object.values(THEMES) as Theme[]).sort(
  (a, b) => {
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    return 0;
  },
);

export const THEME_CATEGORIES = [
  "All",
  "Editorial",
  "Minimal",
  "Bold",
  "Craft",
  "Modern",
  "Vintage",
] as const;

export type ThemeCategory = (typeof THEME_CATEGORIES)[number];

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