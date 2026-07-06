import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveStore } from "@/lib/seller-auth";
import { listOrdersForStore, countOrdersByStatus } from "@/lib/custom-orders";
import type { CustomOrderStatus } from "@/types/custom-orders";
import { CustomOrderStatusBadge } from "@/components/dashboard/custom-order-status-badge";
import { formatINR, timeAgo } from "@/lib/utils";
import { Package, Eye, Sparkles } from "lucide-react";

export const metadata = {
  title: "Dashboard · Custom Orders",
  description: "Review and decide on incoming custom orders.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<CustomOrderStatus, string> = {
  pending: "Pending",
  awaiting_payment: "Awaiting Payment",
  awaiting_verification: "Verifying",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
};

export default async function CustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const store = await requireActiveStore();
  if (!store.customOrdersEnabled) {
    redirect("/dashboard/settings?feature=custom_orders");
  }
  const { status: filter } = await searchParams;
  const orders = await listOrdersForStore(store.slug);
  const counts = await countOrdersByStatus(store.slug);

  const filtered = filter
    ? orders.filter((o) => o.status === filter)
    : orders;

  const tabs: { label: string; value: string | null; count: number }[] = [
    { label: "All", value: null, count: orders.length },
    { label: "Pending", value: "pending", count: counts.pending },
    { label: "Confirmed", value: "confirmed", count: counts.confirmed },
    { label: "Fulfilled", value: "fulfilled", count: counts.fulfilled },
    { label: "Rejected", value: "rejected", count: counts.rejected },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Custom Orders</p>
          <h1 className="display-m text-ink">Incoming custom orders</h1>
          <p className="text-[13px] text-ink/55 mt-1">
            {counts.pending} pending · {counts.confirmed} confirmed ·{" "}
            {counts.fulfilled} fulfilled
          </p>
        </div>
        <Link
          href="/dashboard/custom-templates"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 text-[12.5px] font-semibold text-ink hover:bg-ink/[0.02]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Manage Templates
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-ink/10">
        {tabs.map((tab) => (
          <Link
            key={tab.value ?? "all"}
            href={
              tab.value
                ? `/dashboard/custom-orders?status=${tab.value}`
                : "/dashboard/custom-orders"
            }
            className={
              "px-4 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors " +
              ((tab.value === null && !filter) || tab.value === filter
                ? "border-vermillion text-vermillion"
                : "border-transparent text-ink/50 hover:text-ink")
            }
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-[10px] bg-ink/[0.06] rounded-full px-1.5 py-0.5">
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-ink/15">
          <Package className="h-10 w-10 text-ink/20 mx-auto mb-3" />
          <p className="text-[15px] text-ink/55">
            {filter
              ? `No ${STATUS_LABELS[filter as CustomOrderStatus]?.toLowerCase()} orders`
              : "No custom orders yet"}
          </p>
          <p className="text-[13px] text-ink/40 mt-1">
            Custom orders will appear here when customers submit them.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {filtered.map((order) => (
            <li key={order.id}>
              <Link
                href={`/dashboard/custom-orders/${order.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-ink/[0.02] transition-colors"
              >
                <div className="hidden sm:block shrink-0">
                  <CustomOrderStatusBadge status={order.status} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink truncate">
                    {order.templateName}
                  </p>
                  <p className="text-[12.5px] text-ink/55 truncate">
                    {order.customerName} · {order.customerPhone}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end text-right">
                  <p className="text-[14.5px] font-semibold tabular-nums text-ink">
                    {formatINR(order.totalPrice)}
                  </p>
                  <p className="text-[11px] text-ink/45">{timeAgo(order.createdAt)}</p>
                </div>
                <Eye className="h-4 w-4 text-ink/25 shrink-0 hidden sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending" value={counts.pending} />
        <StatCard label="Confirmed" value={counts.confirmed} />
        <StatCard label="Fulfilled" value={counts.fulfilled} />
        <StatCard
          label="Revenue"
          value={formatINR(
            orders
              .filter((o) => ["confirmed", "fulfilled"].includes(o.status))
              .reduce((a, o) => a + o.totalPrice, 0),
          )}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-bone p-4">
      <p className="text-[11px] font-medium text-ink/50">{label}</p>
      <p className="text-[18px] font-bold tracking-[-0.02em] tabular-nums text-ink mt-1">
        {value}
      </p>
    </div>
  );
}