"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Loader2, ArrowRight } from "lucide-react";
import { dismissOnboardingAction } from "@/app/dashboard/actions";

type Step = {
  key: "product" | "upi" | "hero" | "promo";
  label: string;
  done: boolean;
  href: string;
  cta: string;
};

export function OnboardingBanner({
  initialSteps,
}: {
  initialSteps: Step[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const [steps] = useState(initialSteps);
  const remaining = steps.filter((s) => !s.done).length;
  const done = remaining === 0;

  if (!open) return null;

  function dismiss() {
    setOpen(false);
    startTransition(async () => {
      await dismissOnboardingAction();
      router.refresh();
    });
  }

  if (done) {
    return (
      <section className="rounded-2xl border border-ink/10 bg-ink p-6 text-bone shadow-md md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-vermillion">All set</p>
            <p className="mt-2 text-[18px] font-semibold tracking-[-0.01em]">
              Your shop is ready to take orders.
            </p>
            <p className="mt-1 text-[13px] text-bone/55">
              Share your link in your Instagram bio and the first order could be minutes away.
            </p>
          </div>
          <Link
            href={`/dashboard/products`}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-vermillion px-5 text-[13.5px] font-semibold text-bone transition-all hover:bg-vermillion-deep active:scale-[0.98] shadow-glow"
          >
            Add a product
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </section>
    );
  }

  const pct = Math.round(((steps.length - remaining) / steps.length) * 100);

  return (
    <section className="rounded-2xl border border-ink/10 bg-bone p-5 shadow-soft md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">Welcome to SAWPD</p>
            <span className="text-[11.5px] font-semibold text-ink/55">
              {steps.length - remaining}/{steps.length} done · {pct}%
            </span>
          </div>
          <p className="mt-2 text-[17px] font-semibold tracking-[-0.01em] text-ink">
            {remaining === 1
              ? "One thing left to launch your shop."
              : `${remaining} things to do to launch your shop.`}
          </p>
          <p className="mt-1 text-[13px] text-ink/55">
            Take it at your pace. You can dismiss this any time.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="rounded-full p-1.5 text-ink/40 transition-colors hover:bg-ink/[0.05] hover:text-ink"
          aria-label="Dismiss onboarding"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
        <div
          className="h-full rounded-full bg-vermillion transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="mt-5 space-y-1.5">
        {steps.map((s) => (
          <li
            key={s.key}
            className={
              "group flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors " +
              (s.done
                ? "border-ink/[0.06] bg-ink/[0.02]"
                : "border-ink/[0.07] bg-bone hover:border-ink/15")
            }
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className={
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full " +
                  (s.done
                    ? "bg-vermillion/15 text-vermillion"
                    : "border border-ink/15 text-ink/50")
                }
              >
                {s.done ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <span className="text-[11px] font-semibold">·</span>
                )}
              </span>
              <p
                className={
                  "truncate text-[13.5px] font-medium " +
                  (s.done ? "text-ink/40 line-through" : "text-ink")
                }
              >
                {s.label}
              </p>
            </div>
            {!s.done && (
              <Link
                href={s.href}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1 rounded-full bg-ink/[0.06] px-3 text-[12px] font-semibold text-ink transition-colors hover:bg-ink/[0.1]"
              >
                {s.cta}
                <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export type { Step as OnboardingStep };
