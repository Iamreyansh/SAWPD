"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Store,
  LogOut,
  ArrowUpRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/admin/actions";
import { Logo } from "@/components/ui/logo";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/applications", label: "Applications", icon: Inbox },
  { href: "/admin/stores", label: "Stores", icon: Store },
  { href: "/admin/demo", label: "Demo shops", icon: Eye },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-bone">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-ink/10 bg-bone md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-ink/10 px-5">
          <Logo href={undefined} />
          <div className="leading-tight">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/40">
              Admin
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-ink text-bone"
                    : "text-ink/65 hover:bg-ink/[0.04] hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-ink/10 p-3">
          <Link
            href="/"
            className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px] font-medium text-ink/55 transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            View site
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink/65 transition-colors hover:bg-ink/[0.04] hover:text-ink"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink/10 bg-bone/85 px-6 backdrop-blur-md md:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo invert />
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
              Admin
            </span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-[12.5px] font-medium text-ink/55 hover:text-ink"
            >
              Log out
            </button>
          </form>
        </header>
        <nav className="flex gap-1 border-b border-ink/10 px-4 py-2 md:hidden">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
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
