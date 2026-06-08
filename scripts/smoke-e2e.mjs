#!/usr/bin/env node
/**
 * End-to-end smoke test for SAWPD demo.
 * Tests every major flow: storefront, checkout, tracking, seller login,
 * dashboard, admin login, applications, stores, products, promos, orders.
 *
 * Run: node scripts/smoke-e2e.mjs
 */

import puppeteer from "puppeteer";

const BASE = "http://localhost:3000";
const WIDE = { width: 1440, height: 900 };

let browser;
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  const page = await browser.newPage();
  await page.setViewport(WIDE);
  try {
    await fn(page);
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    const msg = err.message?.slice(0, 200) || String(err);
    failures.push({ name, msg });
    console.log(`  ❌ ${name}: ${msg}`);
  } finally {
    await page.close();
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

// ── Public Pages ────────────────────────────────────────────────────────────

async function testLandingPage(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  const title = await page.title();
  assert(title.includes("SAWPD"), `Title should contain SAWPD, got: ${title}`);
}

async function testShopsDirectory(page) {
  await page.goto(`${BASE}/shops`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("Riya"), "Should show Riya's store");
  assert(html.includes("Earthen"), "Should show Kabir's store");
}

async function testRiyaStorefront(page) {
  await page.goto(`${BASE}/s/riya`, { waitUntil: "networkidle2" });
  const title = await page.title();
  assert(title.includes("Riya"), `Title should mention Riya, got: ${title}`);
  // Products are client-rendered, wait a bit
  await page.waitForTimeout(1500);
  const html = await page.content();
  assert(html.includes("product") || html.includes("Pleated"), "Should render products");
}

async function testKabirStorefront(page) {
  await page.goto(`${BASE}/s/kabir`, { waitUntil: "networkidle2" });
  const title = await page.title();
  assert(title.includes("Kabir") || title.includes("Earthen"), `Title should mention Kabir/Earthen, got: ${title}`);
}

async function testApplyPage(page) {
  await page.goto(`${BASE}/apply`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("apply") || html.includes("Apply") || html.includes("application"), "Should show apply form");
}

async function testTrackPage(page) {
  await page.goto(`${BASE}/track`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("track") || html.includes("Track") || html.includes("order"), "Should show track page");
  // Should have demo order chips
  assert(html.includes("ord_00") || html.includes("demo"), "Should have demo order chips");
}

// ── Seller Login Flow ───────────────────────────────────────────────────────

async function testSellerLogin(page) {
  await page.goto(`${BASE}/seller/login`, { waitUntil: "networkidle2" });
  const title = await page.title();
  assert(title.includes("Seller") || title.includes("Login") || title.includes("Log"), `Should be login page, got: ${title}`);

  // Fill in credentials
  await page.type('input[name="email"]', "riya@demo.sawpd");
  await page.type('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  const url = page.url();
  assert(url.includes("/dashboard"), `Should redirect to dashboard, got: ${url}`);
}

async function testSellerDashboard(page) {
  // Login first
  await page.goto(`${BASE}/seller/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', "riya@demo.sawpd");
  await page.type('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  const url = page.url();
  assert(url.includes("/dashboard"), "Should be on dashboard");

  const html = await page.content();
  assert(html.includes("dashboard") || html.includes("Dashboard") || html.includes("Revenue"), "Should show dashboard content");
}

async function testSellerOrders(page) {
  // Login first
  await page.goto(`${BASE}/seller/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', "riya@demo.sawpd");
  await page.type('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  await page.goto(`${BASE}/dashboard/orders`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("order") || html.includes("Order"), "Should show orders");
}

async function testSellerProducts(page) {
  // Login first
  await page.goto(`${BASE}/seller/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', "riya@demo.sawpd");
  await page.type('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  await page.goto(`${BASE}/dashboard/products`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("product") || html.includes("Product"), "Should show products page");
}

async function testSellerPromotions(page) {
  // Login first
  await page.goto(`${BASE}/seller/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', "riya@demo.sawpd");
  await page.type('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  await page.goto(`${BASE}/dashboard/promotions`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("promo") || html.includes("Promo") || html.includes("WELCOME"), "Should show promos");
}

async function testSellerSettings(page) {
  // Login first
  await page.goto(`${BASE}/seller/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', "riya@demo.sawpd");
  await page.type('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("setting") || html.includes("Setting") || html.includes("Store") || html.includes("UPI"), "Should show settings");
}

async function testSellerReturns(page) {
  // Login first
  await page.goto(`${BASE}/seller/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', "riya@demo.sawpd");
  await page.type('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  await page.goto(`${BASE}/dashboard/returns`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("return") || html.includes("Return"), "Should show returns page");
}

// ── Admin Login Flow ────────────────────────────────────────────────────────

async function testAdminLogin(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("Admin") || html.includes("admin"), "Should show admin login");

  await page.type('input[name="password"]', "demo-admin-password-change-me");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  const url = page.url();
  assert(url.includes("/admin"), `Should redirect to admin, got: ${url}`);
  assert(!url.includes("/login"), "Should not be on login page anymore");
}

async function testAdminOverview(page) {
  // Login first
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="password"]', "demo-admin-password-change-me");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  const html = await page.content();
  assert(html.includes("admin") || html.includes("Admin") || html.includes("application") || html.includes("store"), "Should show admin overview");
}

async function testAdminApplications(page) {
  // Login first
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="password"]', "demo-admin-password-change-me");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  await page.goto(`${BASE}/admin/applications`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("application") || html.includes("Application") || html.includes("pending"), "Should show applications");
}

async function testAdminStores(page) {
  // Login first
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="password"]', "demo-admin-password-change-me");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  await page.goto(`${BASE}/admin/stores`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("store") || html.includes("Store") || html.includes("Riya"), "Should show stores");
}

async function testAdminStoreDetail(page) {
  // Login first
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="password"]', "demo-admin-password-change-me");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 });

  await page.goto(`${BASE}/admin/stores/riya`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("Riya") || html.includes("riya"), "Should show Riya store detail");
}

// ── Checkout Flow ───────────────────────────────────────────────────────────

async function testCheckoutPage(page) {
  await page.goto(`${BASE}/s/riya/checkout`, { waitUntil: "networkidle2" });
  const html = await page.content();
  assert(html.includes("checkout") || html.includes("Checkout") || html.includes("UPI") || html.includes("payment"), "Should show checkout page");
}

// ── Order Tracking Flow ─────────────────────────────────────────────────────

async function testTrackOrder(page) {
  await page.goto(`${BASE}/track`, { waitUntil: "networkidle2" });

  // Wait for the form to render
  await page.waitForTimeout(1000);

  // Check if demo order chips exist and click one
  const demoChips = await page.$$('button');
  let foundDemoChip = false;
  for (const chip of demoChips) {
    const text = await chip.evaluate(el => el.textContent);
    if (text && text.includes('ord_00')) {
      await chip.click();
      foundDemoChip = true;
      break;
    }
  }

  if (foundDemoChip) {
    await page.waitForTimeout(1500);
    const html = await page.content();
    assert(html.includes("ord_00") || html.includes("Order") || html.includes("status"), "Should show order details after clicking demo chip");
  } else {
    // Fallback: manually fill the form
    const orderIdInput = await page.$('input[name="orderId"], input[placeholder*="order"], input[placeholder*="Order"]');
    const phoneInput = await page.$('input[name="phone"], input[placeholder*="phone"], input[placeholder*="Phone"]');
    if (orderIdInput && phoneInput) {
      await orderIdInput.type("ord_001");
      await phoneInput.type("9876543211");
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) await submitBtn.click();
      await page.waitForTimeout(1500);
      const html = await page.content();
      assert(html.includes("ord_001") || html.includes("Order") || html.includes("completed"), "Should show tracked order");
    }
  }
}

// ── Run all tests ───────────────────────────────────────────────────────────

async function main() {
  console.log("\n🧪 SAWPD End-to-End Smoke Test\n");

  browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // Public pages
  console.log("📄 Public Pages:");
  await test("Landing page loads", testLandingPage);
  await test("Shops directory shows stores", testShopsDirectory);
  await test("Riya storefront loads", testRiyaStorefront);
  await test("Kabir storefront loads", testKabirStorefront);
  await test("Apply page loads", testApplyPage);
  await test("Track page loads", testTrackPage);

  // Checkout
  console.log("\n🛒 Checkout:");
  await test("Checkout page loads", testCheckoutPage);

  // Order tracking
  console.log("\n📦 Order Tracking:");
  await test("Track order with demo data", testTrackOrder);

  // Seller flow
  console.log("\n👤 Seller Flow:");
  await test("Seller login works", testSellerLogin);
  await test("Seller dashboard loads", testSellerDashboard);
  await test("Seller orders page loads", testSellerOrders);
  await test("Seller products page loads", testSellerProducts);
  await test("Seller promotions page loads", testSellerPromotions);
  await test("Seller settings page loads", testSellerSettings);
  await test("Seller returns page loads", testSellerReturns);

  // Admin flow
  console.log("\n🔑 Admin Flow:");
  await test("Admin login works", testAdminLogin);
  await test("Admin overview loads", testAdminOverview);
  await test("Admin applications page loads", testAdminApplications);
  await test("Admin stores page loads", testAdminStores);
  await test("Admin store detail page loads", testAdminStoreDetail);

  await browser.close();

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.log("\n❌ Failures:");
    for (const f of failures) {
      console.log(`  • ${f.name}: ${f.msg}`);
    }
  }

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
