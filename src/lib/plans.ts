import "server-only";
import type { SellerStore } from "@/types/seller";

export type PlanId = "weekly" | "monthly";

export const PLAN_PRICING: Record<
  PlanId,
  { label: string; amountInr: number; periodDays: number; tagline: string }
> = {
  weekly: {
    label: "Pay-as-you-go",
    amountInr: 499,
    periodDays: 7,
    tagline: "Per week · cancel anytime",
  },
  monthly: {
    label: "Monthly",
    amountInr: 1499,
    periodDays: 30,
    tagline: "Per month · save 25%",
  },
};

export type BillingRecord = {
  id: string;
  storeSlug: string;
  plan: PlanId;
  amountInr: number;
  createdAt: string;
  // Activation receipt (we're not collecting payment during early access,
  // so this is a no-charge record). Replace with a real gateway ref when
  // we wire up Razorpay.
  reference: string;
};

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36).slice(-4);
  return `${prefix}_${rand}${ts}`;
}

export function nextRenewalIso(plan: PlanId, now = new Date()): string {
  const ms = PLAN_PRICING[plan].periodDays * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() + ms).toISOString();
}

export function isActiveSubscription(
  store: SellerStore,
  now = new Date()
): { active: boolean; renewsAt: string | null } {
  if (store.plan === "weekly" || store.plan === "monthly") {
    if (!store.trialEndsAt) {
      // Paid plan without a renewal date — assume active.
      return { active: true, renewsAt: null };
    }
    const end = new Date(store.trialEndsAt).getTime();
    if (end > now.getTime()) {
      return { active: true, renewsAt: store.trialEndsAt };
    }
    return { active: false, renewsAt: store.trialEndsAt };
  }
  return { active: false, renewsAt: null };
}

export function planReference(): string {
  // EA- prefix: early access, no payment taken. Swap for a real gateway
  // ref (e.g. Razorpay `pay_…` or `sub_…`) when billing goes live.
  return `EA-${generateId("rcp").toUpperCase()}`;
}

export function newBillingId(): string {
  return generateId("bill");
}
