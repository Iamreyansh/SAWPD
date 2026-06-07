"use client";

import { useState, useMemo } from "react";
import { Search, Download, Users, TrendingUp, ShoppingBag, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import type { Customer } from "@/lib/customers";

const PAGE_SIZE = 12;

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  awaiting_verification: "Awaiting verification",
  verified: "Verified",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function CustomersClient({
  storeName,
  customers,
}: {
  storeName: string;
  customers: Customer[];
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.phone.toLowerCase().includes(needle) ||
        (c.email ?? "").toLowerCase().includes(needle)
    );
  }, [customers, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const stats = useMemo(() => {
    const totalLtv = customers.reduce((s, c) => s + c.lifetimeValue, 0);
    const repeat = customers.filter((c) => c.orderCount > 1).length;
    return {
      total: customers.length,
      repeat,
      totalLtv,
      avgLtv: customers.length ? Math.round(totalLtv / customers.length) : 0,
    };
  }, [customers]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow-ink">Customers</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Your {storeName} buyers</h1>
          <p className="mt-1 text-sm text-ink/60">
            One row per phone number. Sorted by lifetime value (highest first).
          </p>
        </div>
        <a
          href="/api/dashboard/customers"
          className="inline-flex items-center gap-2 self-start rounded-full bg-ink px-4 py-2 text-sm font-medium text-bone transition hover:bg-vermillion sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Total customers" value={String(stats.total)} />
        <StatCard icon={ShoppingBag} label="Repeat buyers" value={String(stats.repeat)} />
        <StatCard icon={TrendingUp} label="Avg. lifetime" value={formatINR(stats.avgLtv)} />
        <StatCard icon={IndianRupee} label="Total revenue" value={formatINR(stats.totalLtv)} />
      </div>

      <div className="rounded-3xl border border-ink/5 bg-bone/40 p-4">
        <label className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-ink/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone, or email"
            className="flex-1 bg-transparent outline-none placeholder:text-ink/30"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="text-xs text-ink/50 hover:text-ink"
            >
              Clear
            </button>
          )}
        </label>

        <div className="mt-3 overflow-hidden rounded-2xl border border-ink/5 bg-white">
          {filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink/50">
              {customers.length === 0
                ? "No customers yet. Once orders roll in, they'll show up here."
                : "No matches for that search."}
            </p>
          ) : (
            <ul className="divide-y divide-ink/5">
              {visible.map((c, idx) => (
                <motion.li
                  key={c.phoneDigits}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.01, 0.2) }}
                  className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <p className="font-medium text-ink">{c.name}</p>
                    {c.email ? (
                      <p className="truncate text-xs text-ink/50">{c.email}</p>
                    ) : null}
                  </div>
                  <div className="col-span-7 sm:col-span-3">
                    <p className="text-ink">{c.phone}</p>
                  </div>
                  <div className="col-span-3 text-right sm:col-span-1">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink/5 px-2 text-xs font-medium text-ink">
                      {c.orderCount}
                    </span>
                    {c.orderCount > 1 && (
                      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-vermillion">repeat</p>
                    )}
                  </div>
                  <div className="col-span-12 text-right sm:col-span-2">
                    <p className="font-medium tabular-nums text-ink">
                      {formatINR(c.lifetimeValue)}
                    </p>
                    <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-ink/45">
                      LTV
                    </p>
                  </div>
                  <div className="col-span-12 text-right sm:col-span-2">
                    <p className="text-xs text-ink/60">{formatDate(c.lastOrderAt)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-ink/40">
                      {STATUS_LABEL[c.lastOrderStatus] ?? c.lastOrderStatus}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-2 text-right text-xs text-ink/40">
          Showing {filtered.length} of {customers.length}
        </p>
        <div className="mt-2">
          <ClientPager
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/5 bg-white p-4">
      <div className="flex items-center gap-2 text-ink/50">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
    </div>
  );
}

function ClientPager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-2 flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-full border border-ink/10 px-3 py-1 text-[12px] font-semibold text-ink/60 disabled:opacity-30"
      >
        ← Prev
      </button>
      <span className="px-2 text-[12px] tabular-nums text-ink/55">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-full border border-ink/10 px-3 py-1 text-[12px] font-semibold text-ink/60 disabled:opacity-30"
      >
        Next →
      </button>
    </div>
  );
}
