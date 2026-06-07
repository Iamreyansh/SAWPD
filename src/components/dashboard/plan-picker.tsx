"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { choosePlanAction } from "@/app/dashboard/actions";

type Props = {
  storeSlug: string;
  currentPlan: "weekly" | "monthly" | null;
};

type PlanCard = {
  id: "weekly" | "monthly";
  label: string;
  amountInr: number;
  periodDays: number;
  tagline: string;
  bullets: string[];
};

const PLANS: PlanCard[] = [
  {
    id: "weekly",
    label: "Pay-as-you-go",
    amountInr: 499,
    periodDays: 7,
    tagline: "Per week · cancel anytime",
    bullets: [
      "Up to 50 orders / week",
      "Custom domain support",
      "Promo codes & discounts",
    ],
  },
  {
    id: "monthly",
    label: "Monthly",
    amountInr: 1499,
    periodDays: 30,
    tagline: "Per month · save 25%",
    bullets: [
      "Unlimited orders",
      "Priority support",
      "Promo codes & CSV exports",
    ],
  },
];

export function PlanPicker({ storeSlug, currentPlan }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingPlan, setPendingPlan] = useState<"weekly" | "monthly" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    plan: "weekly" | "monthly";
    reference: string;
  } | null>(null);

  const choose = (plan: "weekly" | "monthly") => {
    setError(null);
    setConfirmation(null);
    setPendingPlan(plan);
    startTransition(async () => {
      const result = await choosePlanAction(storeSlug, { plan });
      if (result.ok) {
        setConfirmation({ plan: result.plan, reference: result.reference });
        router.refresh();
      } else {
        setError(result.error);
      }
      setPendingPlan(null);
    });
  };

  return (
    <section className="rounded-2xl border border-ink/[0.07] bg-bone p-6 shadow-soft">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow-ink">Plan</p>
          <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-ink">
            Activate your shop
          </h2>
          <p className="mt-1 text-[13.5px] text-ink/55">
            We&rsquo;re in early access — pick a plan to unlock order taking.
            No card, no payment collected yet. You&rsquo;ll be billed when we
            open paid plans.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-vermillion/[0.08] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-vermillion-deep">
          <Sparkles className="h-3 w-3" strokeWidth={2.25} />
          Early access
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <div
              key={p.id}
              className={
                "rounded-2xl border bg-white p-5 transition-all " +
                (isCurrent
                  ? "border-ink shadow-soft"
                  : "border-ink/10")
              }
            >
              <div className="flex items-baseline justify-between">
                <p className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                  {p.label}
                </p>
                {isCurrent && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-bone">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12.5px] text-ink/55">{p.tagline}</p>
              <p className="mt-4 text-2xl font-bold tabular-nums tracking-[-0.02em] text-ink">
                ₹{p.amountInr.toLocaleString("en-IN")}
                <span className="ml-1 text-[12.5px] font-medium text-ink/50">
                  / {p.periodDays} days
                </span>
              </p>
              <ul className="mt-4 space-y-1.5 text-[13px] text-ink/65">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-vermillion"
                      strokeWidth={2.5}
                    />
                    {b}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="default"
                variant={isCurrent ? "outline" : "default"}
                className="mt-5 w-full"
                disabled={pending}
                onClick={() => choose(p.id)}
              >
                {pending && pendingPlan === p.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Activating…
                  </>
                ) : isCurrent ? (
                  "Renew plan"
                ) : (
                  `Choose ${p.label}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-2.5 text-[13px] text-vermillion">
          {error}
        </p>
      )}
      {confirmation && (
        <div className="mt-4 rounded-xl border border-ink/15 bg-ink/[0.04] px-4 py-3 text-[13px] text-ink">
          <p>
            <span className="font-semibold">
              {confirmation.plan === "weekly" ? "Pay-as-you-go" : "Monthly"} plan active.
            </span>{" "}
            Order taking is unlocked. Reference:{" "}
            <span className="font-mono text-ink/70">{confirmation.reference}</span>
          </p>
        </div>
      )}
    </section>
  );
}
