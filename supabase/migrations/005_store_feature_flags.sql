-- Add per-store feature flags for the new optional features.
-- Each flag lets the seller opt in to a feature without affecting other
-- stores. Stored as boolean on the stores row.

alter table stores
  add column if not exists custom_orders_enabled boolean not null default false,
  add column if not exists services_enabled boolean not null default false;