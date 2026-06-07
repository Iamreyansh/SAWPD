import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, Undo2 } from "lucide-react";
import { isAdmin } from "@/lib/admin-auth";
import { getFirstStore } from "@/lib/store";
import { listReturnsForStore } from "@/lib/returns";
import { formatINR, cn } from "@/lib/utils";
import { DEFAULT_RETURNS_POLICY } from "@/types/storefront";
import type { ReturnStatus } from "@/lib/returns";

export const metadata = { title: "Dashboard · Returns" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<
  ReturnStatus,
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ReturnsPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const store = await getFirstStore();
  if (!store) redirect("/dashboard");

  const all = await listReturnsForStore(store.slug);
  const policy = store.returnsPolicy ?? DEFAULT_RETURNS_POLICY;
  const counts = {
    pending: all.filter((r) => r.status === "pending").length,
    approved: all.filter((r) => r.status === "approved").length,
    rejected: all.filter((r) => r.status === "rejected").length,
    refunded: all.filter((r) => r.status === "refunded").length,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Returns</p>
          <h1 className="display-m text-ink">Return requests</h1>
        </div>
        <div className="flex items-center gap-2">
          {policy.enabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              <Undo2 className="h-3 w-3" strokeWidth={2.5} />
              Accepting · {policy.windowDays}d ·{" "}
              {policy.mode === "any" ? "any reason" : "defective only"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.05] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55">
              Not accepting returns
            </span>
          )}
          <Link
            href="/dashboard/settings"
            className="inline-flex h-9 items-center justify-center rounded-full border border-ink/15 bg-bone px-4 text-[12px] font-semibold text-ink transition-all hover:bg-ink/[0.04] active:scale-[0.98]"
          >
            Edit policy
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Pending" value={counts.pending} accent="ink" />
        <StatChip label="Approved" value={counts.approved} accent="emerald" />
        <StatChip label="Refunded" value={counts.refunded} accent="ink" />
        <StatChip label="Rejected" value={counts.rejected} accent="vermillion" />
      </div>

      {all.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 bg-bone p-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink/[0.04]">
            <Inbox className="h-5 w-5 text-ink/40" strokeWidth={1.75} />
          </div>
          <p className="text-[14.5px] font-semibold text-ink">No return requests yet</p>
          <p className="mt-1 text-[12.5px] text-ink/55">
            {policy.enabled
              ? "Customers can request a return from the order's track page within your window."
              : "Turn on returns in Settings to start accepting them."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {all.map((r) => {
            const s = STATUS_STYLES[r.status];
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-ink/[0.07] bg-bone p-5 shadow-soft transition-all hover:border-ink/15"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Link
                        href={`/dashboard/orders/${r.orderId}`}
                        className="text-[15px] font-semibold tracking-[-0.01em] text-ink hover:underline"
                      >
                        {r.productTitle}
                      </Link>
                      <span className="text-[12.5px] text-ink/45">
                        × {r.qty} · {formatINR(r.amountInr)}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink/55">
                      Order{" "}
                      <Link
                        href={`/dashboard/orders/${r.orderId}`}
                        className="font-mono text-ink/70 hover:underline"
                      >
                        {r.orderId}
                      </Link>
                      {" · "}
                      {r.customerName} ({r.customerPhone})
                    </p>
                    <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] italic text-ink/70">
                      &ldquo;{r.reason}&rdquo;
                    </p>
                    <p className="mt-2 text-[11.5px] text-ink/45">
                      Requested {formatDate(r.requestedAt)} ({timeAgo(r.requestedAt)})
                      {r.decidedAt && (
                        <> · Decided {formatDate(r.decidedAt)}</>
                      )}
                      {r.refundAmount != null && r.status === "refunded" && (
                        <> · Refund {formatINR(r.refundAmount)}</>
                      )}
                      {r.decisionNote && <> · &ldquo;{r.decisionNote}&rdquo;</>}
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
                </div>
                {r.status === "pending" && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink/5 pt-3">
                    <p className="text-[12px] text-ink/45">
                      Approve, reject, or mark refunded from the order page.
                    </p>
                    <Link
                      href={`/dashboard/orders/${r.orderId}`}
                      className="inline-flex h-8 items-center justify-center rounded-full bg-ink px-3.5 text-[11.5px] font-semibold text-bone transition-colors hover:bg-ink/90"
                    >
                      Open order
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "ink" | "vermillion" | "emerald";
}) {
  const tone =
    accent === "vermillion"
      ? "text-vermillion"
      : accent === "emerald"
      ? "text-emerald-700"
      : "text-ink";
  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-bone p-4 shadow-soft">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/50">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums tracking-[-0.02em]", tone)}>
        {value}
      </p>
    </div>
  );
}
