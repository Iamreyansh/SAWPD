"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Undo2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatINR, cn } from "@/lib/utils";
import { requestReturnAction } from "./actions";

type Line = { productId: string; title: string; price: number; qty: number };

type ExistingReturn = {
  id: string;
  status: string;
  productTitle: string;
  qty: number;
  requestedAt: string;
};

type Policy = {
  enabled: boolean;
  windowDays: number;
  mode: "any" | "defective_only";
  policyText?: string;
};

type Props = {
  orderId: string;
  phone: string;
  lines: Line[];
  existing: ExistingReturn[];
  policy: Policy | null | undefined;
  orderStatus: string;
};

const STATUS_STYLES: Record<string, { label: string; chip: string; dot: string }> = {
  pending: { label: "Pending review", chip: "bg-ink/[0.06] text-ink", dot: "bg-ink/60" },
  approved: { label: "Approved", chip: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" },
  rejected: { label: "Rejected", chip: "bg-vermillion/10 text-vermillion", dot: "bg-vermillion" },
  refunded: { label: "Refunded", chip: "bg-ink/[0.06] text-ink", dot: "bg-ink" },
};

export function TrackReturnsCard({
  orderId,
  phone,
  lines,
  existing,
  policy,
  orderStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string>(lines[0]?.productId ?? "");
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const line = lines.find((l) => l.productId === productId);
  const maxQty = line?.qty ?? 1;

  const eligible =
    !!policy?.enabled &&
    (orderStatus === "shipped" || orderStatus === "completed");

  if (existing.length > 0) {
    return (
      <div className="rounded-2xl border border-ink/[0.07] bg-bone p-6 shadow-soft">
        <p className="eyebrow-ink">Returns</p>
        <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
          Your return requests
        </h2>
        <ul className="mt-3 space-y-2.5">
          {existing.map((r) => {
            const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.pending;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">
                    {r.productTitle} <span className="text-ink/50">× {r.qty}</span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink/55">
                    Filed {new Date(r.requestedAt).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}
                  </p>
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
              </li>
            );
          })}
        </ul>
        {eligible && (
          <button
            onClick={() => setOpen(!open)}
            className="mt-3 text-[12px] font-semibold uppercase tracking-[0.15em] text-vermillion hover:underline"
          >
            {open ? "Hide form" : "Request another return"}
          </button>
        )}
        {open && <ReturnForm />}
      </div>
    );
  }

  if (!eligible) {
    if (policy && !policy.enabled) return null;
    return null;
  }

  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-bone p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow-ink">Returns</p>
          <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Need to return something?
          </h2>
          <p className="mt-1 text-[12.5px] text-ink/55">
            {policy.mode === "any"
              ? `This shop accepts returns for any reason within ${policy.windowDays} days of ordering.`
              : `Returns accepted within ${policy.windowDays} days if the item is defective or doesn't match the listing.`}
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-ink/[0.04]"
        >
          <Undo2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          Request return
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              open && "rotate-180"
            )}
            strokeWidth={2.5}
          />
        </button>
      </div>
      {policy.policyText && (
        <p className="mt-3 rounded-xl bg-white px-4 py-2.5 text-[12.5px] text-ink/65">
          {policy.policyText}
        </p>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {submitted ? (
              <SubmittedNote />
            ) : (
              <ReturnForm />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function SubmittedNote() {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900">
        <Check className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
        <p>
          Request sent. The shop will review and respond — you&rsquo;ll see
          the status update here.
        </p>
      </div>
    );
  }

  function ReturnForm() {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setFieldErrors({});
          startTransition(async () => {
            const res = await requestReturnAction({
              orderId,
              phone,
              productId,
              qty,
              reason,
            });
            if (res.ok) {
              setSubmitted(true);
            } else {
              setError(res.error);
              if ("fieldErrors" in res) setFieldErrors(res.fieldErrors ?? {});
            }
          });
        }}
        className="mt-4 space-y-3"
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
            Item
          </span>
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setQty(1);
            }}
            className="h-10 w-full rounded-xl border border-ink/15 bg-white px-3 text-[14px] text-ink focus:border-vermillion focus:outline-none"
            required
          >
            {lines.map((l) => (
              <option key={l.productId} value={l.productId}>
                {l.title} · {formatINR(l.price)} (ordered {l.qty})
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
              Qty
            </span>
            <Input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) =>
                setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value || "1", 10))))
              }
              required
            />
            {fieldErrors.qty && (
              <p className="mt-1 text-[12px] text-vermillion">{fieldErrors.qty}</p>
            )}
          </label>
          <div className="flex flex-col justify-end">
            <p className="text-[11.5px] text-ink/45">
              Refund {formatINR((line?.price ?? 0) * qty)} on approval.
            </p>
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
            Reason
          </span>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tell the shop what's going on. The more specific, the faster they can help."
            maxLength={800}
            required
          />
          {fieldErrors.reason && (
            <p className="mt-1 text-[12px] text-vermillion">{fieldErrors.reason}</p>
          )}
        </label>
        {error && !Object.keys(fieldErrors).length && (
          <p className="rounded-xl border border-vermillion/20 bg-vermillion/5 px-3.5 py-2.5 text-[12.5px] text-vermillion">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" size="default" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="h-4 w-4" strokeWidth={2.25} />
            )}
            Send request
          </Button>
          <p className="text-[11.5px] text-ink/45">
            No refund is issued until the shop approves.
          </p>
        </div>
      </form>
    );
  }
}
