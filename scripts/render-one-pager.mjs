#!/usr/bin/env node
/**
 * Render the SAWPD one-pager to PDF using the system Chrome.
 * Run: node scripts/render-one-pager.mjs
 */
import puppeteer from "puppeteer-core";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(projectRoot, "scripts/one-pager.html");
const outPath = path.join(projectRoot, "sawpd-one-pager.pdf");

// Find system Chrome (macOS, Linux common paths).
function findChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates[0]; // we know Chrome.app exists on this system
}

async function main() {
  const html = await fs.readFile(htmlPath, "utf-8");
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });
  try {
    const page = await browser.newPage();
    // Wait for images to load.
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60_000 });
    // Force background colors on print.
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    console.log("wrote", outPath, `${(pdf.length / 1024).toFixed(1)} KB`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
