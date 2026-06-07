"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateReturnsPolicyAction } from "@/app/dashboard/actions";
import type { ReturnsPolicy } from "@/types/storefront";

type Props = {
  storeSlug: string;
  policy: ReturnsPolicy;
};

const WINDOW_PRESETS = [3, 7, 14, 30];

export function ReturnsPolicyForm({ storeSlug, policy }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(policy.enabled);
  const [windowDays, setWindowDays] = useState<number>(policy.windowDays);
  const [mode, setMode] = useState<"any" | "defective_only">(policy.mode);
  const [policyText, setPolicyText] = useState(policy.policyText ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaved(false);
    startTransition(async () => {
      const res = await updateReturnsPolicyAction(storeSlug, {
        enabled: enabled ? "true" : "false",
        windowDays: String(windowDays),
        mode,
        policyText,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-ink/[0.07] bg-bone p-6 shadow-soft"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow-ink">Returns</p>
          <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-ink">
            Returns &amp; refunds
          </h2>
          <p className="mt-1 text-[13.5px] text-ink/55">
            Let customers request a return on a delivered order. The
            request needs your approval before any refund is recorded.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.05] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/65">
          <ShieldCheck className="h-3 w-3" strokeWidth={2.25} />
          Buyer-side form
        </span>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 bg-white p-4 transition-colors hover:border-ink/20">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-1 h-4 w-4 cursor-pointer accent-vermillion"
        />
        <span className="flex-1">
          <span className="block text-[14px] font-semibold text-ink">
            Accept returns on this shop
          </span>
          <span className="mt-0.5 block text-[12.5px] text-ink/55">
            Off by default. When off, customers won&rsquo;t see a
            &ldquo;Request return&rdquo; button on the order track page.
          </span>
        </span>
      </label>

      <div
        className={
          "mt-4 grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 " +
          (enabled ? "opacity-100" : "pointer-events-none opacity-50")
        }
      >
        <div>
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
            Window
          </span>
          <div className="flex flex-wrap gap-1.5">
            {WINDOW_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setWindowDays(d)}
                className={
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all " +
                  (windowDays === d
                    ? "bg-ink text-bone"
                    : "border border-ink/10 bg-white text-ink/60 hover:border-ink/30")
                }
              >
                {d} days
              </button>
            ))}
            <Input
              type="number"
              min={1}
              max={60}
              value={windowDays}
              onChange={(e) => setWindowDays(parseInt(e.target.value || "7", 10))}
              className="h-9 w-20 text-center text-[12px]"
              aria-label="Custom window"
            />
          </div>
          {fieldErrors.windowDays && (
            <p className="mt-1.5 text-[12px] text-vermillion">
              {fieldErrors.windowDays}
            </p>
          )}
        </div>

        <div>
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
            Accept
          </span>
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-ink/10 bg-white p-3 hover:border-ink/20">
              <input
                type="radio"
                name="returns-mode"
                value="any"
                checked={mode === "any"}
                onChange={() => setMode("any")}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-vermillion"
              />
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-ink">
                  Any reason
                </span>
                <span className="block text-[12px] text-ink/55">
                  Customer changed their mind, sizing, gift return.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-ink/10 bg-white p-3 hover:border-ink/20">
              <input
                type="radio"
                name="returns-mode"
                value="defective_only"
                checked={mode === "defective_only"}
                onChange={() => setMode("defective_only")}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-vermillion"
              />
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-ink">
                  Defective / wrong item only
                </span>
                <span className="block text-[12px] text-ink/55">
                  Damaged in transit, wrong size arrived, doesn&rsquo;t match listing.
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Policy text <span className="font-normal normal-case text-ink/40">(optional)</span>
        </span>
        <Textarea
          rows={3}
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
          placeholder="e.g. Items must be unused with original tags. Refunds processed within 5 business days of receipt."
          maxLength={800}
        />
        <p className="mt-1.5 text-[12px] text-ink/45">
          Shown to customers in the return form, so they know what to
          expect. Plain text, no markdown.
        </p>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" size="default" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save returns policy
            </>
          )}
        </Button>
        {saved && (
          <span className="text-[12.5px] text-ink/55">
            Saved.
          </span>
        )}
        {error && !Object.keys(fieldErrors).length && (
          <span className="text-[12.5px] text-vermillion">{error}</span>
        )}
      </div>
    </form>
  );
}
