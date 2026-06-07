import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../src/app/icon.png");

const html = `<!doctype html>
<html><head><style>
  html, body { margin: 0; padding: 0; }
  body { width: 64px; height: 64px; background: #111; display: flex; align-items: center; justify-content: center; }
  .s { font: 800 44px/1 -apple-system, system-ui, sans-serif; color: #FAF9F7; letter-spacing: -0.04em; }
</style></head>
<body><div class="s">S</div></body></html>`;

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 64, height: 64 });
await page.setContent(html, { waitUntil: "networkidle0" });
const buf = await page.screenshot({ type: "png", omitBackground: false });
writeFileSync(outPath, buf);
await browser.close();
console.log("wrote " + outPath + " (" + buf.length + " bytes)");
