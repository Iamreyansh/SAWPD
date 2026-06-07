import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { listApplications } from "@/lib/applications";
import { StatusBadge } from "@/components/admin/status-badge";
import { readRecentAudit, describeAuditEvent } from "@/lib/audit";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Admin · Overview" };

export const dynamic = "force-dynamic";

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

function trialDaysLeft(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default async function AdminOverviewPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const apps = await listApplications();
  const recentAudit = await readRecentAudit(8);

  const stats = {
    total: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    activeTrials: apps.filter(
      (a) => a.status === "approved" && a.trialEndsAt && new Date(a.trialEndsAt).getTime() > Date.now()
    ).length,
  };

  const recent = apps.slice(0, 5);
  const trialsEndingSoon = apps
    .filter(
      (a) =>
        a.status === "approved" &&
        a.trialEndsAt &&
        trialDaysLeft(a.trialEndsAt) <= 3 &&
        trialDaysLeft(a.trialEndsAt) > 0
    )
    .sort((a, b) => (a.trialEndsAt! < b.trialEndsAt! ? -1 : 1));

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <p className="eyebrow mb-2">Overview</p>
        <h1 className="display-m text-ink">Welcome back.</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Pending" value={stats.pending} highlight={stats.pending > 0} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Active trials" value={stats.activeTrials} />
      </section>

      {trialsEndingSoon.length > 0 && (
        <section className="rounded-2xl border border-vermillion/20 bg-vermillion/[0.04] p-5">
          <p className="eyebrow text-vermillion mb-3">Trials ending soon</p>
          <ul className="space-y-2">
            {trialsEndingSoon.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-[13.5px]">
                <Link
                  href={`/admin/applications/${a.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {a.storeName}
                </Link>
                <span className="text-vermillion">
                  {trialDaysLeft(a.trialEndsAt!)} day
                  {trialDaysLeft(a.trialEndsAt!) === 1 ? "" : "s"} left
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">
            Recent applications
          </h2>
          <Link
            href="/admin/applications"
            className="text-[12.5px] font-semibold text-ink/55 transition-colors hover:text-ink"
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 p-10 text-center">
            <p className="text-[15px] text-ink/60">No applications yet.</p>
            <p className="mt-1 text-[13px] text-ink/45">
              Share <Link href="/apply" className="text-vermillion underline">/apply</Link> to start collecting them.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-bone">
            {recent.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/applications/${a.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-ink/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="truncate text-[14.5px] font-semibold text-ink">
                        {a.storeName}
                      </p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink/55">
                      {a.fullName} · @{a.instagramHandle} · {a.email}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end text-right">
                    <p className="text-[12.5px] text-ink/55">{timeAgo(a.createdAt)}</p>
                    <p className="text-[12px] text-ink/40">
                      {a.salesCount} orders / {a.salesCadence.replace("ly", "")} ·{" "}
                      {formatINR(a.averageOrderValue)} AOV
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">
            Recent activity
          </h2>
          <p className="text-[11.5px] uppercase tracking-[0.18em] text-ink/40">
            Audit log
          </p>
        </div>
        {recentAudit.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 p-10 text-center">
            <p className="text-[15px] text-ink/60">Nothing logged yet.</p>
            <p className="mt-1 text-[13px] text-ink/45">
              Sign in, decide an application, or change a plan to start filling this up.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-bone">
            {recentAudit.map((entry) => {
              const kindTone =
                entry.event.kind === "store_suspended"
                  ? "text-vermillion"
                  : entry.event.kind === "store_reactivated" ||
                      entry.event.kind === "store_plan_changed"
                    ? "text-ink"
                    : "text-ink/65";
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <p className={"text-[13.5px] " + kindTone}>
                    {describeAuditEvent(entry)}
                  </p>
                  <p className="flex-shrink-0 text-[12px] text-ink/45">
                    {timeAgo(entry.at)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-5 " +
        (highlight
          ? "border-vermillion/30 bg-vermillion/[0.04]"
          : "border-ink/10 bg-bone")
      }
    >
      <p className="eyebrow-ink">{label}</p>
      <p
        className={
          "mt-2 text-3xl font-bold tracking-[-0.02em] tabular-nums " +
          (highlight ? "text-vermillion" : "text-ink")
        }
      >
        {value}
      </p>
    </div>
  );
}
