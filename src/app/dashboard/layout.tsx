import Link from "next/link";
import { requireSeller, getActiveStoreSlugFromCookie } from "@/lib/seller-auth";
import { getActiveStoreForSeller, getStoresForSeller } from "@/lib/store";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const seller = await requireSeller();
  const stores = await getStoresForSeller(seller.id);
  const cookieSlug = await getActiveStoreSlugFromCookie();
  const activeStore =
    (cookieSlug ? await getActiveStoreForSeller(seller.id, cookieSlug) : null) ??
    (await getActiveStoreForSeller(seller.id));

  if (!activeStore) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <p className="eyebrow mb-3">Seller dashboard</p>
          <h1 className="display-m text-ink">No shops yet.</h1>
          <p className="mt-3 text-[14px] text-ink/65">
            Hi <span className="font-semibold text-ink">{seller.email}</span> —
            apply for your first shop to start selling on SAWPD. You can apply for
            more shops later from the same account.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/apply"
              className="inline-flex h-11 items-center justify-center rounded-full bg-vermillion px-6 text-[13px] font-semibold tracking-[-0.01em] text-bone transition-colors hover:bg-vermillion-deep"
            >
              Apply for a shop →
            </Link>
            <Link
              href="/seller/login"
              className="text-[13px] font-semibold text-ink/55 hover:text-ink hover:underline"
            >
              Use a different account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      sellerEmail={seller.email}
      activeStoreName={activeStore.name}
      activeStoreSlug={activeStore.slug}
      stores={stores.map((s) => ({
        slug: s.slug,
        name: s.name,
        active: s.slug === activeStore.slug,
      }))}
    >
      {children}
    </DashboardShell>
  );
}
