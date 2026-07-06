import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, Clock } from "lucide-react";
import { requireActiveStore } from "@/lib/seller-auth";
import { getProduct } from "@/lib/products";
import {
  listSlotsForProduct,
  listBookingsForStore,
} from "@/lib/service-slots";
import { formatINR, cn } from "@/lib/utils";
import { ServiceAvailabilityForm } from "@/components/dashboard/service-availability-form";
import { SlotRow } from "@/components/dashboard/slot-row";

export const metadata = {
  title: "Dashboard · Service",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Params = { id: string };

function fmtSlot(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const store = await requireActiveStore();
  if (!store.servicesEnabled) {
    redirect("/dashboard/services");
  }
  const { id } = await params;
  const product = await getProduct(store.slug, id);
  if (!product || product.kind !== "service") {
    notFound();
  }

  const slots = await listSlotsForProduct(id, { from: new Date() });
  const bookings = await listBookingsForStore(store.slug, { fromNow: true });
  const myBookings = bookings.filter((b) => b.productId === id);

  const totalSlots = slots.length;
  const openSlots = slots.filter(
    (s) => !s.isBlocked && s.bookedCount < s.capacity,
  ).length;
  const pastSlots = 0; // we're only loading future slots

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard/services"
        className="inline-flex items-center gap-1 text-[12px] text-ink/45 hover:text-ink transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        All services
      </Link>

      <header className="rounded-2xl border border-ink/10 bg-bone p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2 flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              Service
            </p>
            <h1 className="display-m text-ink">{product.title}</h1>
            {product.tagline && (
              <p className="mt-2 max-w-md text-[13.5px] text-ink/60">
                {product.tagline}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-ink/55">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {product.durationMinutes ?? 60} min
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                {formatINR(product.price)}
              </span>
              {product.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {product.location}
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-[12px] text-ink/55">
            <p>{totalSlots} future slots</p>
            <p className="text-vermillion font-semibold">
              {openSlots} open · {myBookings.length} booked
            </p>
          </div>
        </div>
      </header>

      <ServiceAvailabilityForm
        productId={product.id}
        slotMinutes={product.durationMinutes ?? 60}
      />

      {/* Upcoming bookings for this service */}
      {myBookings.length > 0 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-5 space-y-3">
          <h2 className="text-[14px] font-semibold text-ink">
            Upcoming bookings ({myBookings.length})
          </h2>
          <ul className="divide-y divide-ink/5">
            {myBookings.slice(0, 20).map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink truncate">
                    {b.customerName}
                  </p>
                  <p className="text-[11.5px] text-ink/55 truncate">
                    {b.customerPhone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-ink tabular-nums">
                    {fmtSlot(b.startsAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Slots table */}
      <section className="rounded-2xl border border-ink/10 bg-white p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[14px] font-semibold text-ink">Slots</h2>
          <p className="text-[11.5px] text-ink/50">
            Blocked slots are hidden from customers but kept so existing
            bookings aren&apos;t lost.
          </p>
        </div>
        {slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/15 p-8 text-center">
            <CalendarDays className="h-8 w-8 text-ink/25 mx-auto mb-2" />
            <p className="text-[13px] text-ink/55">
              No slots yet — add availability above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/5 -mx-2">
            {slots.map((s) => (
              <SlotRow key={s.id} slot={s} />
            ))}
          </ul>
        )}
        <p className="text-[11px] text-ink/40">
          Showing {slots.length} future slot{slots.length === 1 ? "" : "s"}.
        </p>
      </section>
    </div>
  );
}