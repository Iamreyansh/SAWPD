#!/usr/bin/env node
/**
 * Render the SAWPD Instagram launch kit to a single PDF.
 * Contains: section A (10 × 1080×1080 square posts) + section B (10 × 1080×1350 portrait posts).
 * Each PDF page = one Instagram post canvas — screenshot to post.
 *
 * Run: node scripts/render-instagram-posts.mjs
 */
import puppeteer from "puppeteer-core";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(projectRoot, "scripts/instagram-posts.html");
const outPath = path.join(projectRoot, "sawpd-instagram-launch-kit.pdf");

function findChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates[0];
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
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 90_000 });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      path: outPath,
      printBackground: true,
      preferCSSPageSize: true, // honour @page sq / @page pt named sizes
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
