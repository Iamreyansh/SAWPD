"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

function toInput(value: string | undefined): string {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function ApplicationsDateFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const from = toInput(sp.get("from") ?? undefined);
  const to = toInput(sp.get("to") ?? undefined);
  const status = sp.get("status") ?? "all";
  const active = from !== "" || to !== "";

  function apply(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(sp.toString());
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/applications?${qs}` : "/admin/applications");
    });
  }

  function clear() {
    const params = new URLSearchParams(sp.toString());
    params.delete("from");
    params.delete("to");
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/applications?${qs}` : "/admin/applications");
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-2xl border border-ink/10 bg-bone p-4",
        pending && "opacity-60"
      )}
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="from"
          className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-ink/45"
        >
          From
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={from}
          max={to || undefined}
          onChange={(e) => apply(e.target.value, to)}
          className="h-9 rounded-lg border border-ink/10 bg-bone px-3 text-[13px] text-ink outline-none transition-colors focus:border-ink/30"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="to"
          className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-ink/45"
        >
          To
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={to}
          min={from || undefined}
          onChange={(e) => apply(from, e.target.value)}
          className="h-9 rounded-lg border border-ink/10 bg-bone px-3 text-[13px] text-ink outline-none transition-colors focus:border-ink/30"
        />
      </div>
      {active && (
        <button
          type="button"
          onClick={clear}
          className="h-9 rounded-lg border border-ink/10 bg-bone px-3 text-[12.5px] font-semibold text-ink/65 transition-colors hover:border-ink/30 hover:text-ink"
        >
          Clear dates
        </button>
      )}
      <p className="ml-auto text-[11px] text-ink/40">
        Status: <span className="font-semibold text-ink/60 capitalize">{status}</span>
        {active && " · dates applied"}
      </p>
    </div>
  );
}
