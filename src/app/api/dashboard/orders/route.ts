import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { getActiveStoreForSeller } from "@/lib/store";
import { listOrders } from "@/lib/orders";
import { ordersToCsv } from "@/lib/customers";

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
  const sorted = [...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const csv = ordersToCsv(sorted);
  const filename = `${store.slug}-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse("\ufeff" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
