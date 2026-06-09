#!/usr/bin/env node
/**
 * Seed demo data for SAWPD via Supabase.
 * Run: node scripts/seed-demo.mjs
 *
 * Creates:
 *   - 3 sellers (Riya, Kabir, Ananya)
 *   - 3 stores (Riya = fashion, Kabir = home decor, Ananya = jewelry)
 *   - Products under each store
 *   - Sample orders, promos, applications
 */

import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function id(prefix) {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36).slice(-4);
  return `${prefix}_${rand}${ts}`;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}
function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000).toISOString();
}

const hash = bcryptjs.hashSync("demo1234", 10);

// ── Sellers ─────────────────────────────────────────────────────────────────
const sellers = [
  { id: "sel_riya0001", email: "riya@demo.sawpd", password_hash: hash, created_at: daysAgo(30) },
  { id: "sel_kabir0001", email: "kabir@demo.sawpd", password_hash: hash, created_at: daysAgo(20) },
  { id: "sel_ananya001", email: "ananya@demo.sawpd", password_hash: hash, created_at: daysAgo(15) },
];

// ── Stores ──────────────────────────────────────────────────────────────────
const stores = [
  {
    slug: "riya",
    seller_id: "sel_riya0001",
    name: "Riya's Closet",
    owner_handle: "riya.style",
    hero_image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80&auto=format&fit=crop",
    hero_kicker: "fashion",
    hero_headline: ["Handpicked.", "Wardrobe Essentials."],
    hero_sub: "Curated fashion for the modern woman. Every piece tells a story.",
    upi_id: "riya-upi@okicici",
    notify_email: "riya@demo.sawpd",
    whatsapp: "9876543210",
    paused: false,
    onboarding_dismissed: true,
    returns_enabled: true,
    returns_window_days: 7,
    returns_mode: "any",
    returns_policy_text: "Returns accepted within 7 days of delivery. Item must be unworn with tags.",
    plan: "monthly",
    trial_ends_at: daysFromNow(20),
  },
  {
    slug: "kabir",
    seller_id: "sel_kabir0001",
    name: "Earthen by Kabir",
    owner_handle: "kabir.creates",
    hero_image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1600&q=80&auto=format&fit=crop",
    hero_kicker: "home decor",
    hero_headline: ["Handcrafted.", "For Your Home."],
    hero_sub: "Ethically sourced home decor. Made by artisans, not factories.",
    upi_id: "kabir-upi@ybl",
    notify_email: "kabir@demo.sawpd",
    whatsapp: "9123456789",
    paused: false,
    onboarding_dismissed: false,
    returns_enabled: false,
    returns_window_days: 7,
    returns_mode: "any",
    returns_policy_text: null,
    plan: null,
    trial_ends_at: daysFromNow(5),
  },
  {
    slug: "ananya",
    seller_id: "sel_ananya001",
    name: "Ananya Adorns",
    owner_handle: "ananya.jewels",
    hero_image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1600&q=80&auto=format&fit=crop",
    hero_kicker: "jewelry",
    hero_headline: ["Timeless.", "Handmade Jewelry."],
    hero_sub: "Artisan-crafted jewelry. Brass, silver, and gemstones. Made in Jaipur.",
    upi_id: "ananya-upi@oksbi",
    notify_email: "ananya@demo.sawpd",
    whatsapp: "9988776655",
    paused: false,
    onboarding_dismissed: true,
    returns_enabled: true,
    returns_window_days: 14,
    returns_mode: "defective_only",
    returns_policy_text: "Returns accepted within 14 days for defective items only.",
    plan: "monthly",
    trial_ends_at: daysFromNow(25),
  },
];

// ── Products ────────────────────────────────────────────────────────────────
const products = [
  // Riya's products (fashion)
  { id: "p-01", store_slug: "riya", slug: "pleated-trouser", title: "Pleated Trouser", tagline: "Relaxed fit, structured pleats.", price: 2299, alt_text: "Beige pleated trousers", images: [{ id: "img-01a", url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80&auto=format&fit=crop" }], stock_count: 12, is_available: true, tags: ["new"], status: "live" },
  { id: "p-02", store_slug: "riya", slug: "linen-shirt", title: "Linen Shirt", tagline: "Breathable linen. Perfect for summers.", price: 1899, alt_text: "White linen shirt", images: [{ id: "img-02a", url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80&auto=format&fit=crop" }], stock_count: 8, is_available: true, tags: ["new"], status: "live" },
  { id: "p-03", store_slug: "riya", slug: "silk-scarf", title: "Silk Scarf", tagline: "Hand-finished edges. A pop of color.", price: 899, alt_text: "Colorful silk scarf", images: [{ id: "img-03a", url: "https://images.unsplash.com/photo-1601924994987-69e26d50dc64?w=800&q=80&auto=format&fit=crop" }], stock_count: 3, is_available: true, tags: ["limited"], status: "live" },
  { id: "p-04", store_slug: "riya", slug: "crop-top", title: "Crop Top", tagline: "Minimal. Goes-with-everything basic.", price: 799, alt_text: "White crop top", images: [{ id: "img-04a", url: "https://images.unsplash.com/photo-1583846783214-7229a91b20ed?w=800&q=80&auto=format&fit=crop" }], stock_count: 15, is_available: true, tags: ["sale"], status: "live" },
  { id: "p-05", store_slug: "riya", slug: "cargo-pants", title: "Utility Cargo Pants", tagline: "Street-ready. Six pockets.", price: 2499, alt_text: "Olive cargo pants", images: [{ id: "img-05a", url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80&auto=format&fit=crop" }], stock_count: 6, is_available: true, tags: ["new"], status: "live" },
  { id: "p-06", store_slug: "riya", slug: "canvas-tote", title: "Canvas Tote", tagline: "Heavy-duty canvas. Minimal branding.", price: 699, alt_text: "Natural canvas tote bag", images: [{ id: "img-06a", url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80&auto=format&fit=crop" }], stock_count: 20, is_available: true, tags: [], status: "live" },
  { id: "p-07", store_slug: "riya", slug: "knit-cardigan", title: "Knit Cardigan", tagline: "Chunky knit. Cozy without the bulk.", price: 1999, alt_text: "Oversized knit cardigan", images: [{ id: "img-07a", url: "https://images.unsplash.com/photo-1434389677669-e08b4cda3a28?w=800&q=80&auto=format&fit=crop" }], stock_count: 4, is_available: true, tags: ["limited"], status: "live" },
  { id: "p-08", store_slug: "riya", slug: "denim-jacket", title: "Denim Jacket", tagline: "Classic cut. Broken-in feel.", price: 2799, alt_text: "Washed denim jacket", images: [{ id: "img-08a", url: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80&auto=format&fit=crop" }], stock_count: 0, is_available: false, tags: ["sold-out"], status: "live" },

  // Kabir's products (home decor)
  { id: "p-09", store_slug: "kabir", slug: "terracotta-vase", title: "Terracotta Vase", tagline: "Hand-thrown. Each one is unique.", price: 1299, alt_text: "Terracotta vase", images: [{ id: "img-09a", url: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&q=80&auto=format&fit=crop" }], stock_count: 5, is_available: true, tags: ["new"], status: "live" },
  { id: "p-10", store_slug: "kabir", slug: "woven-basket", title: "Woven Storage Basket", tagline: "Seagrass. Handwoven by artisans.", price: 899, alt_text: "Woven seagrass basket", images: [{ id: "img-10a", url: "https://images.unsplash.com/photo-1631125915902-d8abe32c5c3e?w=800&q=80&auto=format&fit=crop" }], stock_count: 8, is_available: true, tags: [], status: "live" },
  { id: "p-11", store_slug: "kabir", slug: "brass-lamp", title: "Brass Table Lamp", tagline: "Warm brass glow. Handmade in Moradabad.", price: 2199, alt_text: "Brass table lamp", images: [{ id: "img-11a", url: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800&q=80&auto=format&fit=crop" }], stock_count: 3, is_available: true, tags: ["new"], status: "live" },

  // Ananya's products (jewelry)
  { id: "p-12", store_slug: "ananya", slug: "brass-jhumkas", title: "Brass Jhumkas", tagline: "Traditional design. Lightweight.", price: 1499, alt_text: "Brass jhumka earrings", images: [{ id: "img-12a", url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80&auto=format&fit=crop" }], stock_count: 10, is_available: true, tags: ["new"], status: "live" },
  { id: "p-13", store_slug: "ananya", slug: "pearl-set", title: "Pearl Necklace Set", tagline: "Freshwater pearls. Sterling silver.", price: 3299, alt_text: "Pearl necklace set", images: [{ id: "img-13a", url: "https://images.unsplash.com/photo-1515562141589-67f0d89d5432?w=800&q=80&auto=format&fit=crop" }], stock_count: 5, is_available: true, tags: ["limited"], status: "live" },
  { id: "p-14", store_slug: "ananya", slug: "silver-ring", title: "Oxidized Silver Ring", tagline: "Minimal band. Everyday wear.", price: 899, alt_text: "Silver ring", images: [{ id: "img-14a", url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80&auto=format&fit=crop" }], stock_count: 15, is_available: true, tags: [], status: "live" },
  { id: "p-15", store_slug: "ananya", slug: "kundan-anklet", title: "Kundan Anklet", tagline: "Jaipur craftsmanship. Gold-plated.", price: 1799, alt_text: "Kundan anklet", images: [{ id: "img-15a", url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80&auto=format&fit=crop" }], stock_count: 7, is_available: true, tags: ["new"], status: "live" },
];

// ── Applications ────────────────────────────────────────────────────────────
const applications = [
  { id: "app_riya001", full_name: "Riya Singh", instagram_handle: "riya.style", email: "riya@demo.sawpd", phone: "9876543210", store_name: "Riya's Closet", niche: "fashion", follower_count: 4200, sales_cadence: "weekly", sales_count: 85, average_order_value: 1500, current_setup: "WhatsApp catalog + Instagram DMs.", website_url: null, top_products: "1. Pleated Trouser ₹2299 · 2. Linen Shirt ₹1899", referral_source: "Instagram", motivation: "I lose orders to DM confusion.", created_at: daysAgo(30), status: "approved", seller_id: "sel_riya0001", reviewed_at: daysAgo(29), reviewer_note: "Strong sales history.", trial_ends_at: daysFromNow(20), plan: "monthly" },
  { id: "app_kabir001", full_name: "Kabir Mehra", instagram_handle: "kabir.creates", email: "kabir@demo.sawpd", phone: "9123456789", store_name: "Earthen by Kabir", niche: "home", follower_count: 1800, sales_cadence: "monthly", sales_count: 22, average_order_value: 1100, current_setup: "Instagram posts only.", website_url: null, top_products: "1. Terracotta Vase ₹1299 · 2. Woven Basket ₹899", referral_source: "Friend", motivation: "Need a proper storefront.", created_at: daysAgo(20), status: "approved", seller_id: "sel_kabir0001", reviewed_at: daysAgo(19), reviewer_note: "Unique niche.", trial_ends_at: daysFromNow(5), plan: null },
  { id: "app_ananya01", full_name: "Ananya Sharma", instagram_handle: "ananya.jewels", email: "ananya@demo.sawpd", phone: "9988776655", store_name: "Ananya Adorns", niche: "jewelry", follower_count: 3500, sales_cadence: "weekly", sales_count: 40, average_order_value: 1800, current_setup: "Instagram DMs and WhatsApp catalog.", website_url: null, top_products: "1. Brass Jhumkas ₹1499 · 2. Pearl Set ₹3299", referral_source: "Instagram reel", motivation: "DMs are exhausting. I need a real shop link.", created_at: daysAgo(15), status: "approved", seller_id: "sel_ananya001", reviewed_at: daysAgo(14), reviewer_note: "Great niche and content.", trial_ends_at: daysFromNow(25), plan: "monthly" },
];

// ── Seed ────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("🌱 Seeding SAWPD demo data into Supabase...\n");

  // Sellers
  const { error: sellersErr } = await sb.from("sellers").upsert(sellers, { onConflict: "id" });
  if (sellersErr) console.error("  ✗ sellers:", sellersErr.message);
  else console.log(`  ✓ sellers (${sellers.length})`);

  // Stores
  const { error: storesErr } = await sb.from("stores").upsert(stores, { onConflict: "slug" });
  if (storesErr) console.error("  ✗ stores:", storesErr.message);
  else console.log(`  ✓ stores (${stores.length})`);

  // Products
  const { error: productsErr } = await sb.from("products").upsert(products, { onConflict: "id" });
  if (productsErr) console.error("  ✗ products:", productsErr.message);
  else console.log(`  ✓ products (${products.length})`);

  // Applications
  const { error: appsErr } = await sb.from("applications").upsert(applications, { onConflict: "id" });
  if (appsErr) console.error("  ✗ applications:", appsErr.message);
  else console.log(`  ✓ applications (${applications.length})`);

  console.log("\n🎉 Done!\n");
  console.log("Login credentials:");
  console.log("  Seller (Riya):    riya@demo.sawpd / demo1234");
  console.log("  Seller (Kabir):   kabir@demo.sawpd / demo1234");
  console.log("  Seller (Ananya):  ananya@demo.sawpd / demo1234");
  console.log("  Admin:            demo-admin-password-change-me");
  console.log("\nStorefronts:");
  console.log("  /s/riya    — 8 products, fashion, paid plan");
  console.log("  /s/kabir   — 3 products, home decor, trial");
  console.log("  /s/ananya  — 4 products, jewelry, paid plan");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
