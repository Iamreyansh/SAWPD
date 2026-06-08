-- ============================================================
-- SAWPD — Initial schema
-- Run in Supabase SQL Editor or via `supabase db push`
-- ============================================================

-- ---------- enums ----------

create type order_status as enum (
  'awaiting_payment',
  'awaiting_verification',
  'verified',
  'shipped',
  'completed',
  'cancelled'
);

create type product_status as enum ('live', 'draft', 'scheduled', 'archived');

create type promo_status as enum ('active', 'paused');

create type promo_type as enum ('percent', 'fixed');

create type application_status as enum ('pending', 'approved', 'rejected');

create type plan_id as enum ('weekly', 'monthly');

create type return_status as enum ('pending', 'approved', 'rejected');

create type return_mode as enum ('any', 'defective_only');

create type niche as enum (
  'fashion', 'beauty', 'home', 'art', 'jewelry', 'other'
);

create type sales_cadence as enum ('daily', 'weekly', 'monthly');

-- ---------- sellers ----------

create table sellers (
  id          text primary key,          -- sel_<uuid8>
  email       text not null unique,
  password_hash text not null,
  created_at  timestamptz not null default now()
);

create index idx_sellers_email on sellers (email);

-- ---------- stores ----------

create table stores (
  slug                text primary key,
  seller_id           text not null references sellers(id) on delete cascade,
  name                text not null,
  owner_handle        text not null,
  whatsapp            text,
  hero_image          text not null default '',
  hero_kicker         text not null default '',
  hero_headline       jsonb not null default '[]'::jsonb,
  hero_sub            text not null default '',
  upi_id              text not null default '',
  notify_email        text not null default '',
  paused              boolean not null default false,
  paused_reason       text,
  onboarding_dismissed boolean not null default false,
  returns_enabled     boolean not null default false,
  returns_window_days integer not null default 7,
  returns_mode        return_mode not null default 'any',
  returns_policy_text text,
  plan                plan_id,
  trial_ends_at       timestamptz,
  created_at          timestamptz not null default now()
);

create index idx_stores_seller_id on stores (seller_id);

-- ---------- products ----------

create table products (
  id            text primary key,          -- p_<uuid8>
  store_slug    text not null references stores(slug) on delete cascade,
  slug          text not null,
  title         text not null,
  tagline       text not null default '',
  price         integer not null,          -- INR, integer paise-less
  alt_text      text not null default '',
  images        jsonb not null default '[]'::jsonb,
  stock_count   integer not null default 0,
  is_available  boolean not null default true,
  tags          jsonb,                     -- string array or null
  status        product_status not null default 'live',
  scheduled_for timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_products_store_slug on products (store_slug);
create index idx_products_status on products (status);

-- ---------- orders ----------

create table orders (
  id                  text primary key,    -- ord_<uuid8>
  store_slug          text not null references stores(slug) on delete cascade,
  created_at          timestamptz not null default now(),
  status              order_status not null default 'awaiting_payment',
  customer            jsonb not null,      -- { name, phone, email?, address }
  lines               jsonb not null,      -- OrderLine[]
  total               integer not null,
  subtotal            integer,
  promo_code          text,
  discount_amount     integer,
  screenshot_data_url text,
  payment_screenshot  jsonb,               -- { valid, mime, approxKb, reason? }
  resend_requested_at timestamptz,
  verified_at         timestamptz,
  shipped_at          timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  tracking_note       text,
  reviewer_note       text
);

create index idx_orders_store_slug on orders (store_slug);
create index idx_orders_status on orders (status);
create index idx_orders_created_at on orders (created_at desc);

-- ---------- promos ----------

create table promos (
  id               text primary key,       -- promo_<uuid8>
  store_slug       text not null references stores(slug) on delete cascade,
  code             text not null,
  description      text,
  type             promo_type not null,
  value            integer not null,
  min_order_amount integer,
  usage_limit      integer,
  usage_count      integer not null default 0,
  starts_at        timestamptz,
  expires_at       timestamptz,
  status           promo_status not null default 'active',
  created_at       timestamptz not null default now()
);

create unique index idx_promos_store_code on promos (store_slug, upper(code));

-- ---------- applications ----------

create table applications (
  id               text primary key,       -- app_<uuid8>
  full_name        text not null,
  instagram_handle text not null,
  email            text not null,
  phone            text not null,
  store_name       text not null,
  niche            niche not null,
  follower_count   integer not null,
  sales_cadence    sales_cadence not null,
  sales_count      integer not null,
  average_order_value integer not null,
  current_setup    text not null,
  website_url      text,
  top_products     text not null,
  referral_source  text not null,
  motivation       text not null,
  created_at       timestamptz not null default now(),
  status           application_status not null default 'pending',
  reviewed_at      timestamptz,
  reviewer_note    text,
  trial_ends_at    timestamptz,
  plan             plan_id,
  seller_id        text references sellers(id) on delete set null
);

create index idx_applications_status on applications (status);

-- ---------- returns ----------

create table returns (
  id             text primary key,         -- ret_<uuid8>
  store_slug     text not null references stores(slug) on delete cascade,
  order_id       text not null references orders(id) on delete cascade,
  product_id     text not null,
  product_title  text not null,
  qty            integer not null,
  amount_inr     integer not null,
  reason         text not null,
  customer_name  text not null,
  customer_phone text not null,
  status         return_status not null default 'pending',
  requested_at   timestamptz not null default now(),
  decided_at     timestamptz,
  decision_note  text,
  refund_amount  integer
);

create index idx_returns_store_slug on returns (store_slug);
create index idx_returns_order_id on returns (order_id);

-- ---------- billing ----------

create table billing (
  id         text primary key,            -- bill_<uuid8>
  store_slug text not null references stores(slug) on delete cascade,
  plan       plan_id not null,
  amount_inr integer not null,
  created_at timestamptz not null default now(),
  reference  text not null
);

create index idx_billing_store_slug on billing (store_slug);

-- ---------- subscribers ----------

create table subscribers (
  id         text primary key,            -- sub_<uuid8>
  email      text not null unique,
  created_at timestamptz not null default now(),
  source     text not null default 'marketing'
);

-- ---------- audit_log ----------

create table audit_log (
  id    text primary key,
  at    timestamptz not null default now(),
  event jsonb not null
);

create index idx_audit_log_at on audit_log (at desc);

-- ---------- storage bucket ----------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ---------- RLS policies ----------
-- Keep it simple: service_role bypasses RLS.
-- Public reads are allowed for storefronts.
-- Writes go through server actions (service_role).

alter table sellers enable row level security;
alter table stores enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table promos enable row level security;
alter table applications enable row level security;
alter table returns enable row level security;
alter table billing enable row level security;
alter table subscribers enable row level security;
alter table audit_log enable row level security;

-- Public can read stores (for storefronts + /shops directory)
create policy "Public read stores" on stores
  for select using (true);

-- Public can read live products
create policy "Public read live products" on products
  for select using (status = 'live');

-- Public can read active promos (for validation)
create policy "Public read active promos" on promos
  for select using (status = 'active');

-- Public can insert applications
create policy "Public insert applications" on applications
  for insert with check (true);

-- Public can insert subscribers
create policy "Public insert subscribers" on subscribers
  for insert with check (true);

-- Public can insert orders (checkout)
create policy "Public insert orders" on orders
  for insert with check (true);

-- Public can insert returns (track page)
create policy "Public insert returns" on returns
  for insert with check (true);

-- Public can update own returns (track page - set status to pending only)
create policy "Public update returns" on returns
  for update using (true)
  with check (status = 'pending');

-- Public can read stores for storefront display
create policy "Public read orders for tracking" on orders
  for select using (true);

-- Storage: public read for product images
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Storage: authenticated insert (server-side via service_role)
create policy "Service insert product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

-- Storage: authenticated delete (server-side via service_role)
create policy "Service delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images');
