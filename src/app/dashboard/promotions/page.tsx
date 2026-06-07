import { redirect } from "next/navigation";
import { getFirstStore } from "@/lib/store";
import { listPromosForStore } from "@/lib/promos";
import { isAdmin } from "@/lib/admin-auth";
import { PromotionsClient } from "@/components/dashboard/promotions-client";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const store = await getFirstStore();
  if (!store) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
        <p className="text-[15px] text-ink/60">No store yet.</p>
      </div>
    );
  }
  const promos = await listPromosForStore(store.slug);
  return <PromotionsClient storeSlug={store.slug} promos={promos} />;
}
