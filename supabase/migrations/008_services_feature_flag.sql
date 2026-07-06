-- Per-store services feature flag (matches the custom_orders_enabled
-- pattern from migration 005). Idempotent.

alter table stores
  add column if not exists services_enabled boolean not null default false;