"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  THEME_LIST,
  DEFAULT_THEME,
  type ThemeId,
  type ThemeOverrides,
} from "@/lib/themes";
import { updateStoreThemeAction } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

type Props = {
  storeSlug: string;
  currentThemeId: ThemeId;
  currentOverrides: ThemeOverrides | null;
};

export function ThemePicker({
  storeSlug,
  currentThemeId,
  currentOverrides,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [themeId, setThemeId] = useState<ThemeId>(currentThemeId);
  const [primary, setPrimary] = useState(
    currentOverrides?.primary ?? "",
  );
  const [fontFamily, setFontFamily] = useState(
    currentOverrides?.fontFamily ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selected = THEME_LIST.find((t) => t.id === themeId) ?? THEME_LIST[0];

  function handleSave() {
    setError(null);
    setSaved(false);
    const overrides: ThemeOverrides = {};
    if (primary.trim()) overrides.primary = primary.trim();
    if (fontFamily.trim())
      overrides.fontFamily = fontFamily.trim();
    startTransition(async () => {
      const result = await updateStoreThemeAction(
        storeSlug,
        themeId,
        overrides,
      );
      if (!result.ok) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  function handleReset() {
    setError(null);
    setSaved(false);
    setThemeId(DEFAULT_THEME);
    setPrimary("");
    setFontFamily("");
    startTransition(async () => {
      const result = await updateStoreThemeAction(storeSlug, DEFAULT_THEME, {});
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-bone p-6 space-y-6">
      <div className="flex items-start gap-3">
        <Palette className="h-5 w-5 text-vermillion mt-1 shrink-0" />
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Storefront theme</h2>
          <p className="mt-1 text-[12.5px] text-ink/55 max-w-md">
            Pick a preset, then override the colour or font if you want.
            Customers see the new look the next time they refresh.
          </p>
        </div>
      </div>

      {/* Theme gallery */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_LIST.map((t) => {
          const isSelected = t.id === themeId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeId(t.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border text-left transition-all",
                isSelected
                  ? "border-ink shadow-soft"
                  : "border-ink/10 hover:border-ink/25",
              )}
            >
              {/* Mini-preview card */}
              <div
                className="relative h-28 overflow-hidden"
                style={{
                  backgroundColor: t.preview.bg,
                  color: t.preview.ink,
                }}
              >
                {/* Fake hero strip */}
                <div
                  className="absolute inset-x-3 top-3 h-12 rounded"
                  style={{
                    backgroundColor: t.preview.primary,
                    opacity: t.id === "minimal" ? 0.18 : 0.35,
                  }}
                />
                {/* Fake text */}
                <div
                  className="absolute inset-x-3 bottom-3 h-2 rounded-full"
                  style={{ backgroundColor: t.preview.ink, opacity: 0.85 }}
                />
                <div
                  className="absolute inset-x-3 bottom-6 h-1.5 rounded-full"
                  style={{ backgroundColor: t.preview.ink, opacity: 0.35, width: "60%" }}
                />
                {/* Bold gets the colored swatch visible */}
                {t.id === "bold" && (
                  <div
                    className="absolute top-3 left-3 h-3 w-3 rounded-full"
                    style={{ backgroundColor: t.preview.primary }}
                  />
                )}
                {isSelected && (
                  <div
                    className="absolute right-2 top-2 inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: t.preview.ink,
                      color: t.preview.bg,
                    }}
                  >
                    {"✓"}
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-[13px] font-semibold text-ink">{t.name}</p>
                <p className="mt-0.5 text-[11px] text-ink/55 line-clamp-2">
                  {t.blurb}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Overrides */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-ink/5">
        <div>
          <label className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55 mb-1.5">
            Custom primary colour
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={
                primary ||
                selected.preview.primary
              }
              onChange={(e) => setPrimary(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border border-ink/10 bg-white"
              aria-label="Primary color picker"
            />
            <Input
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              placeholder={selected.preview.primary}
              className="font-mono text-[12px]"
              maxLength={7}
            />
          </div>
          <p className="mt-1 text-[11px] text-ink/45">
            Hex like <code className="text-ink/65">#FF4A1C</code>. Leave blank
            for the theme default.
          </p>
        </div>
        <div>
          <label className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55 mb-1.5">
            Custom font
          </label>
          <Input
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            placeholder='e.g. "Inter, sans-serif"'
            className="font-mono text-[12px]"
          />
          <p className="mt-1 text-[11px] text-ink/45">
            Any Google Font CSS stack. Leave blank for the theme default
            (Manrope).
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-ink/5">
        <button
          type="button"
          onClick={handleReset}
          disabled={pending}
          className="text-[12px] text-ink/55 hover:text-ink underline-offset-2 hover:underline disabled:opacity-40"
        >
          Reset to Editorial default
        </button>
        <div className="flex items-center gap-3">
          {error && (
            <p className="text-[12px] text-vermillion">{error}</p>
          )}
          {saved && !error && (
            <p className="text-[12px] text-vermillion">Saved.</p>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="bg-vermillion"
          >
            {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save theme
          </Button>
        </div>
      </div>
    </section>
  );
}