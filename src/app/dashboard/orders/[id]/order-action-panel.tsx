"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Truck, Package, X, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  updateOrderStatusAction,
  requestResendAction,
} from "@/app/dashboard/actions";
import type { OrderStatus } from "@/types/seller";

type Props = {
  orderId: string;
  currentStatus: OrderStatus;
  hasScreenshot: boolean;
};

export function OrderActionPanel({ orderId, currentStatus, hasScreenshot }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [trackingNote, setTrackingNote] = useState("");
  const [showShipForm, setShowShipForm] = useState(false);

  const transition = (status: OrderStatus, note?: string) => {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatusAction({
        orderId,
        status,
        trackingNote: note,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setShowShipForm(false);
        setTrackingNote("");
        router.refresh();
      }
    });
  };

  const requestResend = () => {
    setError(null);
    startTransition(async () => {
      const result = await requestResendAction({
        orderId,
        status: "awaiting_payment",
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const showVerify =
    currentStatus === "awaiting_verification" ||
    (currentStatus === "awaiting_payment" && hasScreenshot);
  const showShip = currentStatus === "verified";
  const showComplete = currentStatus === "shipped";
  const showResend =
    currentStatus === "awaiting_verification" ||
    (currentStatus === "awaiting_payment" && !hasScreenshot);
  const showCancel =
    currentStatus === "awaiting_payment" ||
    currentStatus === "awaiting_verification" ||
    currentStatus === "verified";

  if (
    !showVerify &&
    !showShip &&
    !showComplete &&
    !showCancel &&
    !showResend
  ) {
    return (
      <section className="rounded-2xl border border-ink/10 bg-bone p-6 text-center">
        <p className="text-[14px] text-ink/55">
          This order is closed. No further actions.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-ink/10 bg-bone p-6">
      <p className="eyebrow mb-3">Actions</p>

      {showShipForm ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
              Tracking note (optional but recommended)
            </span>
            <Textarea
              value={trackingNote}
              onChange={(e) => setTrackingNote(e.target.value)}
              placeholder="e.g. Shipped via Delhivery · Tracking ID DL8291042301 · ETA 3 days"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => {
                setShowShipForm(false);
                setTrackingNote("");
                setError(null);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="default"
              variant="vermillion"
              onClick={() => transition("shipped", trackingNote.trim())}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" strokeWidth={2.25} />}
              Mark shipped
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {showVerify && (
            <Button
              type="button"
              size="default"
              variant="vermillion"
              onClick={() => transition("verified")}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2.5} />}
              Verify payment
            </Button>
          )}
          {showShip && (
            <Button
              type="button"
              size="default"
              variant="vermillion"
              onClick={() => setShowShipForm(true)}
              disabled={pending}
            >
              <Truck className="h-4 w-4" strokeWidth={2.25} />
              Mark shipped
            </Button>
          )}
          {showComplete && (
            <Button
              type="button"
              size="default"
              variant="vermillion"
              onClick={() => transition("completed")}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" strokeWidth={2.25} />}
              Mark delivered
            </Button>
          )}
          {showResend && (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => {
                if (
                  confirm(
                    "Ask the customer to re-upload their payment screenshot? Order will move to 'Awaiting payment'."
                  )
                ) {
                  requestResend();
                }
              }}
              disabled={pending}
            >
              <RefreshCcw className="h-4 w-4" strokeWidth={2.25} />
              Request resend
            </Button>
          )}
          {showCancel && (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => {
                if (confirm("Cancel this order? This cannot be undone.")) {
                  transition("cancelled");
                }
              }}
              disabled={pending}
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
              Cancel
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-2.5 text-[13px] text-vermillion">
          {error}
        </p>
      )}
    </section>
  );
}
