import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus, Sparkles } from "lucide-react";
import { requireActiveStore } from "@/lib/seller-auth";
import { listProductsForStore } from "@/lib/products";
import { listBookingsForStore, listSlotsForStore } from "@/lib/service-slots";
import { formatINR, cn } from "@/lib/utils";
import { FeatureToggles } from "@/components/dashboard/feature-toggles";

export const metadata = {
  title: "Dashboard · Services",
  description: "Manage your service listings and bookings.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const store = await requireActiveStore();

  if (!store.servicesEnabled) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="eyebrow mb-2">Services</p>
          <h1 className="display-m text-ink">Bookable services</h1>
          <p className="mt-3 text-[14px] text-ink/65 max-w-md">
            Turn your shop into a bookable service — for massages, cleanings,
            consultations, anything that runs on appointments instead of
            shipping.
          </p>
        </div>
        <FeatureToggles
          storeSlug={store.slug}
          enabled={false}
          featureKey="servicesEnabled"
          title="Service bookings"
          description="Let customers pick a time slot and book a service from your storefront."
          icon={<CalendarDays className="h-5 w-5 text-vermillion mt-1 shrink-0" />}
        />
      </div>
    );
  }

  const products = await listProductsForStore(store.slug);
  const services = products.filter((p) => p.kind === "service");
  const allSlots = await listSlotsForStore(store.slug);
  const upcoming = await listBookingsForStore(store.slug, { fromNow: true });

  const totalSlots = allSlots.length;
  const openSlots = allSlots.filter(
    (s) => !s.isBlocked && s.bookedCount < s.capacity,
  ).length;
  const bookedSlots = allSlots.filter((s) => s.bookedCount > 0).length;
  const nextBooking = upcoming[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Services</p>
          <h1 className="display-m text-ink">Bookable services</h1>
          <p className="text-[13px] text-ink/55 mt-1">
            {services.length} service{services.length === 1 ? "" : "s"} ·{" "}
            {totalSlots} slot{totalSlots === 1 ? "" : "s"} ·{" "}
            {bookedSlots} booked
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Services" value={services.length} />
        <Stat label="Open slots" value={openSlots} />
        <Stat label="Booked" value={bookedSlots} />
        <Stat
          label="Next booking"
          value={
            nextBooking
              ? new Date(nextBooking.startsAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "—"
          }
        />
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <CalendarDays className="h-10 w-10 text-ink/20 mx-auto mb-3" />
          <p className="text-[15px] text-ink/55">No service listings yet.</p>
          <p className="mt-1 text-[13px] text-ink/40 max-w-md mx-auto">
            Service listings live alongside your products. When you create or
            edit a product, switch its kind to{" "}
            <strong className="text-ink/70">Service</strong> in the Products
            page — that turns it into a bookable item with time slots.
          </p>
          <Link
            href="/dashboard/products"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-ink px-5 text-[12.5px] font-semibold text-bone hover:bg-ink/90"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create a service
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const mySlots = allSlots.filter((sl) => sl.productId === s.id);
            const myBooked = mySlots.filter((sl) => sl.bookedCount > 0)
              .length;
            const myUpcoming = upcoming.filter((b) => b.productId === s.id)
              .length;
            return (
              <Link
                key={s.id}
                href={`/dashboard/services/${s.id}`}
                className="group block rounded-2xl border border-ink/10 bg-white p-5 transition-all hover:shadow-md hover:border-ink/15"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14.5px] font-semibold text-ink truncate">
                      {s.title}
                    </h3>
                    <p className="text-[12px] text-ink/50 mt-0.5">
                      {s.durationMinutes ?? 60} min ·{" "}
                      {formatINR(s.price)}
                    </p>
                  </div>
                  <Sparkles className="h-4 w-4 text-vermillion shrink-0" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <Mini label="Slots" value={mySlots.length} />
                  <Mini label="Booked" value={myBooked} />
                  <Mini label="Upcoming" value={myUpcoming} />
                  <Mini
                    label="Available"
                    value={mySlots.filter(
                      (sl) => !sl.isBlocked && sl.bookedCount < sl.capacity,
                    ).length}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Upcoming bookings */}
      {upcoming.length > 0 && (
        <section className="rounded-2xl border border-ink/10 bg-bone p-6 space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              Upcoming bookings
            </h2>
            <p className="text-[12px] text-ink/50">
              Sorted soonest first. Customer details are kept private until
              you confirm.
            </p>
          </div>
          <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
            {upcoming.slice(0, 10).map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink truncate">
                    {b.productTitle ?? "Service"}
                  </p>
                  <p className="text-[12px] text-ink/55">
                    {b.customerName} · {b.customerPhone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-ink">
                    {new Date(b.startsAt).toLocaleString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-[11px] font-medium text-ink/50">{label}</p>
      <p className="mt-1 text-[18px] font-bold tracking-[-0.02em] tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-ink/[0.03] px-2 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink/45">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[16px] font-bold tabular-nums text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}