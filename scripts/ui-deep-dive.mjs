import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const SHOTS = "/tmp/sawpd-ui-shots";
mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Capture store page after scroll to verify products render
await page.goto(`${BASE}/s/riya`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1500));

// Scroll to bottom gradually so Framer Motion whileInView triggers
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let total = 0;
    const distance = 200;
    const timer = setInterval(() => {
      window.scrollBy(0, distance);
      total += distance;
      if (total >= document.body.scrollHeight) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
});
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 800));

await page.screenshot({ path: `${SHOTS}/05b-store-riya-scrolled.png`, fullPage: true });

// Also test a few critical interactions
console.log("--- Test: hover product card to see 'add to bag' button ---");
await page.evaluate(() => window.scrollBy(0, 1000));
await new Promise((r) => setTimeout(r, 800));
const cardBox = await page.evaluate(() => {
  const card = document.querySelector('button[aria-label^="View "]');
  if (!card) return null;
  const r = card.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: card.getAttribute("aria-label") };
});
if (cardBox) {
  console.log("First product card:", cardBox.label);
  await page.mouse.move(cardBox.x, cardBox.y);
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${SHOTS}/05c-store-riya-hover.png` });
} else {
  console.log("No product card found!");
}

// Test: check admin login security text
const loginPage = await browser.newPage();
await loginPage.setViewport({ width: 1440, height: 900 });
await loginPage.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
const adminSecretText = await loginPage.evaluate(() => {
  return document.body.innerText.match(/ADMIN_SECRET/g);
});
console.log("ADMIN_SECRET mentioned in admin login:", adminSecretText);

// Test: /shops page
const shopsPage = await browser.newPage();
await shopsPage.setViewport({ width: 1440, height: 900 });
await shopsPage.goto(`${BASE}/shops`, { waitUntil: "networkidle2" });
const shopsCount = await shopsPage.evaluate(() => {
  return document.querySelectorAll('a[href^="/s/"]').length;
});
console.log("Shops shown on /shops:", shopsCount);

// Test: missing favicon
const faviconStatus = await new Promise((resolve) => {
  fetch(`${BASE}/favicon.ico`).then((r) => resolve(r.status));
});
console.log("Favicon status:", faviconStatus);

await browser.close();
console.log("Done. See 05b-store-riya-scrolled.png and 05c-store-riya-hover.png");
