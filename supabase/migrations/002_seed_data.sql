-- ============================================================
-- SAWPD — Seed data from existing JSON files
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ---------- sellers ----------
-- Password: "password123" (bcrypt hash, 10 rounds)
-- Replace with your actual sellers.json data

insert into sellers (id, email, password_hash, created_at) values
  ('sel_demo0001', 'demo@sawpd.com', '$2a$10$placeholder', now())
on conflict (id) do nothing;

-- ---------- stores ----------
-- Replace with your actual store.json data

insert into stores (slug, seller_id, name, owner_handle, whatsapp, hero_image, hero_kicker, hero_headline, hero_sub, upi_id, notify_email, paused, onboarding_dismissed, returns_enabled, returns_window_days, returns_mode, plan, trial_ends_at, created_at) values
  ('demo', 'sel_demo0001', 'Demo Store', 'demo', null, '', 'Welcome', '["Your store name here"]', 'Curated finds for you', 'demo@upi', 'demo@example.com', false, false, false, 7, 'any', null, null, now())
on conflict (slug) do nothing;

-- ---------- products ----------
-- Replace with your actual products.json data

-- ---------- orders ----------
-- Replace with your actual orders.json data

-- ---------- promos ----------
-- Replace with your actual promos.json data

-- ---------- applications ----------
-- Replace with your actual applications.json data

-- NOTE: For production migration, write a Node.js script that reads
-- each JSON file and batch-inserts via the Supabase JS client.
-- See: https://supabase.com/docs/guides/database/using-rpc#batch-operations
