import { Suspense } from "react";
import { TrackClient, type DemoOrder } from "./track-client";
import { listOrders } from "@/lib/orders";
import { listStores } from "@/lib/store";

// Demo store slug for the track-page quick-fill demo. Configurable via
// `NEXT_PUBLIC_DEMO_STORE_SLUG`; falls back to the first store with
// completed orders so renaming `riya` doesn't break the demo.
const DEMO_SLUG = process.env.NEXT_PUBLIC_DEMO_STORE_SLUG;

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Track your order",
  description: "Look up the status of your order by order ID and phone number.",
  robots: { index: false, follow: false },
};

export default async function TrackPage() {
  // Surface 1–2 recent demo orders so first-time visitors can try the flow
  // without needing to remember a real order ID. Only in development.
  // Phone numbers are masked for privacy.
  let demos: DemoOrder[] = [];
  if (process.env.NODE_ENV === "development") {
    const slug = await resolveDemoSlug();
    if (slug) {
      const all = await listOrders(slug);
      demos = all
        .slice(0, 2)
        .map((o) => ({
          id: o.id,
          phone: maskPhone(o.customer.phone),
          status: o.status,
          createdAt: o.createdAt,
        }));
    }
  }

  return (
    <main className="container-editorial flex min-h-[80vh] flex-col items-center justify-center py-16">
      <Suspense fallback={null}>
        <TrackClient demos={demos} />
      </Suspense>
    </main>
  );
}

async function resolveDemoSlug(): Promise<string | null> {
  if (DEMO_SLUG) return DEMO_SLUG;
  const stores = await listStores();
  if (stores.length === 0) return null;
  // Prefer the first store with at least one order; else just the first.
  for (const s of stores) {
    const orders = await listOrders(s.slug);
    if (orders.length > 0) return s.slug;
  }
  return stores[0].slug;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return "XXXXXX" + digits.slice(-4);
}
