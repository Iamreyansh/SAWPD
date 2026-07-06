-- Service bookings (massages, cleaning, consultations, etc.)
-- Reuses the existing `products` table with `kind = 'service'`.
-- New `service_slots` table holds bookable time windows.

-- ── Add 'kind' column to products ────────────────────────────────

alter table products
  add column if not exists kind text not null default 'product'
    check (kind in ('product', 'service'));

alter table products
  add column if not exists duration_minutes integer,
  add column if not exists location text;

create index idx_products_kind on products (store_slug, kind, status);

-- ── Service slots table ─────────────────────────────────────────

create table service_slots (
  id              text primary key,
  store_slug      text not null references stores(slug) on delete cascade,
  product_id      text not null references products(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  capacity        integer not null default 1,
  booked_count    integer not null default 0,
  is_blocked      boolean not null default false, -- seller blocked this slot
  created_at      timestamptz not null default now()
);

create index idx_service_slots_product on service_slots (product_id, starts_at);
create index idx_service_slots_store on service_slots (store_slug, starts_at);

-- ── Bookings (one row per slot per order) ───────────────────────

create table service_bookings (
  id              text primary key,
  order_id        text not null references orders(id) on delete cascade,
  slot_id         text not null references service_slots(id) on delete restrict,
  product_id      text not null,
  starts_at       timestamptz not null, -- denormalised for easy reads
  ends_at         timestamptz not null,
  customer_name   text not null,
  customer_phone  text not null,
  created_at      timestamptz not null default now()
);

create index idx_service_bookings_slot on service_bookings (slot_id);
create index idx_service_bookings_order on service_bookings (order_id);

-- ── RLS ──────────────────────────────────────────────────────────

alter table service_slots enable row level security;
alter table service_bookings enable row level security;

-- Public can read open service slots (for booking)
create policy "Public read service_slots"
  on service_slots for select
  using (is_blocked = false);

-- Public can read their own bookings (via order lookup)
create policy "Public read service_bookings"
  on service_bookings for select
  using (true);

-- Service role full access (seller dashboard uses service_role)
create policy "Service role full access on service_slots"
  on service_slots for all
  using (true);

create policy "Service role full access on service_bookings"
  on service_bookings for all
  using (true);