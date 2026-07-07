import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Eye,
  LayoutDashboard,
  Sparkles,
  Inbox,
} from "lucide-react";
import { isAdmin } from "@/lib/admin-auth";
import { listStoreSummaries } from "@/lib/stores";
import { impersonateSellerAction } from "@/app/admin/actions";
import { cn, timeAgo } from "@/lib/utils";

export const metadata = {
  title: "Admin · Demo shops",
  description: "Live demo: jump into any seller's storefront or dashboard.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminDemoPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const stores = await listStoreSummaries();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="eyebrow mb-2">Demo shops</p>
        <h1 className="display-m text-ink">Jump into any shop</h1>
        <p className="mt-1 max-w-xl text-[13.5px] text-ink/55">
          One-click access to every storefront. Use this when showing
          SAWPD to a prospect — click a shop, then use the buttons
          below to open the storefront or step into the seller&apos;s
          dashboard.
        </p>
      </header>

      {stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <Inbox className="h-10 w-10 text-ink/20 mx-auto mb-3" />
          <p className="text-[15px] text-ink/55">No stores yet.</p>
          <p className="mt-1 text-[13px] text-ink/40">
            Approve a seller application to see shops here.
          </p>
          <Link
            href="/admin/applications"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-ink px-5 text-[12.5px] font-semibold text-bone hover:bg-ink/90"
          >
            View applications
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stores.map(({ store, orderCount, productCount, open, planLabel, daysLeft }) => {
            const inactive = !open;
            return (
              <li
                key={store.slug}
                className="rounded-2xl border border-ink/10 bg-bone p-5 transition-all hover:border-ink/25"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">
                      {store.name}
                    </p>
                    <p className="font-mono text-[11.5px] text-ink/50">
                      /s/{store.slug}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]",
                      open
                        ? "bg-ink/[0.06] text-ink"
                        : "bg-vermillion/10 text-vermillion",
                    )}
                  >
                    {open ? "Open" : "Paused"}
                  </span>
                </div>

                <p className="mt-3 text-[12.5px] text-ink/55">
                  {planLabel}
                  {daysLeft !== null && daysLeft > 0
                    ? ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                    : ""}
                  {" · "}
                  {orderCount} order{orderCount === 1 ? "" : "s"} · {productCount}{" "}
                  product{productCount === 1 ? "" : "s"}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/s/${store.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 text-[12px] font-semibold text-ink transition-colors hover:border-ink/30"
                  >
                    <Eye className="h-3 w-3" strokeWidth={2} />
                    Storefront
                    <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
                  </Link>
                  <Link
                    href={`/admin/stores/${store.slug}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 text-[12px] font-semibold text-ink transition-colors hover:border-ink/30"
                  >
                    Inspect
                  </Link>
                  {/* Server-action form so the link is POSTed (avoids GET
                      accidentally creating seller sessions). */}
                  <form action={impersonateSellerAction.bind(null, store.slug)}>
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-vermillion px-3 text-[12px] font-semibold text-bone transition-colors hover:bg-vermillion-deep shadow-glow"
                    >
                      <LayoutDashboard className="h-3 w-3" strokeWidth={2.25} />
                      Open dashboard
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[12px] text-ink/45 max-w-2xl">
        <Sparkles className="inline h-3 w-3 mr-1 align-text-bottom text-vermillion" />
        <strong className="text-ink/70">Open dashboard</strong> mints a
        temporary seller session in your browser — you see the dashboard
        as that seller would. Your admin session stays active in a
        separate cookie, so opening <code className="font-mono">/admin</code>{" "}
        in a new tab still works. Sign out from the seller dashboard to
        return to demo.
      </p>
    </div>
  );
}