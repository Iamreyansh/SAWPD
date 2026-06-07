import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getFirstStore } from "@/lib/store";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const store = await getFirstStore();
  if (!store) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="eyebrow mb-3">Dashboard</p>
          <h1 className="display-m text-ink">No shop found.</h1>
          <p className="mt-3 text-[14px] text-ink/60">
            Seed <code className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-[12px]">data/store.json</code> with at least one store.
          </p>
        </div>
      </main>
    );
  }
  return (
    <DashboardShell
      storeName={store.name}
      storeHandle={store.slug}
    >
      {children}
    </DashboardShell>
  );
}
