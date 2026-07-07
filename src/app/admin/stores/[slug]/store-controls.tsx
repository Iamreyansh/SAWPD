"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pause,
  Play,
  Loader2,
  Check,
  Mail,
  ShoppingBag,
  Trash2,
  KeyRound,
  Gift,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  suspendStoreAction,
  reactivateStoreAction,
  changeStorePlanAction,
  adminForceLowStockAction,
  emailApplicantAction,
  deleteStoreAction,
  setStoreAccessAction,
  purgeInactiveStoreAction,
} from "@/app/admin/actions";

type Plan = "weekly" | "monthly" | "none";

function planLabel(p: Plan | undefined | null): string {
  if (p === "weekly") return "Pay-as-you-go (₹499/wk)";
  if (p === "monthly") return "Monthly (₹1,499/mo)";
  return "No plan";
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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

export function StoreControls({
  storeSlug,
  initialPaused,
  initialPausedReason,
  currentPlan,
  currentTrialEndsAt,
  isInactive,
  applicationId,
  applicantEmail,
}: {
  storeSlug: string;
  initialPaused: boolean;
  initialPausedReason: string | undefined;
  currentPlan: Plan;
  currentTrialEndsAt?: string | null;
  isInactive: boolean;
  applicationId?: string;
  applicantEmail?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paused, setPaused] = useState(initialPaused);
  const [pauseReason, setPauseReason] = useState(initialPausedReason ?? "");
  const [plan, setPlan] = useState<Plan>(currentPlan);
  const [showPauseForm, setShowPauseForm] = useState(false);

  // Email applicant state
  const [showEmail, setShowEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const [emailSent, setEmailSent] = useState(false);

  // Delete state (legacy)
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Subscription override state
  const [showOverride, setShowOverride] = useState(false);
  const [overridePlan, setOverridePlan] = useState<Plan>(currentPlan);
  const [overrideExpiry, setOverrideExpiry] = useState<string>(
    addMonthsISO(3),
  );
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNote, setOverrideNote] = useState("");

  // Purge state (inactive only)
  const [showPurge, setShowPurge] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const [purgeReason, setPurgeReason] = useState("");

  function flashError(msg: string) {
    setError(msg);
    setSuccess(null);
  }
  function flashSuccess(msg: string) {
    setSuccess(msg);
    setError(null);
  }

  function onSuspend() {
    setError(null);
    startTransition(async () => {
      const res = await suspendStoreAction({ storeSlug, reason: pauseReason });
      if (!res.ok) {
        flashError(res.error);
      } else {
        setPaused(true);
        setShowPauseForm(false);
        flashSuccess("Store suspended. Storefront now read-only.");
        router.refresh();
      }
    });
  }
  function onReactivate() {
    setError(null);
    startTransition(async () => {
      const res = await reactivateStoreAction({ storeSlug, reason: "" });
      if (!res.ok) {
        flashError(res.error);
      } else {
        setPaused(false);
        setPauseReason("");
        flashSuccess("Store reactivated.");
        router.refresh();
      }
    });
  }
  function onChangePlan(target: Plan) {
    setError(null);
    startTransition(async () => {
      const res = await changeStorePlanAction({ storeSlug, plan: target });
      if (!res.ok) {
        flashError(res.error);
      } else {
        setPlan(target);
        flashSuccess(
          target === "none"
            ? "Plan removed. Store is back on a free trial."
            : `Plan set to ${planLabel(target)}.`
        );
        router.refresh();
      }
    });
  }
  function onForceLowStock() {
    setError(null);
    startTransition(async () => {
      const res = await adminForceLowStockAction(storeSlug);
      if (!res.ok) {
        flashError(res.error);
      } else {
        flashSuccess(
          res.count === 0
            ? "Nothing to alert — store is well stocked."
            : `Sent low-stock notice for ${res.count} product${res.count === 1 ? "" : "s"}.`
        );
      }
    });
  }
  function onSendEmail() {
    setEmailErrors({});
    setEmailSent(false);
    if (!applicationId || !applicantEmail) {
      setEmailErrors({ _: "No application linked to this store." });
      return;
    }
    startTransition(async () => {
      const res = await emailApplicantAction({
        applicationId,
        subject: emailSubject,
        body: emailBody,
      });
      if (!res.ok) {
        if (res.fieldErrors) setEmailErrors(res.fieldErrors);
        flashError(res.error);
      } else {
        setEmailSent(true);
        setShowEmail(false);
        setEmailSubject("");
        setEmailBody("");
        flashSuccess(`Email queued for ${applicantEmail}.`);
        router.refresh();
      }
    });
  }
  function onDelete() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await deleteStoreAction({ storeSlug, confirm: deleteConfirm });
      if (!res.ok) {
        flashError(res.error);
      } else {
        router.push("/admin/stores");
        return;
      }
    });
  }
  function onApplyOverride() {
    setError(null);
    setSuccess(null);
    if (overrideReason.trim().length < 3) {
      flashError("Add a reason (for audit).");
      return;
    }
    startTransition(async () => {
      const res = await setStoreAccessAction({
        storeSlug,
        plan: overridePlan,
        expiresAt: overridePlan === "none" ? overrideExpiry : "",
        reason: overrideReason.trim(),
        note: overrideNote.trim() || undefined,
      });
      if (!res.ok) {
        flashError(res.error);
        return;
      }
      flashSuccess(
        res.trialEndsAt
          ? `Access set until ${formatDate(res.trialEndsAt)}.`
          : "Access set with no expiry.",
      );
      setPlan(overridePlan);
      setShowOverride(false);
      setOverrideReason("");
      setOverrideNote("");
      router.refresh();
    });
  }
  function onPurge() {
    setError(null);
    setSuccess(null);
    if (purgeReason.trim().length < 3) {
      flashError("Add a reason (for audit).");
      return;
    }
    startTransition(async () => {
      const res = await purgeInactiveStoreAction({
        storeSlug,
        confirm: purgeConfirm,
        reason: purgeReason.trim(),
      });
      if (!res.ok) {
        flashError(res.error);
        return;
      }
      router.push("/admin/stores");
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-2.5 text-[13px] text-vermillion">
          {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-ink/[0.03] px-4 py-2.5 text-[13px] text-ink">
          <Check className="h-3.5 w-3.5 text-vermillion" strokeWidth={2.5} />
          {success}
        </p>
      )}

      <section className="rounded-2xl border border-ink/10 bg-bone p-5">
        <p className="eyebrow-ink mb-3">Store state</p>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span
            className={
              "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] " +
              (paused
                ? "bg-vermillion/10 text-vermillion"
                : "bg-ink/[0.06] text-ink")
            }
          >
            {paused ? "Suspended" : "Live"}
          </span>
          {paused && initialPausedReason && (
            <span className="text-ink/60">
              Reason: <span className="text-ink">{initialPausedReason}</span>
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {paused ? (
            <Button
              type="button"
              variant="vermillion"
              size="sm"
              onClick={onReactivate}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" strokeWidth={2.25} />
              )}
              Reactivate
            </Button>
          ) : showPauseForm ? (
            <>
              <Textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Reason (optional, internal only — e.g. 'awaiting payment confirmation')"
                rows={2}
                className="min-w-0 flex-1"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowPauseForm(false);
                    setPauseReason(initialPausedReason ?? "");
                  }}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="vermillion"
                  size="sm"
                  onClick={onSuspend}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4" strokeWidth={2.25} />
                  )}
                  Confirm suspend
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPauseForm(true)}
              disabled={pending}
            >
              <Pause className="h-4 w-4" strokeWidth={2.25} />
              Suspend
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-bone p-5">
        <p className="eyebrow-ink mb-3">Plan override</p>
        <p className="mb-3 text-[12.5px] text-ink/55">
          Current: <span className="text-ink">{planLabel(plan)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {(["weekly", "monthly", "none"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              variant={plan === p ? "vermillion" : "outline"}
              size="sm"
              onClick={() => onChangePlan(p)}
              disabled={pending || plan === p}
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {planLabel(p)}
            </Button>
          ))}
        </div>
        {plan !== "none" && (
          <p className="mt-3 text-[11.5px] text-ink/45">
            Plan change records a billing entry and resets the renewal date.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-bone p-5">
        <p className="eyebrow-ink mb-3">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onForceLowStock}
            disabled={pending}
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={2} />
            Force low-stock notify
          </Button>
          {applicationId && applicantEmail && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowEmail((s) => !s);
                setEmailSent(false);
              }}
              disabled={pending}
            >
              <Mail className="h-4 w-4" strokeWidth={2} />
              {showEmail ? "Close email" : `Email ${applicantEmail}`}
            </Button>
          )}
        </div>
        {showEmail && applicantEmail && (
          <div className="mt-4 space-y-3">
            <p className="text-[12px] text-ink/55">
              Sending to <span className="font-mono text-ink">{applicantEmail}</span>. The
              message is logged but not actually emailed (no provider wired yet).
            </p>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                Subject
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className={
                  "mt-1 w-full rounded-xl border bg-bone px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-ink/40 " +
                  (emailErrors.subject ? "border-vermillion/40" : "border-ink/15")
                }
                placeholder="Quick question about your shop"
              />
              {emailErrors.subject && (
                <p className="mt-1 text-[12px] text-vermillion">{emailErrors.subject}</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                Message
              </label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                className={
                  "mt-1 " + (emailErrors.body ? "border-vermillion/40" : "")
                }
                placeholder="Hi — just checking in on your SAWPD setup. Anything I can help with?"
              />
              {emailErrors.body && (
                <p className="mt-1 text-[12px] text-vermillion">{emailErrors.body}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="vermillion"
                size="sm"
                onClick={onSendEmail}
                disabled={pending || !emailSubject.trim() || !emailBody.trim()}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" strokeWidth={2} />
                )}
                Send & log
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEmail(false);
                  setEmailErrors({});
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              {emailSent && (
                <span className="flex items-center gap-1.5 text-[12px] text-ink/60">
                  <Check className="h-3 w-3 text-vermillion" strokeWidth={2.5} />
                  Sent
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Subscription override (giveaway / extension) ─────────── */}
      <section className="rounded-2xl border border-ink/10 bg-bone p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-ink/55" />
          <p className="eyebrow-ink">Subscription override</p>
        </div>
        <p className="mb-3 text-[12.5px] text-ink/55">
          For giveaways, trials, or comp accounts. Stamps the plan + an
          access-expiry date (or no expiry for permanent). Logged to the
          audit trail; the seller is emailed.
        </p>
        <p className="mb-3 text-[12px] text-ink/50">
          Current: <span className="text-ink">{planLabel(plan)}</span>
          {currentTrialEndsAt !== undefined && (
            <>
              {" · access until "}
              <span className="text-ink">
                {currentTrialEndsAt ? formatDate(currentTrialEndsAt) : "no expiry"}
              </span>
            </>
          )}
        </p>

        {showOverride ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55 mb-1.5">
                  Plan
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["none", "weekly", "monthly"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setOverridePlan(p)}
                      disabled={pending}
                      className={
                        "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors " +
                        (overridePlan === p
                          ? "border-vermillion bg-vermillion text-bone"
                          : "border-ink/15 bg-white text-ink hover:border-ink/40")
                      }
                    >
                      {planLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55 mb-1.5">
                  {overridePlan === "none" ? "Access expires" : "Renewal date"}
                </label>
                {overridePlan === "none" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={overrideExpiry}
                      onChange={(e) => setOverrideExpiry(e.target.value)}
                      className="h-9 rounded-lg border border-ink/15 bg-white px-2.5 text-[13px] outline-none focus:border-ink/40"
                    />
                    <button
                      type="button"
                      onClick={() => setOverrideExpiry("")}
                      disabled={pending}
                      title="Clear — no expiry (permanent)"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-ink/55 hover:text-ink hover:border-ink/30"
                    >
                      <InfinityIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-[12.5px] text-ink/55">
                    Auto-set to 30 days from today (matches monthly cadence).
                  </p>
                )}
                {overridePlan === "none" && (
                  <p className="mt-1 text-[11px] text-ink/45">
                    Leave the date blank and tap ∞ for a permanent
                    giveaway.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55 mb-1.5">
                Reason (audit)
              </label>
              <Input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder='e.g. "Q4 launch giveaway", "Partnership pilot"'
                maxLength={280}
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55 mb-1.5">
                Note to seller (optional)
              </label>
              <Textarea
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="Visible in the email we send to the seller."
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowOverride(false);
                  setOverrideReason("");
                  setOverrideNote("");
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="vermillion"
                size="sm"
                onClick={onApplyOverride}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                Apply override
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowOverride(true)}
            disabled={pending}
          >
            <KeyRound className="h-4 w-4" />
            Override access
          </Button>
        )}
      </section>

      <section className="rounded-2xl border border-vermillion/20 bg-vermillion/[0.03] p-5">
        <p className="eyebrow-ink mb-3">Danger zone</p>

        {!isInactive ? (
          <div className="rounded-xl border border-ink/10 bg-bone p-3">
            <p className="text-[12.5px] text-ink/60">
              This store is currently <strong className="text-ink">active</strong>.
              Permanent delete is only available on inactive stores — pause
              it from the <em>Store state</em> panel above first. Once the
              trial lapses or you suspend the shop, the purge option unlocks.
            </p>
          </div>
        ) : showPurge ? (
          <div className="space-y-3">
            <p className="text-[13px] text-ink/70">
              Purges the store and every related row (products, orders,
              promos, billing, returns, service slots, custom orders,
              templates, images). Logged to the audit trail. This cannot
              be undone.
            </p>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                Type <span className="font-mono text-vermillion">PURGE</span> to confirm
              </label>
              <Input
                value={purgeConfirm}
                onChange={(e) => setPurgeConfirm(e.target.value)}
                placeholder="PURGE"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                Reason (audit)
              </label>
              <Input
                value={purgeReason}
                onChange={(e) => setPurgeReason(e.target.value)}
                placeholder='e.g. "Inactive 90+ days", "Duplicate of /s/riya"'
                maxLength={280}
                className="mt-1"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPurge(false);
                  setPurgeConfirm("");
                  setPurgeReason("");
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="vermillion"
                size="sm"
                onClick={onPurge}
                disabled={
                  pending ||
                  purgeConfirm !== "PURGE" ||
                  purgeReason.trim().length < 3
                }
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                )}
                Permanently delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-ink/55">
              Store is inactive. Remove it and all its data permanently.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPurge(true)}
              disabled={pending}
              className="flex-shrink-0 border-vermillion/30 text-vermillion hover:bg-vermillion/5"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.25} />
              Permanently delete
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
