"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, Check, Truck, MapPin, MessageCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR, cn, buildInstagramUrl } from "@/lib/utils";
import { buildWhatsAppLink, ownerContactMessage } from "@/lib/whatsapp";
import { trackOrderAction, type TrackResult } from "./actions";
import { TrackReturnsCard } from "./track-returns-card";

const STATUS_TIMELINE: { id: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "awaiting_payment", label: "Awaiting payment", icon: Package },
  { id: "awaiting_verification", label: "Verifying", icon: Package },
  { id: "verified", label: "Verified", icon: Check },
  { id: "shipped", label: "Shipped", icon: Truck },
  { id: "completed", label: "Delivered", icon: MapPin },
];

const STATUS_INDEX: Record<string, number> = {
  awaiting_payment: 0,
  awaiting_verification: 1,
  verified: 2,
  shipped: 3,
  completed: 4,
  cancelled: -1,
};

export type DemoOrder = {
  id: string;
  phone: string;
  status: string;
  createdAt: string;
};

export function TrackClient({ demos = [] }: { demos?: DemoOrder[] }) {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("orderId") ?? "";
  const [orderId, setOrderId] = useState(initialOrderId);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submittedPhone, setSubmittedPhone] = useState("");

  useEffect(() => {
    if (initialOrderId) setOrderId(initialOrderId);
  }, [initialOrderId]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    startTransition(async () => {
      const r = await trackOrderAction({ orderId, phone });
      if (r.ok) {
        setSubmittedPhone(phone);
        setResult(r);
      } else {
        setError(r.error);
      }
    });
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setPhone("");
    setSubmittedPhone("");
  };

  if (result?.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl"
      >
        <OrderFound result={result} onReset={reset} submittedPhone={submittedPhone} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <p className="eyebrow mb-3 text-center">Order tracking</p>
      <h1 className="display-m mb-3 text-center text-ink text-balance">
        Where&apos;s my order?
      </h1>
      <p className="mb-8 text-center text-[14.5px] text-ink/60">
        Enter your order ID and the phone number you used at checkout.
      </p>
      {demos.length > 0 && !orderId && (
        <div className="mb-6 rounded-2xl border border-vermillion/20 bg-vermillion/[0.04] p-4">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-vermillion-deep">
            <Sparkles className="h-3 w-3" strokeWidth={2.25} />
            Try a demo order
          </div>
          <p className="mt-1.5 text-[12.5px] text-ink/60">
            One-click to load a Riya order and the matching phone — useful
            for testing the full flow, including returns.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {demos.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setOrderId(d.id);
                  setPhone(d.phone);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-left transition-all hover:border-vermillion/40 hover:bg-bone active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[12.5px] font-semibold text-ink">
                    {d.id}
                  </span>
                  <span className="block text-[11.5px] text-ink/55">
                    {d.phone} · {d.status.replace(/_/g, " ")}
                  </span>
                </span>
                <span className="rounded-full bg-vermillion px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.15em] text-bone">
                  Fill
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
            Order ID
          </span>
          <Input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="ord_xxxxxxxx"
            className="font-mono"
            required
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
            Phone number
          </span>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </label>
        {error && (
          <p className="rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-3 text-[13px] text-vermillion">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="vermillion"
          size="lg"
          disabled={pending}
          className="w-full"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" strokeWidth={2} />
          )}
          Track order
        </Button>
      </form>
    </motion.div>
  );
}

function OrderFound({
  result,
  onReset,
  submittedPhone,
}: {
  result: Extract<TrackResult, { ok: true }>;
  onReset: () => void;
  submittedPhone: string;
}) {
  const { order, customer, store, returns, returnsPolicy } = result;
  const currentIdx = STATUS_INDEX[order.status] ?? 0;
  const isCancelled = order.status === "cancelled";

  const whatsappLink = buildWhatsAppLink(
    store.whatsapp,
    ownerContactMessage({
      storeName: store.name,
      orderId: order.id,
      customerName: customer.name,
      intent: "question",
    })
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="eyebrow mb-3 text-vermillion">Order found</p>
        <h1 className="display-m text-ink">
          {store.name}
        </h1>
        <p className="mt-1 font-mono text-[12.5px] text-ink/55">{order.id}</p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-bone p-6">
        {isCancelled ? (
          <div className="text-center">
            <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-vermillion">
              Cancelled
            </p>
            <p className="mt-2 text-[13.5px] text-ink/60">
              This order was cancelled. Reach out if you have questions.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {STATUS_TIMELINE.map((step, idx) => {
              const reached = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const Icon = step.icon;
              return (
                <li key={step.id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                      reached
                        ? isCurrent
                          ? "bg-vermillion text-bone"
                          : "bg-ink text-bone"
                        : "bg-ink/[0.06] text-ink/30"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p
                      className={cn(
                        "text-[14px] font-semibold",
                        reached ? "text-ink" : "text-ink/35"
                      )}
                    >
                      {step.label}
                    </p>
                    {isCurrent && step.id === "awaiting_verification" && (
                      <p className="mt-1 text-[12.5px] text-ink/55">
                        {store.name} is checking your payment screenshot.
                      </p>
                    )}
                    {isCurrent && step.id === "verified" && (
                      <p className="mt-1 text-[12.5px] text-ink/55">
                        Payment confirmed. Packing your order.
                      </p>
                    )}
                    {isCurrent && step.id === "shipped" && order.trackingNote && (
                      <p className="mt-1 text-[12.5px] text-ink/55">
                        {order.trackingNote}
                      </p>
                    )}
                    {isCurrent && step.id === "completed" && (
                      <p className="mt-1 text-[12.5px] text-ink/55">
                        Delivered. Enjoy your piece.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-bone p-6">
        <p className="eyebrow-ink mb-3">Items</p>
        <ul className="divide-y divide-ink/5">
          {order.lines.map((l) => (
            <li key={l.productId + l.title} className="flex items-center justify-between py-2.5">
              <p className="truncate text-[14px] text-ink">
                {l.qty}× {l.title}
              </p>
              <p className="text-[13.5px] tabular-nums text-ink/65">
                {formatINR(l.price * l.qty)}
              </p>
            </li>
          ))}
        </ul>
        {order.discountAmount != null && order.discountAmount > 0 && (
          <p className="mt-3 flex items-center justify-between text-[13.5px] text-vermillion">
            <span>
              Promo <span className="font-mono font-bold">{order.promoCode}</span>
            </span>
            <span className="tabular-nums">−{formatINR(order.discountAmount)}</span>
          </p>
        )}
        <div className="mt-3 flex items-baseline justify-between border-t border-ink/10 pt-3">
          <span className="text-[13px] text-ink/60">Total</span>
          <span
            className={cn(
              "text-lg font-bold tabular-nums tracking-[-0.02em]",
              order.discountAmount ? "text-vermillion" : "text-ink"
            )}
          >
            {formatINR(order.total)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <TrackReturnsCard
          orderId={order.id}
          phone={submittedPhone}
          lines={order.lines.map((l) => ({
            productId: l.productId,
            title: l.title,
            price: l.price,
            qty: l.qty,
          }))}
          existing={returns}
          policy={returnsPolicy}
          orderStatus={order.status}
        />
        <AnimatePresence mode="wait">
          {whatsappLink ? (
            <motion.div
              key="wa"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                asChild
                variant="default"
                size="default"
                className="bg-[#25D366] text-white hover:bg-[#1DAB55]"
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
                  Chat on WhatsApp
                </a>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="ig"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                asChild
                variant="outline"
                size="default"
                onClick={() => {
                  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                    navigator.vibrate(8);
                  }
                }}
              >
                {(() => {
                  const ig = buildInstagramUrl(store.ownerHandle);
                  if (!ig) return null;
                  return (
                    <a
                      href={ig}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DM on Instagram
                    </a>
                  );
                })()}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onReset}
          className="text-[12px] font-semibold uppercase tracking-[0.15em] text-ink/45 transition-colors hover:text-ink"
        >
          ← Track another
        </button>
      </div>
    </div>
  );
}
