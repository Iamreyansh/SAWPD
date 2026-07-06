-- Payment OTPs (tuktuk-style phone verification at checkout)
-- Stores one-time codes keyed by phone. 5-minute TTL, 3-attempt cap.

create table payment_otps (
  id          text primary key,
  phone       text not null,
  code        text not null,
  attempts    integer not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_payment_otps_phone_created on payment_otps (phone, created_at desc);
create index idx_payment_otps_expires on payment_otps (expires_at);

-- Service role full access (we don't expose this to anon)
alter table payment_otps enable row level security;

create policy "Service role full access on payment_otps"
  on payment_otps for all
  using (true);