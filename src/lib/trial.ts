import "server-only";
import type { SellerStore } from "@/types/seller";

/**
 * A store is "active" (can take orders) when:
 *  - It is not explicitly paused by an admin, AND
 *  - It has a paid plan ("weekly" or "monthly"), OR
 *  - It has no plan and the trial window hasn't ended.
 *
 * Stores with no `plan` and an expired `trialEndsAt` are read-only. Stores
 * manually paused by an admin are read-only regardless of plan state.
 */
export type TrialState = {
  active: boolean;
  daysLeft: number | null;
  planLabel: "Pay-as-you-go" | "Monthly" | "Free trial" | "Trial ended" | "Suspended";
  reason: "paid" | "trial" | "trial_ended" | "no_plan" | "suspended";
};

export function getTrialState(store: SellerStore, now = new Date()): TrialState {
  if (store.paused) {
    return {
      active: false,
      daysLeft: null,
      planLabel: "Suspended",
      reason: "suspended",
    };
  }
  if (store.plan === "weekly" || store.plan === "monthly") {
    return {
      active: true,
      daysLeft: null,
      planLabel: store.plan === "weekly" ? "Pay-as-you-go" : "Monthly",
      reason: "paid",
    };
  }
  if (!store.trialEndsAt) {
    return {
      active: false,
      daysLeft: null,
      planLabel: "Free trial",
      reason: "no_plan",
    };
  }
  const ms = new Date(store.trialEndsAt).getTime() - now.getTime();
  const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  if (ms <= 0) {
    return {
      active: false,
      daysLeft: 0,
      planLabel: "Trial ended",
      reason: "trial_ended",
    };
  }
  return {
    active: true,
    daysLeft: days,
    planLabel: "Free trial",
    reason: "trial",
  };
}

export function isStoreOpen(store: SellerStore, now = new Date()): boolean {
  return getTrialState(store, now).active;
}
