#!/usr/bin/env node
/**
 * Seed demo data for SAWPD.
 * Run: node scripts/seed-demo.mjs
 *
 * Creates:
 *   - 2 sellers (Riya + Kabir)
 *   - 2 stores (Riya = paid monthly, Kabir = free trial)
 *   - 8 products under Riya (fashion), 2 under Kabir (home decor)
 *   - 3 promo codes under Riya
 *   - 6 orders under Riya (varied statuses)
 *   - 4 applications (3 approved + 1 pending)
 *   - 1 billing record for Riya
 *   - 2 subscribers
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcryptjs from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "data");

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
function hoursAgo(n) {
  return new Date(Date.now() - n * 3600000).toISOString();
}

// ── Sellers ─────────────────────────────────────────────────────────────────
const SELLER_RIYA = {
  id: "sel_riya0001",
  email: "riya@demo.sawpd",
  passwordHash: bcryptjs.hashSync("demo1234", 10),
  createdAt: daysAgo(30),
};

const SELLER_KABIR = {
  id: "sel_kabir0001",
  email: "kabir@demo.sawpd",
  passwordHash: bcryptjs.hashSync("demo1234", 10),
  createdAt: daysAgo(20),
};

// ── Stores ──────────────────────────────────────────────────────────────────
const STORE_RIYA = {
  slug: "riya",
  name: "Riya's Closet",
  ownerHandle: "riya.style",
  heroImage:
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80&auto=format&fit=crop",
  heroKicker: "fashion",
  heroHeadline: ["Handpicked.", "Wardrobe Essentials."],
  heroSub: "Curated fashion for the modern woman. Every piece tells a story.",
  upiId: "riya-upi@okicici",
  notifyEmail: "riya@demo.sawpd",
  whatsapp: "9876543210",
  slug: "riya",
  sellerId: "sel_riya0001",
  plan: "monthly",
  trialEndsAt: daysFromNow(20),
  onboardingDismissed: true,
  returnsPolicy: {
    enabled: true,
    windowDays: 7,
    mode: "any",
    policyText:
      "Returns accepted within 7 days of delivery. Item must be unworn with tags.",
  },
};

const STORE_KABIR = {
  slug: "kabir",
  name: "Earthen by Kabir",
  ownerHandle: "kabir.creates",
  heroImage:
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1600&q=80&auto=format&fit=crop",
  heroKicker: "home decor",
  heroHeadline: ["Handcrafted.", "For Your Home."],
  heroSub: "Ethically sourced home decor. Made by artisans, not factories.",
  upiId: "kabir-upi@ybl",
  notifyEmail: "kabir@demo.sawpd",
  whatsapp: "9123456789",
  sellerId: "sel_kabir0001",
  onboardingDismissed: false,
  returnsPolicy: {
    enabled: false,
    windowDays: 7,
    mode: "any",
  },
};

// ── Products ────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // Riya's products (fashion)
  {
    id: "p-01",
    slug: "pleated-trouser",
    title: "Pleated Trouser",
    tagline: "Relaxed fit, structured pleats. Effortless style.",
    price: 2299,
    altText: "Beige pleated trousers on a model",
    images: [
      {
        id: "img-01a",
        url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 12,
    isAvailable: true,
    tags: ["new"],
    status: "live",
  },
  {
    id: "p-02",
    slug: "linen-shirt",
    title: "Linen Shirt",
    tagline: "Breathable linen. Perfect for Mumbai summers.",
    price: 1899,
    altText: "White linen shirt hanging on a rack",
    images: [
      {
        id: "img-02a",
        url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 8,
    isAvailable: true,
    tags: ["new"],
    status: "live",
  },
  {
    id: "p-03",
    slug: "silk-scarf",
    title: "Silk Scarf",
    tagline: "Hand-finished edges. A pop of color.",
    price: 899,
    altText: "Colorful silk scarf draped on a chair",
    images: [
      {
        id: "img-03a",
        url: "https://images.unsplash.com/photo-1601924994987-69e26d50dc64?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 3,
    isAvailable: true,
    tags: ["limited"],
    status: "live",
  },
  {
    id: "p-04",
    slug: "crop-top",
    title: "Crop Top",
    tagline: "Minimal. Goes-with-everything basic.",
    price: 799,
    altText: "White crop top on a hanger",
    images: [
      {
        id: "img-04a",
        url: "https://images.unsplash.com/photo-1583846783214-7229a91b20ed?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 15,
    isAvailable: true,
    tags: ["sale"],
    status: "live",
  },
  {
    id: "p-05",
    slug: "cargo-pants",
    title: "Utility Cargo Pants",
    tagline: "Street-ready. Six pockets. Relaxed taper.",
    price: 2499,
    altText: "Olive cargo pants styled on a model",
    images: [
      {
        id: "img-05a",
        url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 6,
    isAvailable: true,
    tags: ["new"],
    status: "live",
  },
  {
    id: "p-06",
    slug: "canvas-tote",
    title: "Canvas Tote",
    tagline: "Heavy-duty canvas. Minimal branding.",
    price: 699,
    altText: "Natural canvas tote bag",
    images: [
      {
        id: "img-06a",
        url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 20,
    isAvailable: true,
    tags: [],
    status: "live",
  },
  {
    id: "p-07",
    slug: "knit-cardigan",
    title: "Knit Cardigan",
    tagline: "Chunky knit. Cozy without the bulk.",
    price: 1999,
    altText: "Oversized knit cardigan on a model",
    images: [
      {
        id: "img-07a",
        url: "https://images.unsplash.com/photo-1434389677669-e08b4cda3a28?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 4,
    isAvailable: true,
    tags: ["limited"],
    status: "live",
  },
  {
    id: "p-08",
    slug: "denim-jacket",
    title: "Denim Jacket",
    tagline: "Classic cut. Broken-in feel from day one.",
    price: 2799,
    altText: "Washed denim jacket",
    images: [
      {
        id: "img-08a",
        url: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 0,
    isAvailable: false,
    tags: ["sold-out"],
    status: "live",
  },
  // Kabir's products (home decor)
  {
    id: "p-09",
    slug: "terracotta-vase",
    title: "Terracotta Vase",
    tagline: "Hand-thrown. Each one is unique.",
    price: 1299,
    altText: "Terracotta vase with dried flowers",
    images: [
      {
        id: "img-09a",
        url: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 5,
    isAvailable: true,
    tags: ["new"],
    status: "live",
  },
  {
    id: "p-10",
    slug: "woven-basket",
    title: "Woven Storage Basket",
    tagline: "Seagrass. Handwoven by artisans in Rajasthan.",
    price: 899,
    altText: "Woven seagrass basket",
    images: [
      {
        id: "img-10a",
        url: "https://images.unsplash.com/photo-1631125915902-d8abe32c5c3e?w=800&q=80&auto=format&fit=crop",
      },
    ],
    stockCount: 8,
    isAvailable: true,
    tags: [],
    status: "live",
  },
];

// ── Orders ──────────────────────────────────────────────────────────────────
const ORDERS = [
  {
    id: "ord_001",
    storeSlug: "riya",
    createdAt: daysAgo(5),
    status: "completed",
    customer: {
      name: "Priya Sharma",
      phone: "9876543211",
      email: "priya@example.com",
      address: "42 Marine Drive, Mumbai 400001",
    },
    lines: [
      {
        productId: "p-01",
        title: "Pleated Trouser",
        price: 2299,
        qty: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&q=60",
      },
      {
        productId: "p-06",
        title: "Canvas Tote",
        price: 699,
        qty: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1544816155-12df9643f363?w=200&q=60",
      },
    ],
    total: 2998,
    screenshotDataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    paymentScreenshot: {
      valid: true,
      mime: "image/png",
      approxKb: 1,
    },
    verifiedAt: daysAgo(4),
    shippedAt: daysAgo(3),
    completedAt: daysAgo(2),
    trackingNote: "DTDC — tracking #DT123456789",
  },
  {
    id: "ord_002",
    storeSlug: "riya",
    createdAt: daysAgo(3),
    status: "verified",
    customer: {
      name: "Ananya Patel",
      phone: "9123456780",
      email: "ananya@example.com",
      address: "15 MG Road, Bangalore 560001",
    },
    lines: [
      {
        productId: "p-02",
        title: "Linen Shirt",
        price: 1899,
        qty: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&q=60",
      },
    ],
    total: 3798,
    screenshotDataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    paymentScreenshot: {
      valid: true,
      mime: "image/png",
      approxKb: 1,
    },
    verifiedAt: daysAgo(2),
  },
  {
    id: "ord_003",
    storeSlug: "riya",
    createdAt: daysAgo(2),
    status: "awaiting_verification",
    customer: {
      name: "Neha Gupta",
      phone: "9988776655",
      email: "neha@example.com",
      address: "7 Anna Salai, Chennai 600002",
    },
    lines: [
      {
        productId: "p-03",
        title: "Silk Scarf",
        price: 899,
        qty: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1601924994987-69e26d50dc64?w=200&q=60",
      },
      {
        productId: "p-04",
        title: "Crop Top",
        price: 799,
        qty: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1583846783214-7229a91b20ed?w=200&q=60",
      },
    ],
    total: 2497,
    screenshotDataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    paymentScreenshot: {
      valid: true,
      mime: "image/png",
      approxKb: 1,
    },
  },
  {
    id: "ord_004",
    storeSlug: "riya",
    createdAt: hoursAgo(6),
    status: "awaiting_payment",
    customer: {
      name: "Kavya Reddy",
      phone: "9871234567",
      email: "kavya@example.com",
      address: "22 Jubilee Hills, Hyderabad 500033",
    },
    lines: [
      {
        productId: "p-05",
        title: "Utility Cargo Pants",
        price: 2499,
        qty: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=200&q=60",
      },
    ],
    total: 2499,
  },
  {
    id: "ord_005",
    storeSlug: "riya",
    createdAt: daysAgo(1),
    status: "shipped",
    customer: {
      name: "Meera Joshi",
      phone: "9812345678",
      address: "8 Koregaon Park, Pune 411001",
    },
    lines: [
      {
        productId: "p-07",
        title: "Knit Cardigan",
        price: 1999,
        qty: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1434389677669-e08b4cda3a28?w=200&q=60",
      },
    ],
    total: 1999,
    screenshotDataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    paymentScreenshot: {
      valid: true,
      mime: "image/png",
      approxKb: 1,
    },
    verifiedAt: daysAgo(1),
    shippedAt: hoursAgo(18),
    trackingNote: "BlueDart — tracking #BD987654321",
  },
  {
    id: "ord_006",
    storeSlug: "riya",
    createdAt: daysAgo(7),
    status: "cancelled",
    customer: {
      name: "Rahul Verma",
      phone: "9001234567",
      address: "33 Sector 62, Noida 201301",
    },
    lines: [
      {
        productId: "p-08",
        title: "Denim Jacket",
        price: 2799,
        qty: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=200&q=60",
      },
    ],
    total: 2799,
    cancelledAt: daysAgo(6),
    reviewerNote: "Customer requested cancellation before shipping.",
  },
];

// ── Promo Codes ─────────────────────────────────────────────────────────────
const PROMOS = [
  {
    id: "promo_001",
    storeSlug: "riya",
    code: "WELCOME10",
    description: "10% off your first order",
    type: "percent",
    value: 10,
    minOrderAmount: 500,
    usageLimit: 100,
    usageCount: 12,
    status: "active",
    createdAt: daysAgo(30),
  },
  {
    id: "promo_002",
    storeSlug: "riya",
    code: "FLAT500",
    description: "₹500 off orders above ₹2000",
    type: "fixed",
    value: 500,
    minOrderAmount: 2000,
    usageLimit: 50,
    usageCount: 3,
    status: "active",
    createdAt: daysAgo(15),
  },
  {
    id: "promo_003",
    storeSlug: "riya",
    code: "OLDSCHOOL",
    description: "Old loyalty code — paused",
    type: "percent",
    value: 20,
    usageLimit: 20,
    usageCount: 20,
    expiresAt: daysAgo(5),
    status: "paused",
    createdAt: daysAgo(60),
  },
];

// ── Applications ────────────────────────────────────────────────────────────
const APPLICATIONS = [
  {
    fullName: "Riya Singh",
    instagramHandle: "riya.style",
    email: "riya@demo.sawpd",
    phone: "9876543210",
    storeName: "Riya's Closet",
    niche: "fashion",
    followerCount: 4200,
    salesCadence: "weekly",
    salesCount: 85,
    averageOrderValue: 1500,
    currentSetup: "WhatsApp catalog + Instagram DMs. Shipping via Delhivery.",
    websiteUrl: "",
    topProducts:
      "1. Pleated Trouser ₹2299 · 2. Linen Shirt ₹1899 · 3. Silk Scarf ₹899",
    referralSource: "Instagram reel by a fellow creator",
    motivation:
      "I lose 3-4 orders a week to DM confusion. A clean checkout link would solve everything.",
    id: "app_riya001",
    createdAt: daysAgo(30),
    status: "approved",
    sellerId: "sel_riya0001",
    reviewedAt: daysAgo(29),
    reviewerNote: "Strong sales history. Approved.",
    trialEndsAt: daysFromNow(20),
    plan: "monthly",
  },
  {
    fullName: "Kabir Mehra",
    instagramHandle: "kabir.creates",
    email: "kabir@demo.sawpd",
    phone: "9123456789",
    storeName: "Earthen by Kabir",
    niche: "home",
    followerCount: 1800,
    salesCadence: "monthly",
    salesCount: 22,
    averageOrderValue: 1100,
    currentSetup: "Only Instagram posts. No checkout system.",
    websiteUrl: "",
    topProducts:
      "1. Terracotta Vase ₹1299 · 2. Woven Basket ₹899",
    referralSource: "Friend told me about SAWPD",
    motivation:
      "I make home decor but selling through DMs is painful. Need a proper storefront.",
    id: "app_kabir001",
    createdAt: daysAgo(20),
    status: "approved",
    sellerId: "sel_kabir0001",
    reviewedAt: daysAgo(19),
    reviewerNote: "Unique niche. Approved for trial.",
    trialEndsAt: daysFromNow(5),
  },
  {
    fullName: "Tanya Agarwal",
    instagramHandle: "tanya.designs",
    email: "tanya@example.com",
    phone: "9988776654",
    storeName: "Tanya Designs",
    niche: "jewelry",
    followerCount: 850,
    salesCadence: "monthly",
    salesCount: 10,
    averageOrderValue: 2200,
    currentSetup: "Just starting out. Instagram + a Google Form.",
    websiteUrl: "",
    topProducts: "1. Brass Jhumkas ₹1499 · 2. Pearl Set ₹2299",
    referralSource: "Google search",
    motivation: "I need a professional storefront to look legit to customers.",
    id: "app_tanya001",
    createdAt: daysAgo(3),
    status: "pending",
  },
  {
    fullName: "Arjun Nair",
    instagramHandle: "arjun prints",
    email: "arjun@example.com",
    phone: "9112233445",
    storeName: "Print Studio",
    niche: "art",
    followerCount: 3200,
    salesCadence: "weekly",
    salesCount: 45,
    averageOrderValue: 800,
    currentSetup: "Etsy shop + Instagram. Want to reduce Etsy fees.",
    websiteUrl: "https://etsy.com/shop/arjunprints",
    topProducts: "1. Botanical Print ₹699 · 2. Cityscape ₹899",
    referralSource: "Creator friend",
    motivation:
      "Etsy takes 6.5% + payment fees. SAWPD's flat subscription is way better.",
    id: "app_arjun001",
    createdAt: daysAgo(10),
    status: "rejected",
    reviewedAt: daysAgo(8),
    reviewerNote: "Already has Etsy. Not the right fit.",
  },
];

// ── Billing ─────────────────────────────────────────────────────────────────
const BILLING = [
  {
    id: "bill_riya001",
    storeSlug: "riya",
    plan: "monthly",
    amountInr: 1499,
    createdAt: daysAgo(29),
    reference: "EA-DEMO-RIYA-MONTHLY",
  },
];

// ── Subscribers ─────────────────────────────────────────────────────────────
const SUBSCRIBERS = [
  { email: "fan1@example.com", createdAt: daysAgo(12) },
  { email: "fan2@example.com", createdAt: daysAgo(5) },
];

// ── Write files ─────────────────────────────────────────────────────────────
function writeJson(filename, data) {
  const p = path.join(DATA, filename);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
  console.log(`  ✓ ${filename} (${Array.isArray(data) ? data.length : Object.keys(data).length} entries)`);
}

console.log("🌱 Seeding SAWPD demo data...\n");

writeJson("sellers.json", [SELLER_RIYA, SELLER_KABIR]);
writeJson("store.json", { riya: STORE_RIYA, kabir: STORE_KABIR });

// Products & promos are keyed by store slug in the data layer
const productsByStore = {};
for (const p of PRODUCTS) {
  const slug = p.id.startsWith("p-0") && parseInt(p.id.slice(2)) <= 8 ? "riya" : "kabir";
  (productsByStore[slug] ??= []).push(p);
}
writeJson("products.json", productsByStore);

writeJson("orders.json", ORDERS);

const promosByStore = {};
for (const p of PROMOS) {
  (promosByStore[p.storeSlug] ??= []).push(p);
}
writeJson("promos.json", promosByStore);

writeJson("applications.json", APPLICATIONS);
writeJson("billing.json", BILLING);
writeJson("subscribers.json", SUBSCRIBERS);

// Append audit entries
const auditLines = [
  { kind: "application_decided", applicationId: "app_riya001", storeName: "Riya's Closet", decision: "approved" },
  { kind: "application_decided", applicationId: "app_kabir001", storeName: "Earthen by Kabir", decision: "approved" },
  { kind: "admin_login" },
].map((e) =>
  JSON.stringify({
    id: id("aud"),
    at: new Date().toISOString(),
    event: e,
  })
);
fs.writeFileSync(path.join(DATA, "audit.log"), auditLines.join("\n") + "\n");
console.log("  ✓ audit.log (3 entries)");

console.log("\n🎉 Done! Demo data seeded.\n");
console.log("Login credentials:");
console.log("  Seller (Riya):  riya@demo.sawpd / demo1234");
console.log("  Seller (Kabir): kabir@demo.sawpd / demo1234");
console.log("  Admin:          demo-admin-password-change-me");
console.log("\nStorefronts:");
console.log("  /s/riya   — 8 products, paid plan, active promos, orders");
console.log("  /s/kabir  — 2 products, free trial");
console.log("\nPublic pages:");
console.log("  /          — landing page");
console.log("  /shops     — shop directory");
console.log("  /track     — order tracking (try ord_001 + phone 9876543211)");
console.log("  /apply     — creator application");
