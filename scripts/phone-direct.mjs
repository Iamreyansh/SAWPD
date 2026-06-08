import puppeteer from 'puppeteer-core';
import path from 'node:path';

const OUT = '/tmp/opencode/screenshots';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

// Screenshot the phone mockup directly from the live page at 2x
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Find the phone — it's a div containing a notch + shop preview image.
  // Strategy: find the largest <img> on the right half of the page.
  const phoneBox = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    let best = null;
    let bestArea = 0;
    for (const img of imgs) {
      const r = img.getBoundingClientRect();
      if (r.width < 200 || r.height < 400) continue;
      if (r.x < window.innerWidth * 0.4) continue; // right half
      const a = r.width * r.height;
      if (a > bestArea) {
        bestArea = a;
        best = { x: r.x, y: r.y, w: r.width, h: r.height };
      }
    }
    return best;
  });

  console.log('phone image box:', phoneBox);
  if (phoneBox) {
    // Get parent frame (the actual phone bezel)
    const frameBox = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x + 50, y + 50);
      if (!el) return null;
      let node = el;
      for (let i = 0; i < 6; i++) {
        const r = node.getBoundingClientRect();
        const cs = getComputedStyle(node);
        const br = parseFloat(cs.borderRadius);
        // Phone bezel: dark, rounded, large
        if (cs.backgroundColor.includes('rgb(0, 0, 0)') && br > 20) {
          return { x: r.x, y: r.y, w: r.width, h: r.height, br };
        }
        node = node.parentElement;
        if (!node) break;
      }
      return null;
    }, phoneBox);
    console.log('frame box:', frameBox);

    if (frameBox) {
      const pad = 20;
      await page.screenshot({
        path: path.join(OUT, 'phone-direct.png'),
        clip: {
          x: Math.max(0, frameBox.x - pad),
          y: Math.max(0, frameBox.y - pad),
          width: frameBox.w + pad * 2,
          height: frameBox.h + pad * 2,
        },
      });
      console.log('✓ phone-direct.png');
    } else {
      // Fallback: just clip the image with padding
      const pad = 40;
      await page.screenshot({
        path: path.join(OUT, 'phone-direct.png'),
        clip: {
          x: Math.max(0, phoneBox.x - pad),
          y: Math.max(0, phoneBox.y - pad),
          width: phoneBox.w + pad * 2,
          height: phoneBox.h + pad * 2,
        },
      });
      console.log('✓ phone-direct.png (image with padding)');
    }
  }
  await page.close();
}

// Also: screenshot the full hero at a wider/taller viewport so the phone is the star
{
  const page = await browser.newPage();
  // Make viewport tall and narrow so phone is the focus
  await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  // Screenshot just the right side where the phone is
  await page.screenshot({
    path: path.join(OUT, 'landing-phone-side.png'),
    clip: { x: 300, y: 0, width: 600, height: 1000 },
  });
  console.log('✓ landing-phone-side.png');
  await page.close();
}

await browser.close();
console.log('done');
