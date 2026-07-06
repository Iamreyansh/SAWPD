import type { CSSProperties } from "react";
import {
  THEMES,
  DEFAULT_THEME,
  isThemeId,
  getEffectiveCssVars,
  type ThemeId,
  type ThemeOverrides,
} from "@/lib/themes";

type Props = {
  /** Database value — coerced through `isThemeId`. Falls back to default. */
  themeId: ThemeId | string | null | undefined;
  /** Optional per-store customisation layer. */
  overrides?: ThemeOverrides | null;
  /** Inline children — typically the storefront tree. */
  children: React.ReactNode;
};

/**
 * Injects the chosen theme's CSS variables on a wrapper element so
 * every descendant picks up the new palette / typography / radius.
 *
 * The variables are inlined on the wrapper's `style` attribute (not
 * a global stylesheet) so multi-tenant SSR stays clean — two stores
 * on different themes never bleed into each other.
 */
export function ThemeProvider({ themeId, overrides, children }: Props) {
  const safeId: ThemeId = isThemeId(themeId) ? themeId : DEFAULT_THEME;
  const theme = THEMES[safeId];
  const vars = getEffectiveCssVars(safeId, overrides);
  const style = varsToStyle(vars);
  return (
    <div
      data-theme={safeId}
      data-theme-name={theme.name.toLowerCase()}
      style={style}
    >
      {children}
    </div>
  );
}

function varsToStyle(vars: Record<string, string>): CSSProperties {
  // React's CSSProperties only accepts known keys; we pass through the
  // raw map as a CSS variable bag using `style` cast.
  return vars as unknown as CSSProperties;
}