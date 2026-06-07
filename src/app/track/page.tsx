import { Suspense } from "react";
import { TrackClient, type DemoOrder } from "./track-client";
import { listOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Track your order · SAWPD",
  description: "Look up the status of your order by order ID and phone number.",
};

export default async function TrackPage() {
  // Surface 1–2 recent demo orders so first-time visitors can try the flow
  // without needing to remember a real order ID. Production users get an
  // empty list.
  const all = await listOrders("riya");
  const demos: DemoOrder[] = all
    .slice(0, 2)
    .map((o) => ({
      id: o.id,
      phone: o.customer.phone,
      status: o.status,
      createdAt: o.createdAt,
    }));

  return (
    <main className="container-editorial flex min-h-[80vh] flex-col items-center justify-center py-16">
      <Suspense fallback={null}>
        <TrackClient demos={demos} />
      </Suspense>
    </main>
  );
}
