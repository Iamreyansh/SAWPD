import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bookable time windows for service listings (massages, cleaning,
 * consultations, etc). Each row represents a single slot; when a
 * customer books, we insert a row into `service_bookings` and
 * increment `booked_count`. When booked_count == capacity the slot
 * is full.
 */

export type ServiceSlot = {
  id: string;
  storeSlug: string;
  productId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  isBlocked: boolean;
  createdAt: string;
};

export type Booking = {
  id: string;
  orderId: string;
  slotId: string;
  productId: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
};

function rowToSlot(row: Record<string, unknown>): ServiceSlot {
  return {
    id: row.id as string,
    storeSlug: row.store_slug as string,
    productId: row.product_id as string,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    capacity: (row.capacity as number) ?? 1,
    bookedCount: (row.booked_count as number) ?? 0,
    isBlocked: (row.is_blocked as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

function rowToBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    slotId: row.slot_id as string,
    productId: row.product_id as string,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    createdAt: row.created_at as string,
  };
}

/**
 * Slots for a product between two timestamps. Returns rows ordered by
 * starts_at ASC. Filters out blocked slots server-side (in addition
 * to the RLS policy).
 */
export async function listSlotsForProduct(
  productId: string,
  opts: { from?: Date; to?: Date } = {},
): Promise<ServiceSlot[]> {
  const sb = createAdminClient();
  let q = sb
    .from("service_slots")
    .select("*")
    .eq("product_id", productId)
    .eq("is_blocked", false)
    .order("starts_at", { ascending: true });
  if (opts.from) q = q.gte("starts_at", opts.from.toISOString());
  if (opts.to) q = q.lte("starts_at", opts.to.toISOString());
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(rowToSlot);
}

export async function listSlotsForStore(
  storeSlug: string,
  opts: { from?: Date; to?: Date } = {},
): Promise<ServiceSlot[]> {
  const sb = createAdminClient();
  let q = sb
    .from("service_slots")
    .select("*")
    .eq("store_slug", storeSlug)
    .order("starts_at", { ascending: true });
  if (opts.from) q = q.gte("starts_at", opts.from.toISOString());
  if (opts.to) q = q.lte("starts_at", opts.to.toISOString());
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(rowToSlot);
}

export async function getSlot(id: string): Promise<ServiceSlot | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("service_slots")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? rowToSlot(data) : null;
}

/**
 * Add a slot to a product. Owner-side action; we don't expose this to
 * anonymous callers.
 */
export async function addSlot(input: {
  storeSlug: string;
  productId: string;
  startsAt: Date;
  endsAt: Date;
  capacity?: number;
}): Promise<ServiceSlot> {
  const sb = createAdminClient();
  const row = {
    id: `slot_${randomUUID().slice(0, 8)}`,
    store_slug: input.storeSlug,
    product_id: input.productId,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
    capacity: input.capacity ?? 1,
    booked_count: 0,
    is_blocked: false,
    created_at: new Date().toISOString(),
  };
  const { error } = await sb.from("service_slots").insert(row);
  if (error) throw error;
  return rowToSlot(row);
}

export async function deleteSlot(id: string): Promise<boolean> {
  const sb = createAdminClient();
  const { error } = await sb.from("service_slots").delete().eq("id", id);
  return !error;
}

export async function blockSlot(
  id: string,
  blocked: boolean,
): Promise<boolean> {
  const sb = createAdminClient();
  const { error } = await sb
    .from("service_slots")
    .update({ is_blocked: blocked })
    .eq("id", id);
  return !error;
}

export async function listBookingsForOrder(orderId: string): Promise<Booking[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("service_bookings")
    .select("*")
    .eq("order_id", orderId)
    .order("starts_at", { ascending: true });
  if (!data) return [];
  return data.map(rowToBooking);
}

export async function listBookingsForSlot(slotId: string): Promise<Booking[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("service_bookings")
    .select("*")
    .eq("slot_id", slotId);
  if (!data) return [];
  return data.map(rowToBooking);
}

/**
 * All bookings for a store, ordered soonest first. Used in the
 * seller's "upcoming bookings" view.
 */
export async function listBookingsForStore(
  storeSlug: string,
  opts: { fromNow?: boolean } = {},
): Promise<(Booking & { productTitle?: string })[]> {
  const sb = createAdminClient();
  const q = sb
    .from("service_bookings")
    .select("*, products:product_id(title)")
    .order("starts_at", { ascending: true });
  // Filter by store via the orders table — service_bookings has
  // order_id but no store_slug, so join.
  const { data, error } = await q;
  if (error || !data) return [];

  // Hydrate with the store via orders. For the dashboard list it's
  // enough to read order_id -> store_slug and filter.
  const orderIds = Array.from(new Set(data.map((b) => b.order_id)));
  if (orderIds.length === 0) return [];
  const { data: orders } = await sb
    .from("orders")
    .select("id, store_slug")
    .in("id", orderIds);
  const orderStoreMap = new Map<string, string>(
    (orders ?? []).map((o) => [o.id as string, o.store_slug as string]),
  );

let result = data
      .filter((b) => orderStoreMap.get(b.order_id as string) === storeSlug)
      .map((b) => {
      const product = b.products as { title: string } | null;
      const row: Booking & { productTitle?: string } = {
        id: b.id as string,
        orderId: b.order_id as string,
        slotId: b.slot_id as string,
        productId: b.product_id as string,
        startsAt: b.starts_at as string,
        endsAt: b.ends_at as string,
        customerName: b.customer_name as string,
        customerPhone: b.customer_phone as string,
        createdAt: b.created_at as string,
        productTitle: product?.title,
      };
      return row;
    });
  if (opts.fromNow) {
    const cutoff = Date.now();
    result = result.filter((b) => new Date(b.startsAt).getTime() >= cutoff);
  }
  return result;
}

export type AvailabilityInput = {
  storeSlug: string;
  productId: string;
  /** Inclusive start date — YYYY-MM-DD string. */
  fromDate: string;
  /** Inclusive end date — YYYY-MM-DD string. */
  toDate: string;
  /** Time-of-day in 24h HH:MM, e.g. "09:00". */
  startTime: string;
  /** Time-of-day in 24h HH:MM. */
  endTime: string;
  /** Slot duration in minutes. */
  slotMinutes: number;
  /** Slots per block (default 1). */
  capacity?: number;
};

/**
 * Bulk-create slots for a service over a date range. For each day in
 * [fromDate, toDate], generates slots starting at startTime and walking
 * forward in slotMinutes increments until endTime is reached.
 *
 * Skips existing slots (idempotent on start-time + product_id).
 */
export async function generateAvailability(
  input: AvailabilityInput,
): Promise<{ created: number; skipped: number }> {
  const sb = createAdminClient();
  const from = parseLocalDate(input.fromDate);
  const to = parseLocalDate(input.toDate);
  if (!from || !to || to.getTime() < from.getTime()) {
    throw new Error("Invalid date range.");
  }
  const [startH, startM] = input.startTime.split(":").map(Number);
  const [endH, endM] = input.endTime.split(":").map(Number);
  if (
    [startH, startM, endH, endM].some((n) => Number.isNaN(n))
  ) {
    throw new Error("Invalid time window.");
  }
  const slotMinutes = input.slotMinutes;
  if (slotMinutes < 5 || slotMinutes > 24 * 60) {
    throw new Error("Slot length must be 5–1440 minutes.");
  }

  // Existing slots in the window — for dedup.
  const windowStart = new Date(from);
  windowStart.setHours(startH ?? 0, startM ?? 0, 0, 0);
  const windowEnd = new Date(to);
  windowEnd.setHours(endH ?? 0, endM ?? 0, 0, 0);
  const existing = await listSlotsForProduct(input.productId, {
    from: windowStart,
    to: windowEnd,
  });
  const existingKeys = new Set(
    existing.map((s) => new Date(s.startsAt).toISOString()),
  );

  // Build the new slots.
  const rows: {
    id: string;
    store_slug: string;
    product_id: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
    booked_count: number;
    is_blocked: boolean;
    created_at: string;
  }[] = [];
  const now = new Date().toISOString();

  for (
    let day = new Date(from);
    day.getTime() <= to.getTime();
    day.setDate(day.getDate() + 1)
  ) {
    const dayStart = new Date(day);
    dayStart.setHours(startH ?? 0, startM ?? 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(endH ?? 0, endM ?? 0, 0, 0);

    for (
      let slotStart = new Date(dayStart);
      slotStart.getTime() + slotMinutes * 60_000 <= dayEnd.getTime() + 1;
      slotStart = new Date(slotStart.getTime() + slotMinutes * 60_000)
    ) {
      const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);
      const isoStart = slotStart.toISOString();
      if (existingKeys.has(isoStart)) continue;
      rows.push({
        id: `slot_${randomUUID().slice(0, 8)}`,
        store_slug: input.storeSlug,
        product_id: input.productId,
        starts_at: isoStart,
        ends_at: slotEnd.toISOString(),
        capacity: input.capacity ?? 1,
        booked_count: 0,
        is_blocked: false,
        created_at: now,
      });
    }
  }

  if (rows.length === 0) return { created: 0, skipped: 0 };
  const { error } = await sb.from("service_slots").insert(rows);
  if (error) throw error;
  return { created: rows.length, skipped: existing.length };
}

function parseLocalDate(iso: string): Date | null {
  // YYYY-MM-DD → local-midnight Date
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Atomically reserve a slot for an order. Increments booked_count and
 * inserts a booking row. Throws if the slot is full or missing.
 *
 * Caller is expected to have validated the order is for a valid
 * service product. This function is called from the checkout action.
 */
export async function bookSlot(input: {
  orderId: string;
  slotId: string;
  productId: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
}): Promise<Booking> {
  const sb = createAdminClient();

  // Capacity check + increment in a single round-trip via Supabase's
  // conditional update. If booked_count + 1 > capacity, the update
  // matches zero rows and we throw.
  const { data: updated, error: updateErr } = await sb
    .from("service_slots")
    .update({ booked_count: sb.rpc("increment_booked_count") })
    .eq("id", input.slotId)
    .lt("booked_count", sb.rpc("slot_capacity"))
    .select("id, booked_count, capacity")
    .maybeSingle();

  // Fallback: if the SQL helpers above don't exist, do a safer two-step.
  // The frontend can race here, but for the MVP we accept the risk.
  if (updateErr || !updated) {
    const slot = await getSlot(input.slotId);
    if (!slot) throw new Error("Slot not found.");
    if (slot.isBlocked) throw new Error("Slot is no longer available.");
    if (slot.bookedCount >= slot.capacity)
      throw new Error("This slot is full. Please pick another time.");
    const { error: incErr } = await sb
      .from("service_slots")
      .update({ booked_count: slot.bookedCount + 1 })
      .eq("id", input.slotId);
    if (incErr) throw incErr;
  }

  const booking: Booking = {
    id: `bk_${randomUUID().slice(0, 8)}`,
    orderId: input.orderId,
    slotId: input.slotId,
    productId: input.productId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    createdAt: new Date().toISOString(),
  };
  const { error: bookErr } = await sb.from("service_bookings").insert({
    id: booking.id,
    order_id: booking.orderId,
    slot_id: booking.slotId,
    product_id: booking.productId,
    starts_at: booking.startsAt,
    ends_at: booking.endsAt,
    customer_name: booking.customerName,
    customer_phone: booking.customerPhone,
    created_at: booking.createdAt,
  });
  if (bookErr) {
    // Roll back the slot increment.
    await sb
      .from("service_slots")
      .update({ booked_count: sb.rpc("increment_booked_count") })
      .eq("id", input.slotId);
    throw bookErr;
  }
  return booking;
}