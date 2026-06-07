import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { getActiveStoreForSeller } from "@/lib/store";
import { listOrders } from "@/lib/orders";
import { aggregateCustomers, customersToCsv } from "@/lib/customers";

export const dynamic = "force-dynamic";

export async function GET() {
  const seller = await requireSeller().catch(() => null);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await getActiveStoreForSeller(seller.id);
  if (!store) {
    return NextResponse.json({ error: "No shop selected" }, { status: 404 });
  }
  const orders = await listOrders(store.slug);
  const customers = aggregateCustomers(orders);
  const csv = customersToCsv(customers);
  const filename = `${store.slug}-customers-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse("\ufeff" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
