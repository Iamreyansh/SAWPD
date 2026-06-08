import puppeteer from 'puppeteer-core';
import path from 'node:path';

const OUT = '/tmp/opencode/screenshots';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

// 1) Landing page — phone mockup area (top viewport, ~1300 wide)
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  // Just the top hero section (with the phone mockup on the right)
  await page.screenshot({
    path: path.join(OUT, 'landing-hero.png'),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('✓ landing-hero.png');
  // Phone-only zoomed
  const phone = await page.$('img[alt*="New drops"], img[src*="smoke"], iframe, .phone-frame, [class*="phone"], [class*="mockup"]');
  if (phone) {
    const box = await phone.boundingBox();
    if (box) {
      const pad = 60;
      await page.screenshot({
        path: path.join(OUT, 'landing-phone.png'),
        clip: {
          x: Math.max(0, box.x - pad),
          y: Math.max(0, box.y - pad),
          width: box.width + pad * 2,
          height: box.height + pad * 2,
        },
      });
      console.log('✓ landing-phone.png');
    }
  }
  await page.close();
}

// 2) Shop — viewport-only top
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/s/smoke-studio', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(OUT, 'shop-viewport.png'),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('✓ shop-viewport.png');
  // Just the hero image
  const heroImg = await page.$('img');
  if (heroImg) {
    const box = await heroImg.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(OUT, 'shop-hero.png'),
        clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      });
      console.log('✓ shop-hero.png');
    }
  }
  await page.close();
}

// 3) Checkout — full
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/s/smoke-studio/checkout', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(OUT, 'checkout-viewport.png'),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('✓ checkout-viewport.png');
  await page.close();
}

// 4) Apply page
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/apply', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(OUT, 'apply-viewport.png'),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log('✓ apply-viewport.png');
  await page.close();
}

await browser.close();
console.log('done');
