import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

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
writeFileSync("/Users/rey/Desktop/m3test/src/app/icon.png", buf);
await browser.close();
console.log("wrote src/app/icon.png (" + buf.length + " bytes)");
