"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { useToast } from "@/components/ui/toaster";
import { formatINR, cn } from "@/lib/utils";
import type { Product } from "@/types/storefront";
import type { ServiceSlot } from "@/lib/service-slots";

type Props = {
  product: Product;
  storeSlug: string;
  slots: ServiceSlot[];
};

function fmtSlot(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
    time: d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function groupByDate(
  slots: ServiceSlot[],
): { date: string; slots: ServiceSlot[] }[] {
  const map = new Map<string, ServiceSlot[]>();
  for (const s of slots) {
    const key = new Date(s.startsAt).toDateString();
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, slots]) => ({ date, slots }));
}

export function SlotPicker({ product, storeSlug, slots }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const add = useCartStore((s) => s.add);
  const [selectedSlot, setSelectedSlot] = useState<ServiceSlot | null>(null);
  const [pending, startTransition] = useTransition();
  const grouped = groupByDate(slots);

  function handleBook() {
    if (!selectedSlot) return;
    const result = add(
      product.id,
      1,
      storeSlug,
      undefined,
      {
        id: selectedSlot.id,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
      },
    );
    if (result === "at_stock_cap") {
      toast({
        title: "Already in bag",
        description: "That time is already in your bag.",
      });
      return;
    }
    toast({
      title: "Added to bag",
      description: `${product.title} · ${fmtSlot(selectedSlot.startsAt).date}, ${fmtSlot(selectedSlot.startsAt).time}`,
    });
    // Bounce to the checkout so the customer completes the booking.
    startTransition(() => {
      router.push(`/s/${storeSlug}/checkout`);
    });
  }

  if (grouped.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 p-8 text-center">
        <CalendarDays className="h-8 w-8 text-ink/25 mx-auto mb-2" />
        <p className="text-[14px] font-semibold text-ink">No slots open</p>
        <p className="mt-1 text-[12.5px] text-ink/55">
          This service is fully booked. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-ink/10 bg-white p-5">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[13px] font-semibold text-ink">
            {formatINR(product.price)}{" "}
            <span className="text-ink/50 font-normal">
              · {product.durationMinutes ?? 60} min
            </span>
          </p>
          <p className="text-[11.5px] text-ink/50">
            {slots.length} slot{slots.length === 1 ? "" : "s"} open
          </p>
        </div>

        <div className="space-y-4 max-h-[420px] overflow-y-auto">
          {grouped.map(({ date, slots }) => (
            <div key={date}>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/45 mb-2">
                {new Date(date).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((s) => {
                  const isFull = s.bookedCount >= s.capacity;
                  const isSelected = selectedSlot?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => setSelectedSlot(s)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all",
                        isSelected
                          ? "border-vermillion bg-vermillion text-bone"
                          : isFull
                            ? "border-ink/10 bg-ink/[0.04] text-ink/30 cursor-not-allowed"
                            : "border-ink/15 bg-white text-ink hover:border-ink/40",
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {fmtSlot(s.startsAt).time}
                      {s.capacity > 1 && (
                        <span className="text-[10px] opacity-70">
                          ({s.capacity - s.bookedCount}/{s.capacity})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleBook}
        disabled={!selectedSlot || pending}
        className="w-full h-12 bg-vermillion hover:bg-vermillion-deep text-bone text-[14px] font-semibold rounded-full shadow-glow"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <CalendarDays className="h-4 w-4 mr-2" />
        )}
        {selectedSlot
          ? `Book ${fmtSlot(selectedSlot.startsAt).date} · ${fmtSlot(selectedSlot.startsAt).time}`
          : "Pick a time"}
      </Button>
      <p className="text-center text-[11px] text-ink/40">
        Pay via UPI on the next step. Phone OTP verifies the booking.
      </p>
    </div>
  );
}