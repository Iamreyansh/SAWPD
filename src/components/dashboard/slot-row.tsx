"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Trash2, Users } from "lucide-react";
import {
  blockSlotAction,
  deleteServiceSlotAction,
} from "@/app/dashboard/actions";
import type { ServiceSlot } from "@/lib/service-slots";
import { cn } from "@/lib/utils";

type Props = {
  slot: ServiceSlot;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function SlotRow({ slot }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isFull = slot.bookedCount >= slot.capacity;
  const isBlocked = slot.isBlocked;
  const isPast = new Date(slot.startsAt).getTime() < Date.now();

  function handleBlock(blocked: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await blockSlotAction(slot.id, blocked);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete this slot on ${fmt(slot.startsAt)}? Bookings (if any) must be cleared first.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await deleteServiceSlotAction(slot.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  const statusLabel = isBlocked
    ? "Blocked"
    : isFull
      ? "Full"
      : isPast
        ? "Past"
        : "Open";

  const statusColor = isBlocked
    ? "bg-ink/[0.08] text-ink/55"
    : isFull
      ? "bg-amber-100 text-amber-700"
      : isPast
        ? "bg-ink/[0.04] text-ink/45"
        : "bg-green-100 text-green-700";

  return (
    <li className="flex items-center gap-3 px-2 py-2.5">
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13.5px] font-medium",
            isBlocked ? "text-ink/50 line-through" : "text-ink",
          )}
        >
          {fmt(slot.startsAt)}
        </p>
        {slot.capacity > 1 && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink/45">
            <Users className="h-3 w-3" />
            {slot.bookedCount}/{slot.capacity} booked
          </p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
          statusColor,
        )}
      >
        {statusLabel}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => handleBlock(!isBlocked)}
          disabled={pending || isPast}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-ink/10 text-ink/55 hover:bg-ink/[0.04] hover:text-ink disabled:opacity-40"
          title={isBlocked ? "Unblock slot" : "Block slot"}
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isBlocked ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending || slot.bookedCount > 0}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-ink/10 text-ink/30 hover:text-vermillion hover:border-vermillion/20 disabled:opacity-40"
          title="Delete slot"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && (
        <span className="text-[11px] text-vermillion self-center ml-2">
          {error}
        </span>
      )}
    </li>
  );
}