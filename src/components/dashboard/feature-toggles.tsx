"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  toggleCustomOrdersFeatureAction,
  toggleServicesFeatureAction,
} from "@/app/dashboard/actions";

type FeatureKey = "customOrdersEnabled" | "servicesEnabled";

type Props = {
  storeSlug: string;
  enabled: boolean;
  /**
   * Which flag this toggle controls. Defaults to custom orders for
   * backwards compatibility with the settings page.
   */
  featureKey?: FeatureKey;
  /** Card heading (defaults to "Custom orders"). */
  title?: string;
  /** Card body copy. */
  description?: string;
  /** Override the leading icon. */
  icon?: React.ReactNode;
};

const COPY: Record<
  FeatureKey,
  { title: string; description: string; onCopy: string }
> = {
  customOrdersEnabled: {
    title: "Custom orders",
    description:
      "Let customers fill out a form you design (cake sizes, gift wrap, embroidery text, etc.) and submit a custom request. They pay via your existing UPI flow, and you review each request in the dashboard.",
    onCopy:
      "Custom orders are on. Manage your templates and incoming orders from the sidebar.",
  },
  servicesEnabled: {
    title: "Service bookings",
    description:
      "Let customers pick a time slot and book a service from your storefront — for massages, cleanings, consultations, anything that runs on appointments instead of shipping.",
    onCopy:
      "Service bookings are on. Manage your services and slots from the sidebar.",
  },
};

export function FeatureToggles({
  storeSlug: _storeSlug,
  enabled,
  featureKey = "customOrdersEnabled",
  title,
  description,
  icon,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isOn, setIsOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const copy = COPY[featureKey];
  const heading = title ?? copy.title;
  const body = description ?? copy.description;

  function handleToggle() {
    const next = !isOn;
    setIsOn(next); // optimistic
    setError(null);
    startTransition(async () => {
      const action =
        featureKey === "servicesEnabled"
          ? toggleServicesFeatureAction(next)
          : toggleCustomOrdersFeatureAction(next);
      const result = await action;
      if (!result.ok) {
        setIsOn(!next); // revert
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-bone p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon ?? (
            <div className="h-5 w-5 rounded-full bg-vermillion/15 mt-1 shrink-0" />
          )}
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{heading}</h2>
            <p className="mt-1 text-[12.5px] text-ink/55 max-w-md">{body}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          aria-pressed={isOn}
          className={
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors " +
            (isOn ? "bg-vermillion" : "bg-ink/15") +
            (pending ? " opacity-60 cursor-not-allowed" : "")
          }
        >
          <span
            className={
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 " +
              (isOn ? "translate-x-5" : "translate-x-0.5")
            }
          />
          {pending && (
            <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-ink/40" />
          )}
        </button>
      </div>

      {isOn && (
        <div className="mt-4 pt-4 border-t border-ink/5">
          <p className="text-[12.5px] text-ink/55">{copy.onCopy}</p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-[12px] text-vermillion">{error}</p>
      )}
    </section>
  );
}