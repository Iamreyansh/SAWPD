"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Palette, Search, X, Eye, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  THEMES,
  DEFAULT_THEME,
  THEME_CATEGORIES,
  type ThemeId,
  type ThemeOverrides,
  type ThemeCategory,
} from "@/lib/themes";
import { updateStoreThemeAction } from "@/app/dashboard/actions";
import { ThemePreviewModal } from "@/components/dashboard/theme-preview-modal";
import { cn } from "@/lib/utils";

type Props = {
  storeSlug: string;
  currentThemeId: ThemeId;
  currentOverrides: ThemeOverrides | null;
  /** Seller data fed into the preview modal. */
  store: {
    name: string;
    ownerHandle: string;
    heroKicker: string;
    heroHeadline: string[];
    heroSub: string;
    heroImage: string;
  };
  /** Up to 3 sample products. */
  sampleProducts: { title: string; price: number; imageUrl: string }[];
};

const THEME_LIST = Object.values(THEMES).sort((a, b) => {
  if (a.isNew && !b.isNew) return -1;
  if (!a.isNew && b.isNew) return 1;
  return 0;
});

function addMonthsISO(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ThemePicker({
  storeSlug,
  currentThemeId,
  currentOverrides,
  store,
  sampleProducts,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ThemeCategory>("All");

  // Draft state — what the user is currently configuring.
  const [themeId, setThemeId] = useState<ThemeId>(currentThemeId);
  const [primary, setPrimary] = useState(
    currentOverrides?.primary ?? "",
  );
  const [fontFamily, setFontFamily] = useState(
    currentOverrides?.fontFamily ?? "",
  );

  // Preview state — the theme the modal is currently rendering.
  const [previewTheme, setPreviewTheme] = useState<ThemeId | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return THEME_LIST.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.blurb.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  function handleApply() {
    setError(null);
    setSaved(false);
    if ((primary.trim() || fontFamily.trim()) && !/^#([0-9a-fA-F]{6})$/.test(primary.trim()) && primary.trim().length > 0) {
      setError("Custom colour must be a 6-digit hex like #FF4A1C.");
      return;
    }
    const overrides: ThemeOverrides = {};
    if (primary.trim()) overrides.primary = primary.trim();
    if (fontFamily.trim()) overrides.fontFamily = fontFamily.trim();
    startTransition(async () => {
      const result = await updateStoreThemeAction(
        storeSlug,
        themeId,
        overrides,
      );
      if (!result.ok) {
        flashError(result.error);
        return;
      }
      flashSaved();
      router.refresh();
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
      if (!result.ok) flashError(result.error);
      else {
        flashSaved();
        router.refresh();
      }
    });
  }
  function flashError(msg: string) {
    setError(msg);
    setSaved(false);
  }
  function flashSaved() {
    setSaved(true);
    setError(null);
  }

  const selectedTheme = THEMES[themeId] ?? THEMES[DEFAULT_THEME];
  const isDirty =
    themeId !== currentThemeId ||
    (primary || "") !== (currentOverrides?.primary ?? "") ||
    (fontFamily || "") !== (currentOverrides?.fontFamily ?? "");

  return (
    <section className="rounded-2xl border border-ink/10 bg-bone p-6 space-y-5">
      <div className="flex items-start gap-3">
        <Palette className="h-5 w-5 text-vermillion mt-1 shrink-0" />
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Storefront theme</h2>
          <p className="mt-1 text-[12.5px] text-ink/55 max-w-md">
            Pick a preset, tweak the colour or font, and{" "}
            <strong>preview before applying</strong>.{" "}
            {THEME_LIST.length} themes to choose from.
          </p>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/40"
            strokeWidth={2}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search themes…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {THEME_CATEGORIES.map((c) => {
            const count =
              c === "All"
                ? THEME_LIST.length
                : THEME_LIST.filter((t) => t.category === c).length;
            const isActive = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  isActive
                    ? "border-ink bg-ink text-bone"
                    : "border-ink/10 bg-white text-ink/65 hover:text-ink",
                )}
              >
                {c}
                <span
                  className={cn(
                    "ml-1.5 text-[10px] font-bold",
                    isActive ? "text-bone/70" : "text-ink/40",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme gallery — 4 columns on desktop, animated cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((t) => {
          const isCurrent = t.id === currentThemeId;
          const isSelected = t.id === themeId;
          return (
            <div
              key={t.id}
              data-theme-card={t.id}
              data-theme={t.id}
              style={THEMES[t.id].cssVars as React.CSSProperties}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-bone transition-all",
                isSelected
                  ? "border-ink shadow-md ring-1 ring-ink/15"
                  : "border-ink/10 hover:border-ink/25",
              )}
            >
              {/* Mini preview hero — uses the theme's actual hero variant */}
              <button
                type="button"
                onClick={() => setPreviewTheme(t.id)}
                aria-label={`Preview ${t.name}`}
                className="block w-full text-left"
              >
                <PreviewCard t={t} previewCurrentThemeId={currentThemeId} />
                <div className="px-3.5 pb-3.5 pt-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className="text-[13.5px] font-semibold tracking-[-0.01em]"
                      style={{ color: "var(--theme-ink)" }}
                    >
                      {t.name}
                    </p>
                    {t.isNew && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]"
                        style={{
                          backgroundColor: "var(--theme-primary)",
                          color: "var(--theme-bg)",
                        }}
                      >
                        New
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-0.5 line-clamp-1 text-[11px]"
                    style={{ color: "var(--theme-muted)" }}
                  >
                    {t.blurb}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {(["primary", "bg", "ink", "accent"] as const).map(
                      (k) =>
                        t.preview[k] ? (
                          <span
                            key={k}
                            className="h-3 w-3 rounded-full border border-ink/10"
                            style={{ backgroundColor: t.preview[k] }}
                            title={k}
                          />
                        ) : null,
                    )}
                    <span
                      className="ml-auto inline-flex items-center gap-0.5 text-[10.5px] font-semibold uppercase tracking-[0.15em] opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: "var(--theme-primary)" }}
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink/15 p-6 text-center text-[12.5px] text-ink/55">
          No themes match &ldquo;{query}&rdquo; in {category}.
        </p>
      )}

      {/* Selected theme summary + overrides */}
      <div
        className="rounded-2xl border p-4"
        style={{
          borderColor: "var(--theme-line, rgba(0,0,0,0.08))",
          backgroundColor: "var(--theme-bg, #fff)",
        }}
        data-theme={themeId}
      >
        <div
          className="mb-3 flex items-baseline justify-between"
          style={{ color: "var(--theme-ink)" }}
        >
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold">{selectedTheme.name}</p>
            {themeId === currentThemeId ? (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  backgroundColor: "var(--theme-muted)",
                  color: "var(--theme-bg)",
                }}
              >
                Live
              </span>
            ) : (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  backgroundColor: "var(--theme-accent-bg, rgba(0,0,0,0.05))",
                  color: "var(--theme-primary)",
                }}
              >
                Selected
              </span>
            )}
            <p
              className="hidden text-[12px] sm:block"
              style={{ color: "var(--theme-muted)" }}
            >
              {selectedTheme.category}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPreviewTheme(themeId)}
            data-theme={themeId}
            className="h-8"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview full
          </Button>
        </div>

        {/* Overrides */}
        <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55 mb-1.5">
              Custom primary colour
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primary || selectedTheme.preview.primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-9 w-10 cursor-pointer rounded-lg border border-ink/10 bg-white"
                aria-label="Primary color picker"
              />
              <Input
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                placeholder={selectedTheme.preview.primary}
                className="font-mono text-[12px]"
                maxLength={7}
              />
              {primary && (
                <button
                  type="button"
                  onClick={() => setPrimary("")}
                  aria-label="Clear custom color"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 text-ink/50 hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-ink/45">
              Override the theme&apos;s accent. Hex like{" "}
              <code className="text-ink/65">#FF4A1C</code>. Leave blank to
              use the preset.
            </p>
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55 mb-1.5">
              Custom font
            </label>
            <Input
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              placeholder={`Default: ${selectedTheme.fonts?.split(",")[0] ?? "Manrope"}`}
              className="font-mono text-[12px]"
              maxLength={120}
            />
            <p className="mt-1 text-[11px] text-ink/45">
              Override the theme&apos;s font. Any Google Font CSS stack
              (e.g. <code className="text-ink/65">&quot;Inter, sans-serif&quot;</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-ink/5">
        <button
          type="button"
          onClick={handleReset}
          disabled={pending}
          className="text-[12px] text-ink/55 hover:text-ink underline-offset-2 hover:underline disabled:opacity-40"
        >
          Reset to {THEMES[DEFAULT_THEME].name} default
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {error && (
            <p className="text-[12px] text-vermillion">{error}</p>
          )}
          {saved && !error && (
            <p className="flex items-center gap-1 text-[12px] text-vermillion">
              <Check className="h-3 w-3" strokeWidth={3} />
              Saved
            </p>
          )}
          <Button
            type="button"
            onClick={handleApply}
            disabled={pending || !isDirty}
            className="bg-vermillion"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Apply
          </Button>
        </div>
      </div>

      {/* Live preview modal */}
      <ThemePreviewModal
        open={previewTheme !== null}
        onOpenChange={(o) => !o && setPreviewTheme(null)}
        themes={THEMES}
        themeId={previewTheme ?? themeId}
        onThemeChange={(id) => setPreviewTheme(id)}
        storeSlug={storeSlug}
        storeName={store.name}
        ownerHandle={store.ownerHandle}
        heroKicker={store.heroKicker}
        heroHeadline={store.heroHeadline}
        heroSub={store.heroSub}
        heroImage={store.heroImage}
        sampleProducts={sampleProducts}
        overrides={{ primary, fontFamily }}
        currentThemeId={currentThemeId}
      />
    </section>
  );
}

// ── Mini preview card (lives inside the gallery) ────────────────

function PreviewCard({
  t,
  previewCurrentThemeId,
}: {
  t: (typeof THEME_LIST)[number];
  previewCurrentThemeId: ThemeId;
}) {
  const variant = t.heroVariant;
  const isFullBleed = variant === "full-bleed";
  const isCentered = variant === "centered";

  return (
    <div
      className="relative h-32 overflow-hidden"
      style={{ backgroundColor: "var(--theme-bg)" }}
    >
      {/* Subtle "fake content" shapes so the card always has texture */}
      {isFullBleed ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${t.preview.bg} 0%, ${t.preview.primary}22 100%)`,
            }}
          />
          <div
            className="absolute left-3 right-3 bottom-3 h-2 rounded"
            style={{ backgroundColor: t.preview.primary }}
          />
        </>
      ) : isCentered ? (
        <>
          <div
            className="mx-auto mt-3 h-12 w-12 rounded-md"
            style={{ backgroundColor: t.preview.primary, opacity: 0.85 }}
          />
          <div
            className="mx-auto mt-2 h-1.5 w-16 rounded-full"
            style={{ backgroundColor: t.preview.ink, opacity: 0.85 }}
          />
          <div
            className="mx-auto mt-1.5 h-1 w-10 rounded-full"
            style={{ backgroundColor: t.preview.ink, opacity: 0.3 }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute left-3 top-3 h-1.5 w-10 rounded-full"
            style={{ backgroundColor: t.preview.primary, opacity: 0.85 }}
          />
          <div
            className="absolute left-3 top-7 h-1.5 w-16 rounded-full"
            style={{ backgroundColor: t.preview.ink, opacity: 0.85 }}
          />
          <div
            className="absolute left-3 bottom-3 right-3 h-14 rounded"
            style={{
              background: `linear-gradient(135deg, ${t.preview.primary}33, ${t.preview.bg})`,
            }}
          />
        </>
      )}

      {/* Live indicator (only on the currently-applied theme) */}
      {t.id === previewCurrentThemeId && (
        <div
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.15em]"
          style={{
            backgroundColor: "var(--theme-ink)",
            color: "var(--theme-bg)",
          }}
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
          Live
        </div>
      )}
    </div>
  );
}

// Re-export for the unused-import warning workaround
export { addMonthsISO, formatDate };
