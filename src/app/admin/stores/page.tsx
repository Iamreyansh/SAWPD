import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { isAdmin } from "@/lib/admin-auth";
import { listStoreSummaries } from "@/lib/stores";

export const metadata = { title: "Admin · Stores" };
export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const stores = await listStoreSummaries();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="eyebrow mb-2">Stores</p>
        <h1 className="display-m text-ink">All shops</h1>
        <p className="mt-1 text-[13.5px] text-ink/55">
          Every storefront on this SAWPD instance.
        </p>
      </header>

      {stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <p className="text-[15px] text-ink/60">No stores yet.</p>
          <p className="mt-1 text-[13px] text-ink/45">
            Approve an application to provision a shop.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {stores.map(({ store, orderCount, productCount, open, planLabel, daysLeft }) => (
            <li
              key={store.slug}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-bone p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-ink">
                    {store.name}
                  </p>
                  <span className="font-mono text-[11.5px] text-ink/50">
                    /s/{store.slug}
                  </span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] " +
                      (open
                        ? "bg-ink/[0.06] text-ink"
                        : "bg-vermillion/10 text-vermillion")
                    }
                  >
                    {open ? "Open" : "Paused"}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-ink/55">
                  {planLabel}
                  {daysLeft !== null && daysLeft > 0
                    ? ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                    : ""}{" "}
                  · {orderCount} order{orderCount === 1 ? "" : "s"} · {productCount}{" "}
                  product{productCount === 1 ? "" : "s"}
                </p>
              </div>
              <Link
                href={`/admin/stores/${store.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink/30"
              >
                Manage
              </Link>
              <Link
                href={`/s/${store.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink/30"
              >
                View shop
                <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
