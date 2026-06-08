import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const OUT = '/tmp/opencode/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: 'landing',         url: 'http://localhost:3001/' },
  { name: 'shop',            url: 'http://localhost:3001/s/smoke-studio' },
  { name: 'checkout',        url: 'http://localhost:3001/s/smoke-studio/checkout' },
  { name: 'apply',           url: 'http://localhost:3001/apply' },
  { name: 'track',           url: 'http://localhost:3001/track' },
  { name: 'shops-browse',    url: 'http://localhost:3001/shops' },
  { name: 'dashboard',       url: 'http://localhost:3001/dashboard' },
  { name: 'dashboard-orders',url: 'http://localhost:3001/dashboard/orders' },
];

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const p of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  console.log(`→ ${p.name} ${p.url}`);
  try {
    await page.goto(p.url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(OUT, `${p.name}.png`),
      fullPage: true,
    });
    console.log(`  ✓ ${p.name}.png`);
  } catch (e) {
    console.log(`  ✗ ${p.name}: ${e.message}`);
  }
  await page.close();
}

await browser.close();
console.log('done');
