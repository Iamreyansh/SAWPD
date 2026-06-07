"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decideAction } from "@/app/admin/actions";

export function DecisionPanel({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reviewerNote, setReviewerNote] = useState("");

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const result = await decideAction({
        applicationId,
        decision: "approved",
        reviewerNote: reviewerNote.trim(),
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const reject = () => {
    setError(null);
    if (!reviewerNote.trim()) {
      setError("A reason is required when rejecting.");
      return;
    }
    startTransition(async () => {
      const result = await decideAction({
        applicationId,
        decision: "rejected",
        reviewerNote: reviewerNote.trim(),
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <section className="rounded-2xl border-2 border-ink/10 bg-bone p-6">
      <p className="eyebrow mb-3">Decision</p>

      <label className="block">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Note to applicant (required for reject, optional for approve)
        </span>
        <Textarea
          value={reviewerNote}
          onChange={(e) => setReviewerNote(e.target.value)}
          placeholder="e.g. 'Welcome aboard — your trial is live for 14 days. Pick a plan before then.'"
        />
      </label>

      {error && (
        <p className="mt-3 rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-2.5 text-[13px] text-vermillion">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-ink/55">
          Approving starts a 14-day trial.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {showRejectForm ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => {
                  setShowRejectForm(false);
                  setError(null);
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="default"
                onClick={reject}
                disabled={pending || !reviewerNote.trim()}
                className="bg-ink text-bone hover:bg-ink/90"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" strokeWidth={2.25} />
                )}
                Confirm reject
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => setShowRejectForm(true)}
                disabled={pending}
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
                Reject
              </Button>
              <Button
                type="button"
                size="default"
                variant="vermillion"
                onClick={approve}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                )}
                Approve · Start 14d trial
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
