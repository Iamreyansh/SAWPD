import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getFirstStore } from "@/lib/store";
import { listProductsForStore } from "@/lib/products";
import { listOrders } from "@/lib/orders";
import { listPromosForStore } from "@/lib/promos";
import { getTrialState } from "@/lib/trial";
import { formatINR } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { Sparkline, buildDailyRevenue } from "@/components/dashboard/sparkline";
import { CheckInventoryButton } from "@/components/dashboard/check-inventory-button";
import { OnboardingBanner, type OnboardingStep } from "@/components/dashboard/onboarding-banner";
import type { Order, SellerStore } from "@/types/seller";

const LOW_STOCK_THRESHOLD = 5;

export const metadata = { title: "Dashboard · Overview" };
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

export default async function DashboardOverviewPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const store = (await getFirstStore()) as SellerStore | null;
  if (!store) redirect("/dashboard");

  const [orders, products, promos] = await Promise.all([
    listOrders(store.slug),
    listProductsForStore(store.slug),
    listPromosForStore(store.slug),
  ]);

  const verifiedOrLater = orders.filter(
    (o) => o.status === "verified" || o.status === "shipped" || o.status === "completed"
  );
  const totalRevenue = verifiedOrLater.reduce((acc, o) => acc + o.total, 0);
  const totalDiscount = orders.reduce(
    (acc, o) => acc + (o.discountAmount ?? 0),
    0
  );
  const pendingVerification = orders.filter(
    (o) => o.status === "awaiting_verification"
  ).length;
  const awaitingPayment = orders.filter(
    (o) => o.status === "awaiting_payment"
  ).length;
  const lowStock = products.filter(
    (p) =>
      p.isAvailable &&
      p.stockCount > 0 &&
      p.stockCount <= LOW_STOCK_THRESHOLD
  );
  const lowStockOut = products.filter((p) => p.stockCount === 0).length;
  const daily = buildDailyRevenue(orders, 30);
  const last7Total = daily.slice(-7).reduce((a, v) => a + v, 0);
  const prev7Total = daily.slice(-14, -7).reduce((a, v) => a + v, 0);
  const weekDelta =
    prev7Total === 0
      ? last7Total > 0
        ? 100
        : 0
      : Math.round(((last7Total - prev7Total) / prev7Total) * 100);

  const recent = orders.slice(0, 6);
  const trial = getTrialState(store);

  // Onboarding checklist — show until dismissed, but always show the
  // "all-set" celebration once everything is done.
  const liveProducts = products.filter(
    (p) => (p.status ?? "live") === "live"
  );
  const onboardingSteps: OnboardingStep[] = [
    {
      key: "product",
      label: "Add your first product",
      done: liveProducts.length > 0,
      href: "/dashboard/products",
      cta: "Add product",
    },
    {
      key: "upi",
      label: "Set your UPI ID",
      done: !!store.upiId && store.upiId.trim().length > 0,
      href: "/dashboard/settings",
      cta: "Set UPI",
    },
    {
      key: "hero",
      label: "Write your hero copy",
      done:
        store.heroSub.trim().length > 20 &&
        store.heroHeadline.some((h) => h.trim().length > 0),
      href: "/dashboard/settings",
      cta: "Write copy",
    },
    {
      key: "promo",
      label: "Add a launch promo",
      done: promos.some((p) => p.status === "active"),
      href: "/dashboard/promotions",
      cta: "Add promo",
    },
  ];
  const showOnboarding =
    !store.onboardingDismissed || onboardingSteps.every((s) => s.done);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Overview</p>
          <h1 className="display-m text-ink">
            Hi, {store.name}.
          </h1>
        </div>
        <Link
          href={`/s/${store.slug}`}
          className="text-[12.5px] font-semibold text-ink/55 transition-colors hover:text-ink"
        >
          View shop →
        </Link>
      </header>

      {showOnboarding && (
        <OnboardingBanner initialSteps={onboardingSteps} />
      )}

      {(trial.reason === "trial" || trial.reason === "trial_ended" || trial.reason === "no_plan") && (
        <section
          className={
            "rounded-2xl border p-5 " +
            (trial.reason === "trial_ended" || (trial.daysLeft !== null && trial.daysLeft <= 3)
              ? "border-vermillion/30 bg-vermillion/[0.04]"
              : "border-ink/10 bg-bone")
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p
                className={
                  "eyebrow mb-1 " +
                  (trial.reason === "trial_ended" || (trial.daysLeft !== null && trial.daysLeft <= 3)
                    ? "text-vermillion"
                    : "text-ink/60")
                }
              >
                {trial.planLabel}
              </p>
              <p className="text-[15px] text-ink">
                {trial.reason === "trial" && trial.daysLeft !== null ? (
                  <>
                    Your trial ends in{" "}
                    <span className="font-semibold">
                      {trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"}
                    </span>
                    . Pick a plan to keep selling.
                  </>
                ) : trial.reason === "trial_ended" ? (
                  <>Your trial ended. Pick a plan to resume selling.</>
                ) : (
                  <>Pick a plan to start selling.</>
                )}
              </p>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-flex h-10 items-center justify-center rounded-full bg-vermillion px-5 text-[13px] font-semibold text-bone transition-all hover:bg-vermillion-deep active:scale-[0.98] shadow-glow"
            >
              Choose plan
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Revenue" value={formatINR(totalRevenue)} />
        <Stat
          label="Verify payment"
          value={pendingVerification}
          highlight={pendingVerification > 0}
        />
        <Stat label="Awaiting payment" value={awaitingPayment} />
        <Stat label="Products" value={products.length} />
      </section>
      {totalDiscount > 0 && (
        <p className="text-[12.5px] text-ink/55">
          {formatINR(totalDiscount)} given in promo discounts across{" "}
          {orders.filter((o) => o.discountAmount).length} order
          {orders.filter((o) => o.discountAmount).length === 1 ? "" : "s"}.
        </p>
      )}

      <section className="rounded-2xl border border-ink/10 bg-bone p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow-ink">Last 30 days · revenue</p>
            <p className="mt-2 text-2xl font-bold tracking-[-0.02em] tabular-nums text-ink">
              {formatINR(last7Total)}
              <span className="ml-2 text-[14px] font-medium text-ink/45">
                this week
              </span>
              {weekDelta !== 0 && (
                <span
                  className={
                    "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums " +
                    (weekDelta > 0
                      ? "bg-vermillion/10 text-vermillion"
                      : "bg-ink/[0.06] text-ink/55")
                  }
                >
                  {weekDelta > 0 ? "↑" : "↓"} {Math.abs(weekDelta)}%
                </span>
              )}
            </p>
          </div>
          <p className="text-[12px] text-ink/45">
            {verifiedOrLater.length} paid order
            {verifiedOrLater.length === 1 ? "" : "s"} total
          </p>
        </div>
        <Sparkline
          values={daily}
          ariaLabel={`Revenue sparkline: last 30 days, total ${formatINR(totalRevenue)}`}
        />
      </section>

      {(lowStock.length > 0 || lowStockOut > 0) ? (
        <section
          className={
            "rounded-2xl border p-5 " +
            (lowStock.length > 0
              ? "border-vermillion/30 bg-vermillion/[0.04]"
              : "border-ink/10 bg-bone")
          }
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p
                className={
                  "eyebrow " + (lowStock.length > 0 ? "text-vermillion" : "")
                }
              >
                Stock alerts
              </p>
              <p className="mt-1 text-[14.5px] font-semibold text-ink">
                {lowStock.length} {lowStock.length === 1 ? "product" : "products"} below {LOW_STOCK_THRESHOLD} left
                {lowStockOut > 0 && `, ${lowStockOut} sold out`}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CheckInventoryButton storeSlug={store.slug} />
              <Link
                href="/dashboard/products"
                className="text-[12px] font-semibold text-ink/55 hover:text-ink"
              >
                Manage →
              </Link>
            </div>
          </div>
          <ul className="space-y-2 text-[13.5px]">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="text-ink">{p.title}</span>
                <span className="text-vermillion">
                  Only {p.stockCount} left
                </span>
              </li>
            ))}
            {lowStockOut > 0 && (
              <li className="flex items-center justify-between">
                <span className="text-ink">{lowStockOut} product{lowStockOut === 1 ? "" : "s"} sold out</span>
                <span className="text-ink/50">Restock</span>
              </li>
            )}
          </ul>
        </section>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-bone p-5">
          <div>
            <p className="eyebrow-ink">Inventory</p>
            <p className="mt-1 text-[14.5px] text-ink/70">
              All products are well stocked.
            </p>
          </div>
          <CheckInventoryButton storeSlug={store.slug} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">
            Recent orders
          </h2>
          <Link
            href="/dashboard/orders"
            className="text-[12.5px] font-semibold text-ink/55 transition-colors hover:text-ink"
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 p-10 text-center">
            <p className="text-[15px] text-ink/60">No orders yet.</p>
            <p className="mt-1 text-[13px] text-ink/45">
              Share your shop link to start selling.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-bone">
            {recent.map((o) => (
              <RecentOrderRow key={o.id} order={o} />
            ))}
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
  value: number | string;
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
          "mt-2 text-2xl font-bold tracking-[-0.02em] tabular-nums " +
          (highlight ? "text-vermillion" : "text-ink")
        }
      >
        {value}
      </p>
    </div>
  );
}

function RecentOrderRow({ order }: { order: Order }) {
  const customer = order.customer;
  return (
    <li>
      <Link
        href={`/dashboard/orders/${order.id}`}
        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink/[0.02]"
      >
        <div className="hidden sm:block">
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-ink">
            {order.lines.map((l) => l.title).join(", ")}
          </p>
          <p className="truncate text-[12.5px] text-ink/55">
            {customer.name} · {customer.phone}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end text-right">
          <p
            className={`text-[14.5px] font-semibold tabular-nums ${
              order.discountAmount ? "text-vermillion" : "text-ink"
            }`}
          >
            {formatINR(order.total)}
          </p>
          <p className="text-[12px] text-ink/50">{timeAgo(order.createdAt)}</p>
          {order.promoCode && (
            <span className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-vermillion">
              {order.promoCode}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
