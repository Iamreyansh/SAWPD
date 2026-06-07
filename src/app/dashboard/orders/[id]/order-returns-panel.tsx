"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2, Check, X, RefreshCcw, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { decideReturnAction } from "@/app/dashboard/actions";
import { formatINR, cn } from "@/lib/utils";
import type { ReturnRequest } from "@/lib/returns";

type Props = {
  storeSlug: string;
  orderId: string;
  returns: ReturnRequest[];
};

const STATUS_STYLES: Record<
  ReturnRequest["status"],
  { label: string; chip: string; dot: string }
> = {
  pending: {
    label: "Pending",
    chip: "bg-ink/[0.06] text-ink",
    dot: "bg-ink/60",
  },
  approved: {
    label: "Approved",
    chip: "bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-600",
  },
  rejected: {
    label: "Rejected",
    chip: "bg-vermillion/10 text-vermillion",
    dot: "bg-vermillion",
  },
  refunded: {
    label: "Refunded",
    chip: "bg-ink/[0.06] text-ink",
    dot: "bg-ink",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export type PanelProps = Omit<Props, "storeSlug" | "orderId">;

export function OrderReturnsPanel({ returns }: PanelProps) {
  return (
    <section className="rounded-2xl border border-ink/[0.07] bg-bone p-6 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow-ink">Returns</p>
          <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-ink">
            Return requests on this order
          </h2>
        </div>
        {returns.length > 0 && (
          <span className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-ink/60">
            {returns.length} request{returns.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {returns.length === 0 ? (
        <p className="rounded-xl border border-ink/10 bg-white px-4 py-3 text-[13px] text-ink/55">
          No return requests yet. If you&rsquo;ve enabled returns in{" "}
          <span className="font-semibold text-ink">Settings</span>, the
          customer can request one from the order&rsquo;s track page.
        </p>
      ) : (
        <ul className="space-y-3">
          {returns.map((r) => (
            <ReturnRow key={r.id} req={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReturnRow({ req }: { req: ReturnRequest }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<ReturnRequest["status"]>(req.status);
  const [note, setNote] = useState(req.decisionNote ?? "");
  const [refundAmount, setRefundAmount] = useState<string>(
    String(req.refundAmount ?? req.amountInr)
  );
  const [error, setError] = useState<string | null>(null);

  const decide = (next: "approved" | "rejected" | "refunded") => {
    setError(null);
    startTransition(async () => {
      const res = await decideReturnAction({
        id: req.id,
        status: next,
        note: note.trim() || undefined,
        refundAmount:
          next === "refunded" ? Number(refundAmount) || req.amountInr : undefined,
      });
      if (res.ok) {
        setStatus(next);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const s = STATUS_STYLES[status];

  return (
    <li className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">
            {req.productTitle}{" "}
            <span className="text-ink/50">× {req.qty}</span>
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink/55">
            Requested {formatDate(req.requestedAt)} ·{" "}
            {formatINR(req.amountInr)}
          </p>
          <p className="mt-2 rounded-lg bg-bone/70 px-3 py-2 text-[13px] italic text-ink/70">
            &ldquo;{req.reason}&rdquo;
          </p>
          {req.decidedAt && (
            <p className="mt-2 text-[12px] text-ink/45">
              Decided {formatDate(req.decidedAt)}
              {req.refundAmount != null && status === "refunded" && (
                <> · Refund {formatINR(req.refundAmount)}</>
              )}
              {req.decisionNote && <> · &ldquo;{req.decisionNote}&rdquo;</>}
            </p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.15em]",
            s.chip
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
          {s.label}
        </span>
      </div>

      {status === "pending" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/5 pt-3">
          {!open ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
                disabled={pending}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Decide
              </Button>
              <p className="text-[12px] text-ink/45">
                Approve, reject, or mark as refunded.
              </p>
            </>
          ) : (
            <div className="w-full space-y-3">
              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Note to yourself <span className="font-normal text-ink/40">(optional)</span>
                </span>
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Spoke with customer, they’ll courier it back."
                  maxLength={500}
                />
              </div>
              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Refund amount
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] text-ink/55">
                    <IndianRupee className="inline h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="h-9 w-32"
                  />
                  <span className="text-[12px] text-ink/45">
                    (order total for this line: {formatINR(req.amountInr)})
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  disabled={pending}
                  onClick={() => decide("approved")}
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => decide("refunded")}
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Mark refunded
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => decide("rejected")}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                {error && (
                  <span className="text-[12.5px] text-vermillion">{error}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
