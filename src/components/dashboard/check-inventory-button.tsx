"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Bell } from "lucide-react";
import { checkInventoryAction } from "@/app/dashboard/actions";

export function CheckInventoryButton({ storeSlug }: { storeSlug: string }) {
  const [pending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<
    | { kind: "ok"; count: number; notified: boolean }
    | { kind: "error"; message: string }
    | null
  >(null);
  const router = useRouter();

  function onClick() {
    setLastResult(null);
    startTransition(async () => {
      const res = await checkInventoryAction(storeSlug);
      if (res.ok) {
        setLastResult({ kind: "ok", count: res.flagged.length, notified: res.notified });
        router.refresh();
      } else {
        setLastResult({ kind: "error", message: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 bg-bone px-3.5 text-[12.5px] font-semibold text-ink/70 transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
        ) : (
          <Bell className="h-3.5 w-3.5" strokeWidth={2} />
        )}
        {pending ? "Checking…" : "Check inventory"}
      </button>
      {lastResult?.kind === "ok" && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-ink/60">
          <Check className="h-3 w-3 text-vermillion" strokeWidth={2.5} />
          {lastResult.count === 0
            ? "All stocked up."
            : `${lastResult.count} low · ${lastResult.notified ? "notified" : "not sent"}`}
        </p>
      )}
      {lastResult?.kind === "error" && (
        <p className="text-[11.5px] text-vermillion">{lastResult.message}</p>
      )}
    </div>
  );
}
