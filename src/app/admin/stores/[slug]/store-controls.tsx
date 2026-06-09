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
} from "@/app/admin/actions";

type Plan = "weekly" | "monthly" | "none";

function planLabel(p: Plan | undefined | null): string {
  if (p === "weekly") return "Pay-as-you-go (₹499/wk)";
  if (p === "monthly") return "Monthly (₹1,499/mo)";
  return "No plan";
}

export function StoreControls({
  storeSlug,
  initialPaused,
  initialPausedReason,
  currentPlan,
  applicationId,
  applicantEmail,
}: {
  storeSlug: string;
  initialPaused: boolean;
  initialPausedReason: string | undefined;
  currentPlan: Plan;
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

  // Delete state
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

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

      <section className="rounded-2xl border border-vermillion/20 bg-vermillion/[0.03] p-5">
        <p className="eyebrow-ink mb-3">Danger zone</p>
        {showDelete ? (
          <div className="space-y-3">
            <p className="text-[13px] text-ink/70">
              This will permanently delete the store, all products, orders,
              promos, and billing records. This cannot be undone.
            </p>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                Type <span className="font-mono text-vermillion">DELETE</span> to confirm
              </label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="mt-1 font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirm("");
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="vermillion"
                size="sm"
                onClick={onDelete}
                disabled={pending || deleteConfirm !== "DELETE"}
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
              Permanently remove this store and all its data.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDelete(true)}
              disabled={pending}
              className="flex-shrink-0 border-vermillion/30 text-vermillion hover:bg-vermillion/5"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.25} />
              Delete store
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
