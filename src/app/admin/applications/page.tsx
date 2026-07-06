import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { listApplications } from "@/lib/applications";
import { StatusBadge } from "@/components/admin/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { ApplicationsDateFilter } from "./date-filter";
import { formatINR, timeAgo } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/applications";

export const metadata = {
  title: "Admin · Applications",
  description: "Seller applications awaiting review.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TABS: { id: ApplicationStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const PAGE_SIZE = 15;

function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function parseDate(value: string | undefined): number | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const t = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(t) ? t : null;
}

function withDate(href: string, from: string | null, to: string | null): string {
  const sep = href.includes("?") ? "&" : "?";
  const parts: string[] = [];
  if (from) parts.push(`from=${from}`);
  if (to) parts.push(`to=${to}`);
  return parts.length ? `${href}${sep}${parts.join("&")}` : href;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    page?: string;
    from?: string;
    to?: string;
  }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const filter = (sp.status ?? "all") as ApplicationStatus | "all";
  const page = parsePage(sp.page);
  const fromParam = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : null;
  const toParam = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : null;
  const fromTs = parseDate(fromParam ?? undefined);
  const toTsExclusive = (() => {
    const t = parseDate(toParam ?? undefined);
    return t === null ? null : t + 24 * 60 * 60 * 1000;
  })();

  const all = await listApplications();
  const statusFiltered =
    filter === "all" ? all : all.filter((a) => a.status === filter);
  const dateFiltered =
    fromTs === null && toTsExclusive === null
      ? statusFiltered
      : statusFiltered.filter((a) => {
          const ts = new Date(a.createdAt).getTime();
          if (fromTs !== null && ts < fromTs) return false;
          if (toTsExclusive !== null && ts >= toTsExclusive) return false;
          return true;
        });
  const filtered = dateFiltered;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const basePath = "/admin/applications";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow mb-2">Applications</p>
        <h1 className="display-m text-ink">All applications</h1>
      </header>

      <nav className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count =
            t.id === "all"
              ? all.length
              : all.filter((a) => a.status === t.id).length;
          const active = filter === t.id;
          const href =
            t.id === "all"
              ? withDate("/admin/applications", fromParam, toParam)
              : withDate(
                  `/admin/applications?status=${t.id}`,
                  fromParam,
                  toParam
                );
          return (
            <Link
              key={t.id}
              href={href}
              className={
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors " +
                (active
                  ? "bg-ink text-bone"
                  : "border border-ink/10 bg-bone text-ink/65 hover:text-ink")
              }
            >
              {t.label}
              <span
                className={
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums " +
                  (active ? "bg-bone/15 text-bone" : "bg-ink/[0.06] text-ink/55")
                }
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <ApplicationsDateFilter />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <p className="text-[15px] text-ink/60">
            {all.length === 0
              ? "No applications here."
              : "No applications match these filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-bone">
          <table className="w-full text-left text-[13.5px]">
            <thead className="border-b border-ink/10 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink/50">
              <tr>
                <th className="px-5 py-3.5">Shop</th>
                <th className="px-5 py-3.5">Applicant</th>
                <th className="px-5 py-3.5">Niche</th>
                <th className="px-5 py-3.5">Sales</th>
                <th className="px-5 py-3.5">AOV</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Applied</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.06]">
              {pageItems.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-ink/[0.02]">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-ink">{a.storeName}</p>
                    <p className="text-[12px] text-ink/50">@{a.instagramHandle}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-ink">{a.fullName}</p>
                    <p className="text-[12px] text-ink/50">{a.email}</p>
                  </td>
                  <td className="px-5 py-4 capitalize text-ink/70">{a.niche}</td>
                  <td className="px-5 py-4 tabular-nums text-ink/70">
                    {a.salesCount}/{a.salesCadence.replace("ly", "")}
                  </td>
                  <td className="px-5 py-4 tabular-nums text-ink/70">
                    {formatINR(a.averageOrderValue)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-4 text-ink/55">{timeAgo(a.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/applications/${a.id}`}
                      className="text-[12.5px] font-semibold text-vermillion hover:underline"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        basePath={basePath}
        extraParams={{
          status: filter === "all" ? undefined : filter,
          from: fromParam ?? undefined,
          to: toParam ?? undefined,
        }}
      />
    </div>
  );
}
