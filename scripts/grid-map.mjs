import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const SRC = '/tmp/opencode/screenshots/landing-hero.png';
const OUT = '/tmp/opencode/screenshots';
const buf = readFileSync(SRC);
const b64 = buf.toString('base64');

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function crop(w, h, sx, sy, sw, outName) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  const html = `<!doctype html><html><head><style>
    *{margin:0;padding:0} body{background:#faf9f7}
    .f{position:relative;width:${w}px;height:${h}px;overflow:hidden}
    .f img{position:absolute;left:-${sx}px;top:-${sy}px;width:${sw}px;height:auto}
  </style></head><body><div class="f"><img src="data:image/png;base64,${b64}"/></div></body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(OUT, outName), type: 'png' });
  console.log('✓', outName, `${w}x${h} src ${sx},${sy} sw=${sw}`);
  await page.close();
}

// Quick grid map at 540x540 to see where things are
// Source 2880x1800. sw should cover full width so sx offsets work.
// At full width 2880 displayed in viewport 1080, image is 0.375x.
// So sx=1440 shows the right half. We need sw=2880.
const SW = 2880;

// Top, middle, bottom strips
await crop(1080, 540, 0, 0, SW, 'grid-top.png');
await crop(1080, 540, 0, 540, SW, 'grid-mid.png');
await crop(1080, 540, 0, 1260, SW, 'grid-bot.png');

await browser.close();
console.log('done');
