"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tag,
  Users,
  Settings,
  LogOut,
  ArrowUpRight,
  Undo2,
  Store as StoreIcon,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sellerLogoutAction, setActiveStoreAction } from "@/app/seller/actions";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/returns", label: "Returns", icon: Undo2 },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/promotions", label: "Promotions", icon: Tag },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export type DashboardStoreOption = {
  slug: string;
  name: string;
  active: boolean;
};

export function DashboardShell({
  children,
  sellerEmail,
  activeStoreName,
  activeStoreSlug,
  stores,
}: {
  children: React.ReactNode;
  sellerEmail: string;
  activeStoreName: string;
  activeStoreSlug: string;
  stores: DashboardStoreOption[];
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-bone">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-ink/[0.07] bg-bone md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-ink/[0.06] px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-vermillion text-bone font-bold text-sm shadow-glow">
            {activeStoreName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-ink">
              {activeStoreName}
            </p>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/40">
              @{activeStoreSlug}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
                  active
                    ? "bg-vermillion/[0.08] text-vermillion-deep"
                    : "text-ink/65 hover:bg-ink/[0.04] hover:text-ink"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active ? "text-vermillion" : "text-ink/50 group-hover:text-ink"
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-ink/[0.06] p-3">
          {stores.length > 1 ? (
            <StoreSwitcher
              activeName={activeStoreName}
              stores={stores}
            />
          ) : null}
          <Link
            href={`/s/${activeStoreSlug}`}
            className="mt-1 flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px] font-medium text-ink/55 transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            View shop
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
          <Link
            href="/apply"
            className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] font-medium text-vermillion transition-colors hover:bg-vermillion/[0.06]"
          >
            <StoreIcon className="h-4 w-4" strokeWidth={1.75} />
            Apply for another shop
          </Link>
          <div className="mt-2 border-t border-ink/[0.05] pt-2">
            <p className="truncate px-3 text-[11px] font-medium text-ink/45">
              {sellerEmail}
            </p>
            <form action={sellerLogoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink/65 transition-colors hover:bg-ink/[0.04] hover:text-ink"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink/10 bg-bone/85 px-6 backdrop-blur-md md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vermillion text-bone font-bold text-sm">
              {activeStoreName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
              {activeStoreName}
            </span>
          </Link>
          <form action={sellerLogoutAction}>
            <button
              type="submit"
              className="text-[12.5px] font-medium text-ink/55 hover:text-ink"
            >
              Log out
            </button>
          </form>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-ink/10 px-4 py-2 md:hidden">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  active
                    ? "bg-ink text-bone"
                    : "text-ink/60 hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="px-6 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}

function StoreSwitcher({
  activeName,
  stores,
}: {
  activeName: string;
  stores: DashboardStoreOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg bg-ink/[0.04] px-3 py-2 text-left text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07]"
      >
        <span className="flex items-center gap-2">
          <StoreIcon className="h-3.5 w-3.5 text-ink/55" strokeWidth={1.75} />
          Switch shop
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-ink/45 transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>
      {open ? (
        <ul className="absolute bottom-full left-0 right-0 z-10 mb-1 max-h-60 overflow-y-auto rounded-lg border border-ink/[0.07] bg-bone py-1 shadow-float">
          {stores.map((s) => (
            <li key={s.slug}>
              <form
                action={(formData) => {
                  const slug = formData.get("slug");
                  if (typeof slug === "string" && slug) {
                    startTransition(() => {
                      setActiveStoreAction(slug);
                    });
                  }
                }}
              >
                <input type="hidden" name="slug" value={s.slug} />
                <button
                  type="submit"
                  disabled={isPending || s.active}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12.5px] font-medium transition-colors",
                    s.active
                      ? "bg-vermillion/[0.08] text-vermillion-deep"
                      : "text-ink/75 hover:bg-ink/[0.04] hover:text-ink",
                    isPending && "opacity-60",
                  )}
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/40">
                    @{s.slug}
                  </span>
                </button>
              </form>
            </li>
          ))}
          <li className="border-t border-ink/[0.06] px-3 pb-1 pt-2">
            <Link
              href="/apply"
              onClick={() => setOpen(false)}
              className="block text-[12px] font-semibold text-vermillion hover:underline"
            >
              + Apply for a new shop
            </Link>
          </li>
        </ul>
      ) : null}
      <p className="mt-1.5 truncate px-3 text-[10.5px] uppercase tracking-[0.14em] text-ink/40">
        {activeName}
      </p>
    </div>
  );
}
