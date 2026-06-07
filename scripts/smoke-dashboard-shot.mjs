// scripts/smoke-dashboard-shot.mjs
// Quick screenshot of the seller dashboard with the test store.

import puppeteer from "puppeteer-core";
import { execSync } from "child_process";
import { mkdirSync } from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const SHOTS = "/tmp/sawpd-set21-shots";

const sellerId = process.argv[2];
if (!sellerId) {
  console.error("Usage: node scripts/smoke-dashboard-shot.mjs <sellerId>");
  process.exit(1);
}

const cookieValue = execSync(
  `node ${path.join(process.cwd(), "scripts/mint-seller-cookie.mjs")} ${sellerId}`
).toString().trim();

mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setCookie({ name: "sawpd_seller", value: cookieValue, url: BASE });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
  await page.screenshot({
    path: path.join(SHOTS, "13-dashboard-with-store-final.png"),
    fullPage: true,
  });
  console.log("Screenshot saved.");
} finally {
  await browser.close();
}
