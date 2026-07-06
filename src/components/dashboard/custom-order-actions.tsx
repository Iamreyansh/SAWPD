"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decideCustomOrderAction } from "@/app/dashboard/actions";
import type { CustomOrderStatus } from "@/types/custom-orders";

type Props = {
  orderId: string;
  status: CustomOrderStatus;
};

export function CustomOrderActions({ orderId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(
    null,
  );

  async function handleAction(
    actionStatus: "confirmed" | "rejected" | "fulfilled",
  ) {
    setResult(null);
    startTransition(async () => {
      const res = await decideCustomOrderAction({
        orderId,
        status: actionStatus,
        sellerNote: note,
      });
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  if (status === "confirmed") {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-3">
        <h2 className="text-[13px] font-semibold text-ink">Fulfill Order</h2>
        <p className="text-[12px] text-ink/55">
          Mark this order as fulfilled once you&apos;ve delivered it to the
          customer.
        </p>
        {result && !result.ok && (
          <p className="text-[12px] text-vermillion">{result.error}</p>
        )}
        <Button
          onClick={() => handleAction("fulfilled")}
          disabled={pending}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <PackageCheck className="h-4 w-4 mr-2" />
          )}
          Mark as Fulfilled
        </Button>
      </div>
    );
  }

  if (
    status !== "pending" &&
    status !== "awaiting_payment" &&
    status !== "awaiting_verification"
  ) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-4">
      <h2 className="text-[13px] font-semibold text-ink">Review Order</h2>
      <p className="text-[12px] text-ink/55">
        Accept or reject this custom order. The customer will be notified of
        your decision.
      </p>

      <div>
        <label className="text-[11px] font-medium text-ink/60 mb-1 block">
          Note to customer (optional)
        </label>
        <Textarea
          placeholder="e.g., We can have this ready by Friday!"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>

      {result && !result.ok && (
        <p className="text-[12px] text-vermillion">{result.error}</p>
      )}

      <div className="flex gap-3">
        <Button
          onClick={() => handleAction("confirmed")}
          disabled={pending}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Accept Order
        </Button>
        <Button
          onClick={() => handleAction("rejected")}
          disabled={pending}
          variant="outline"
          className="border-vermillion/30 text-vermillion hover:bg-vermillion/[0.04]"
        >
          <X className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>
    </div>
  );
}