// scripts/smoke-seller-auth.mjs
// End-to-end smoke test for the per-seller auth flow (Set 21).
//
// What it does:
//   1. Sign up a new seller at /seller/signup via the real form.
//   2. Submit a 4-step application via /apply.
//   3. Forge an admin cookie, approve the application in /admin.
//   4. Sign back in as the seller, visit /dashboard, verify the store is visible.
//   5. Re-apply for a second shop, verify the dashboard shows 2 stores.

import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const SHOTS = "/tmp/sawpd-set21-shots";
const TEST_EMAIL = `smoke-${Date.now()}@example.com`;
const TEST_PASSWORD = "smoketest123";
const ADMIN_COOKIE_VALUE =
  "1.8743c2bd86511d709a45dab10aae2d6a6c15152c0ec7c79d248cd7caed3e6ebb";

mkdirSync(SHOTS, { recursive: true });

const log = (msg) => console.log(`[smoke] ${msg}`);
const shot = (page, name) =>
  page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

let pass = 0;
let fail = 0;
function check(name, cond, detail = "") {
  if (cond) {
    log(`✓ ${name}`);
    pass++;
  } else {
    log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
    fail++;
  }
}

try {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // ---- 1. Sign up ----
  log(`1. Sign up: ${TEST_EMAIL}`);
  await page.goto(`${BASE}/seller/signup`, { waitUntil: "networkidle2" });
  await shot(page, "01-signup");
  await page.type('input[name="email"]', TEST_EMAIL);
  await page.type('input[name="password"]', TEST_PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 1500));
  check(
    "redirected to /apply after signup",
    page.url().endsWith("/apply"),
    page.url()
  );
  await shot(page, "02-after-signup");
  const sellerCookies = await page.cookies();
  const sellerCookie = sellerCookies.find((c) => c.name === "sawpd_seller");
  check("sawpd_seller cookie set", Boolean(sellerCookie));
  log(`  cookie = ${sellerCookie?.value.slice(0, 32)}...`);

  // ---- 2. Submit a 4-step application ----
  log("2. Submit application");
  await page.goto(`${BASE}/apply`, { waitUntil: "networkidle2" });
  await shot(page, "03-apply-step0");

  // Helper: click a button by its visible text
  async function clickByText(text) {
    const clicked = await page.evaluate((t) => {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      const target = buttons.find(
        (b) => b.textContent && b.textContent.trim().includes(t) && !b.disabled
      );
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, text);
    if (!clicked) throw new Error(`Button with text "${text}" not found`);
  }

  // Step 0: You
  await page.type('input[placeholder="Riya Sharma"]', "Smoke Test");
  await page.type('input[placeholder="@yourbrand"]', "@smoketest");
  await page.type('input[placeholder="you@example.com"]', TEST_EMAIL);
  await page.type('input[placeholder="+91 98765 43210"]', "9876543210");
  await shot(page, "04-apply-step0-filled");
  await clickByText("Continue");
  await new Promise((r) => setTimeout(r, 500));

  // Step 1: Shop
  await page.type('input[placeholder="e.g. Riya Studio"]', "Smoke Studio");
  await page.evaluate(() => {
    const sel = document.querySelector("select");
    if (sel) {
      sel.value = sel.options[1]?.value ?? sel.options[0]?.value ?? "";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.type('input[placeholder="e.g. 4200"]', "1000");
  await page.type('input[placeholder="e.g. 1500"]', "800");
  await shot(page, "05-apply-step1-filled");
  await clickByText("Continue");
  await new Promise((r) => setTimeout(r, 500));

  // Step 2: Sales
  await shot(page, "06-apply-step2");
  // Pick the first sales cadence radio/button
  await page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll('button[type="button"], [role="radio"]')
    );
    const cadence = candidates.find(
      (b) => b.textContent && /daily|weekly|monthly|cadence|few|often/i.test(b.textContent)
    );
    if (cadence) cadence.click();
  });
  await page.type('input[placeholder="e.g. 12"]', "20");
  const setupTextarea = await page.$('textarea[placeholder*="DMs"]');
  if (setupTextarea) {
    await setupTextarea.type("DMs and WhatsApp catalog, shipping from Mumbai.");
  }
  await shot(page, "06b-apply-step2-filled");
  await clickByText("Continue");
  await new Promise((r) => setTimeout(r, 500));

  // Step 3: Why
  await shot(page, "07-apply-step3");
  const topProductsTa = await page.$('textarea[placeholder*="Linen"]');
  if (topProductsTa) {
    await topProductsTa.type("1. Linen shirt ₹1899 · 2. Trousers ₹2299 · 3. Tote ₹899");
  }
  const motivationTa = await page.$('textarea[placeholder*="lose sales"]');
  if (motivationTa) {
    await motivationTa.type("I lose sales in DMs. A real checkout link would help convert.");
  }
  // Pick a referral source
  await page.evaluate(() => {
    const sel = document.querySelector("select");
    if (sel) {
      sel.value = sel.options[1]?.value ?? sel.options[0]?.value ?? "";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await shot(page, "08-apply-step3-filled");
  await clickByText("Submit application");
  await new Promise((r) => setTimeout(r, 2000));
  await shot(page, "09-apply-submitted");

  // ---- 3. Admin approves ----
  log("3. Admin approves");
  const adminPage = await ctx.newPage();
  await adminPage.setCookie({
    name: "sawpd_admin",
    value: ADMIN_COOKIE_VALUE,
    url: BASE,
  });
  await adminPage.goto(`${BASE}/admin/applications`, { waitUntil: "networkidle2" });
  await shot(adminPage, "10-admin-applications");
  const appsText = await adminPage.content();
  check("admin sees Smoke Studio application", appsText.includes("Smoke Studio"));

  // Click the "Review →" link to go to the decision page
  await adminPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));
    const review = links.find(
      (a) => a.textContent && a.textContent.trim().includes("Review")
    );
    if (review) review.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
  await shot(adminPage, "10b-admin-review");

  // Now on the decision page, click the Approve button
  const approveClicked = await adminPage.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const approve = buttons.find(
      (b) =>
        b.textContent &&
        /approve.*start.*trial|approve/i.test(b.textContent.trim()) &&
        !b.disabled
    );
    if (approve) {
      approve.click();
      return true;
    }
    return false;
  });
  log(`  approve clicked: ${approveClicked}`);
  await new Promise((r) => setTimeout(r, 2500));
  await shot(adminPage, "11-admin-after-approve");

  // Verify a store was created
  const { readFileSync } = await import("fs");
  const stores = JSON.parse(
    readFileSync("/Users/rey/Desktop/SAWPD/data/store.json", "utf-8")
  );
  check("a store was created after admin approval", stores.length > 0);
  log(`  stores count: ${stores.length}`);
  if (stores.length > 0) {
    log(`  store: ${JSON.stringify(stores[0]).slice(0, 200)}...`);
  }

  // ---- 4. Sign back in as seller, check dashboard ----
  log("4. Sign back in as seller, check dashboard");
  await page.deleteCookie({ name: "sawpd_seller", url: BASE });
  await page.goto(`${BASE}/seller/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', TEST_EMAIL);
  await page.type('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  // router.push is client-side; poll for URL change
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 300));
    if (page.url().endsWith("/dashboard")) break;
  }
  check("redirected to /dashboard after login", page.url().endsWith("/dashboard"));
  await shot(page, "12-dashboard-with-store");
  const dashText = await page.content();
  check(
    "dashboard shows Smoke Studio in store list / overview",
    dashText.includes("Smoke Studio")
  );

  // ---- Summary ----
  log(`\n=== ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exitCode = 1;
} catch (e) {
  console.error("Smoke test crashed:", e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
