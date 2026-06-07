import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getFirstStore } from "@/lib/store";
import { listProductsForStore } from "@/lib/products";
import { ProductsClient } from "@/components/dashboard/products-client";

export const metadata = { title: "Dashboard · Products" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const store = await getFirstStore();
  if (!store) redirect("/dashboard");
  const products = await listProductsForStore(store.slug);
  return <ProductsClient storeSlug={store.slug} products={products} />;
}
