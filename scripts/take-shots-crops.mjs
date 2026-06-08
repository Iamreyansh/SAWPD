import puppeteer from 'puppeteer-core';
import path from 'node:path';

const OUT = '/tmp/opencode/screenshots';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

// Landing page — phone mockup only (zoomed in)
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Find the phone mockup element. The landing page has it as an <img> inside a phone frame div.
  // Try to find a phone-frame-like element.
  const phoneFrame = await page.evaluateHandle(() => {
    // Look for the phone frame — it's a wrapper around the inner shop image
    const candidates = [
      document.querySelector('img[alt*="New drops"]'),
      document.querySelector('img[alt*="Phone"]'),
      document.querySelector('[class*="phone"]'),
      document.querySelector('[class*="Phone"]'),
      document.querySelector('[class*="mockup"]'),
    ];
    for (const c of candidates) {
      if (c) return c;
    }
    return null;
  });

  if (phoneFrame && phoneFrame.asElement()) {
    const el = phoneFrame.asElement();
    const box = await el.boundingBox();
    if (box) {
      // Get the nearest phone-shaped ancestor (likely a div with rounded corners and a bezel)
      const parent = await el.evaluateHandle((node) => {
        let p = node.parentElement;
        while (p && getComputedStyle(p).borderRadius === '0px' && p.tagName !== 'BODY') {
          p = p.parentElement;
        }
        return p;
      });
      const parentEl = parent.asElement();
      if (parentEl) {
        const pBox = await parentEl.boundingBox();
        if (pBox) {
          const pad = 40;
          await page.screenshot({
            path: path.join(OUT, 'phone-mockup.png'),
            clip: {
              x: Math.max(0, pBox.x - pad),
              y: Math.max(0, pBox.y - pad),
              width: pBox.width + pad * 2,
              height: pBox.height + pad * 2,
            },
          });
          console.log('✓ phone-mockup.png', pBox);
        }
      }
    }
  } else {
    console.log('no phone frame found');
  }
  await page.close();
}

// Shop hero (the storefront view) — viewport
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/s/smoke-studio', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(OUT, 'shop-browser.png'),
    clip: { x: 0, y: 0, width: 1200, height: 800 },
  });
  console.log('✓ shop-browser.png');
  await page.close();
}

// Shop hero image (the big image card only)
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/s/smoke-studio', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  const heroImg = await page.$('main img, [class*="hero"] img, img');
  if (heroImg) {
    const box = await heroImg.boundingBox();
    if (box) {
      // Try a few times in case the image hasn't loaded bounds
      await page.screenshot({
        path: path.join(OUT, 'shop-image.png'),
        clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      });
      console.log('✓ shop-image.png', box);
    }
  }
  await page.close();
}

await browser.close();
console.log('done');
