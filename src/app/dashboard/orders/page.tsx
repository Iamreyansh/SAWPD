import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Tag, Download } from "lucide-react";
import { isAdmin } from "@/lib/admin-auth";
import { getFirstStore } from "@/lib/store";
import { listOrders } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { Pagination } from "@/components/ui/pagination";
import { formatINR } from "@/lib/utils";
import type { OrderStatus } from "@/types/seller";

export const metadata = { title: "Dashboard · Orders" };
export const dynamic = "force-dynamic";

const TABS: { id: OrderStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "awaiting_verification", label: "Verify" },
  { id: "awaiting_payment", label: "Awaiting" },
  { id: "verified", label: "Verified" },
  { id: "shipped", label: "Shipped" },
  { id: "completed", label: "Completed" },
];

const PAGE_SIZE = 10;

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

function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const store = await getFirstStore();
  if (!store) redirect("/dashboard");

  const sp = await searchParams;
  const filter = (sp.status ?? "all") as OrderStatus | "all";
  const page = parsePage(sp.page);

  const all = await listOrders(store.slug);
  const filtered = filter === "all" ? all : all.filter((o) => o.status === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const basePath = "/dashboard/orders";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Orders</p>
          <h1 className="display-m text-ink">All orders</h1>
        </div>
        <a
          href="/api/dashboard/orders"
          className="inline-flex items-center gap-2 self-start rounded-full border border-ink/10 bg-bone px-4 py-1.5 text-[12.5px] font-semibold text-ink transition hover:bg-ink hover:text-bone sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </header>

      <nav className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count =
            t.id === "all" ? all.length : all.filter((o) => o.status === t.id).length;
          const active = filter === t.id;
          return (
            <Link
              key={t.id}
              href={
                t.id === "all" ? basePath : `${basePath}?status=${t.id}`
              }
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

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <p className="text-[15px] text-ink/60">No orders here.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-bone">
            {pageItems.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/orders/${o.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink/[0.02]"
                >
                  <div className="flex -space-x-2 flex-shrink-0">
                    {o.lines.slice(0, 3).map((l) => (
                      <div
                        key={l.productId + l.title}
                        className="relative h-12 w-12 overflow-hidden rounded-lg border-2 border-bone bg-ink/[0.04]"
                      >
                        <Image
                          src={l.imageUrl}
                          alt={l.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {o.lines.length > 3 && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-bone bg-ink/[0.04] text-[11px] font-semibold text-ink/60">
                        +{o.lines.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-ink">
                      {o.lines.map((l) => `${l.qty}× ${l.title}`).join(" · ")}
                    </p>
                    <p className="truncate text-[12.5px] text-ink/55">
                      {o.customer.name} · {o.customer.phone}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end text-right">
                    <p
                      className={`text-[14.5px] font-semibold tabular-nums ${
                        o.discountAmount ? "text-vermillion" : "text-ink"
                      }`}
                    >
                      {formatINR(o.total)}
                    </p>
                    <p className="text-[12px] text-ink/50">{timeAgo(o.createdAt)}</p>
                    {o.promoCode && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-vermillion/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-vermillion">
                        <Tag className="h-2.5 w-2.5" strokeWidth={2.5} />
                        {o.promoCode}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            basePath={basePath}
            extraParams={{ status: filter === "all" ? undefined : filter }}
          />
        </>
      )}
    </div>
  );
}
