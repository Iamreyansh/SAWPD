import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, Inbox } from "lucide-react";
import { isAdmin } from "@/lib/admin-auth";
import { getStore } from "@/lib/store";
import { listOrders } from "@/lib/orders";
import { listProductsForStore } from "@/lib/products";
import { listApplications } from "@/lib/applications";
import { getTrialState } from "@/lib/trial";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { StoreControls } from "./store-controls";
import { formatINR } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStore(slug);
  return {
    title: store ? `Admin · ${store.name}` : "Admin · Store",
    description: store
      ? `Inspect, suspend, or change the plan for ${store.name}.`
      : "Store detail and controls.",
  };
}
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

export default async function AdminStoreDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  const [orders, products, applications] = await Promise.all([
    listOrders(store.slug),
    listProductsForStore(store.slug),
    listApplications(),
  ]);
  const trial = getTrialState(store);
  const matchedApp = applications.find((a) => a.email === store.notifyEmail);

  const verified = orders.filter(
    (o) => o.status === "verified" || o.status === "shipped" || o.status === "completed"
  );
  const totalRevenue = verified.reduce((acc, o) => acc + o.total, 0);
  const totalDiscount = orders.reduce((acc, o) => acc + (o.discountAmount ?? 0), 0);
  const pendingVerification = orders.filter((o) => o.status === "awaiting_verification").length;
  const lowStock = products.filter(
    (p) => p.isAvailable && p.stockCount > 0 && p.stockCount <= 5
  );
  const soldOut = products.filter((p) => p.stockCount === 0).length;

  const recentOrders = [...orders]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link
          href="/admin/stores"
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink/50 transition-colors hover:text-ink"
        >
          ← All stores
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display-m text-ink">{store.name}</h1>
          <span
            className={
              "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] " +
              (trial.active
                ? "bg-ink/[0.06] text-ink"
                : "bg-vermillion/10 text-vermillion")
            }
          >
            {trial.planLabel}
          </span>
        </div>
        <p className="mt-2 text-[14px] text-ink/60">
          <span className="font-mono text-ink/70">/s/{store.slug}</span>
          <span className="mx-2">·</span>
          <span>Notify: {store.notifyEmail || "—"}</span>
          <span className="mx-2">·</span>
          <span>UPI: {store.upiId || "—"}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/s/${store.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink/30"
          >
            Open storefront
            <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
          </Link>
          {matchedApp && (
            <Link
              href={`/admin/applications/${matchedApp.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink/30"
            >
              <Inbox className="h-3 w-3" strokeWidth={2} />
              View application
            </Link>
          )}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Revenue"
          value={formatINR(totalRevenue)}
          sub={`${verified.length} paid order${verified.length === 1 ? "" : "s"}`}
        />
        <Stat
          label="Verify queue"
          value={pendingVerification}
          highlight={pendingVerification > 0}
          sub="Awaiting screenshot review"
        />
        <Stat
          label="Products"
          value={products.length}
          sub={soldOut > 0 ? `${soldOut} sold out` : `${lowStock.length} low stock`}
        />
        <Stat
          label="Orders"
          value={orders.length}
          sub={totalDiscount > 0 ? `${formatINR(totalDiscount)} discounted` : "Lifetime"}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="rounded-2xl border border-ink/10 bg-bone p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow-ink">Recent orders</p>
              <p className="text-[12px] text-ink/45">{orders.length} total</p>
            </div>
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-[13.5px] text-ink/50">
                No orders yet.
              </p>
            ) : (
              <ul className="divide-y divide-ink/10">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-[13.5px]">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex -space-x-2">
                        {o.lines.slice(0, 3).map((l) => (
                          <div
                            key={l.productId + l.title}
                            className="relative h-9 w-9 overflow-hidden rounded-lg border-2 border-bone bg-ink/[0.04]"
                          >
                            <Image
                              src={l.imageUrl}
                              alt={l.title}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-ink">
                          {o.lines.map((l) => `${l.qty}× ${l.title}`).join(" · ")}
                        </p>
                        <p className="truncate text-[12px] text-ink/55">
                          {o.customer.name} · {o.customer.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <p className="font-semibold tabular-nums text-ink">
                        {formatINR(o.total)}
                      </p>
                      <OrderStatusBadge status={o.status} />
                      <p className="text-[11px] text-ink/45">{timeAgo(o.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <StoreControls
            storeSlug={store.slug}
            initialPaused={!!store.paused}
            initialPausedReason={store.pausedReason}
            currentPlan={store.plan ?? "none"}
            applicationId={matchedApp?.id}
            applicantEmail={matchedApp?.email}
          />
        </div>
      </div>

      {lowStock.length > 0 && (
        <section className="rounded-2xl border border-vermillion/20 bg-vermillion/[0.04] p-5">
          <p className="eyebrow text-vermillion mb-3">Low stock · {lowStock.length}</p>
          <ul className="space-y-2 text-[13.5px]">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="text-ink">{p.title}</span>
                <span className="text-vermillion">Only {p.stockCount} left</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-5 " +
        (highlight ? "border-vermillion/30 bg-vermillion/[0.04]" : "border-ink/10 bg-bone")
      }
    >
      <p className="eyebrow-ink">{label}</p>
      <p
        className={
          "mt-2 text-2xl font-bold tracking-[-0.02em] tabular-nums " +
          (highlight ? "text-vermillion" : "text-ink")
        }
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[11.5px] text-ink/55">{sub}</p>}
    </div>
  );
}
