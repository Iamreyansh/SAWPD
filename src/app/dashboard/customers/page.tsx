import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getFirstStore } from "@/lib/store";
import { listOrders } from "@/lib/orders";
import { aggregateCustomers } from "@/lib/customers";
import { CustomersClient } from "@/components/dashboard/customers-client";

export const metadata = {
  title: "Dashboard · Customers",
  description: "See your buyers, their lifetime value, and order history.",
};
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const store = await getFirstStore();
  if (!store) redirect("/dashboard");
  const orders = await listOrders(store.slug);
  const customers = aggregateCustomers(orders);
  return <CustomersClient storeName={store.name} customers={customers} />;
}
