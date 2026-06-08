import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const SRC = '/tmp/opencode/screenshots/landing-hero.png';
const OUT = '/tmp/opencode/screenshots';

// PNG header dims
const buf = readFileSync(SRC);
const SRC_W = buf.readUInt32BE(16);
const SRC_H = buf.readUInt32BE(20);
console.log('source:', SRC_W, 'x', SRC_H);

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function crop(svgLike, outName) {
  const page = await browser.newPage();
  await page.setViewport({ width: svgLike.w, height: svgLike.h, deviceScaleFactor: 2 });
  // base64 inline
  const b64 = buf.toString('base64');
  const html = `<!doctype html><html><head><style>
    * { margin: 0; padding: 0; }
    body { background: #faf9f7; }
    .frame { position: relative; width: ${svgLike.w}px; height: ${svgLike.h}px; overflow: hidden; }
    .frame img { position: absolute; left: -${svgLike.sx}px; top: -${svgLike.sy}px; width: ${svgLike.sw}px; height: auto; }
  </style></head><body><div class="frame"><img src="data:image/png;base64,${b64}"/></div></body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, outName), type: 'png' });
  console.log('✓', outName, `${svgLike.w}x${svgLike.h}`, `src crop ${svgLike.sx},${svgLike.sy} ${svgLike.sw}w`);
  await page.close();
}

// Source: 2880x1800 px. Phone mockup at roughly x:1820-2480 y:280-1620 (2x px).
// Convert 2x -> 1x by /2.
// Phone in 1x: x:910..1240, y:140..810. Width ~330, height ~670. Wait — let me re-check.
// Looking at the rendered image: phone takes right side, large.
// Phone bounding box at 1x viewport coords (1440x900):
//   left ~ 910, top ~ 140, width ~ 330, height ~ 740.
//   => 2x px: 1820..2480 (x), 280..1620 (y). Width 660, height 1340.
//   Source 2880 wide => in 1x source it's 1440. So source-img at full size is 2880x1800.

// Crops (use source 2x coords directly):
// 1) Square 1080x1080 — full hero, with text on left + phone on right (centered around the phone+text split)
await crop({ w: 1080, h: 1080, sx: 700, sy: 200, sw: 1200 }, 'crop-1-hero.png');

// 2) Square 1080x1080 — phone only, generous padding
await crop({ w: 1080, h: 1080, sx: 1500, sy: 200, sw: 1300 }, 'crop-2-phone-square.png');

// 3) Portrait 1080x1350 — phone only, taller
await crop({ w: 1080, h: 1350, sx: 1500, sy: 100, sw: 1300 }, 'crop-3-phone-portrait.png');

// 4) Square 1080x1080 — phone + a sliver of text on left
await crop({ w: 1080, h: 1080, sx: 1100, sy: 200, sw: 1300 }, 'crop-4-phone-with-text.png');

// 5) Portrait 1080x1350 — phone + a sliver of text on left, taller
await crop({ w: 1080, h: 1350, sx: 1100, sy: 100, sw: 1300 }, 'crop-5-phone-portrait-tall.png');

await browser.close();
console.log('done');
