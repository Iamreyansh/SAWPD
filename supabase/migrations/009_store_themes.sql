-- Per-store theme selection. Sellers pick from a preset gallery
-- (Editorial / Minimal / Bold / Craft) defined in src/lib/themes.ts.
-- themeOverrides is an optional JSON blob for per-store color/font
-- customisation on top of the preset.

alter table stores
  add column if not exists theme_id text not null default 'editorial',
  add column if not exists theme_overrides jsonb not null default '{}'::jsonb;

create index idx_stores_theme on stores (theme_id);