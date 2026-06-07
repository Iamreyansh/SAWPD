import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const SHOTS = "/tmp/sawpd-ui-shots";
const ADMIN_COOKIE =
  "sawpd_admin=1.8743c2bd86511d709a45dab10aae2d6a6c15152c0ec7c79d248cd7caed3e6ebb";
const SESSION_VALUE = "1";

mkdirSync(SHOTS, { recursive: true });

const publicRoutes = [
  { path: "/", name: "01-landing" },
  { path: "/shops", name: "02-shops" },
  { path: "/apply", name: "03-apply" },
  { path: "/track", name: "04-track" },
  { path: "/s/riya", name: "05-store-riya" },
  { path: "/s/riya/checkout", name: "06-checkout" },
  { path: "/admin/login", name: "07-admin-login" },
];

const adminRoutes = [
  { path: "/admin", name: "08-admin" },
  { path: "/admin/applications", name: "09-admin-applications" },
  { path: "/admin/stores", name: "10-admin-stores" },
  { path: "/admin/stores/riya", name: "11-admin-store-riya" },
];

const dashboardRoutes = [
  { path: "/dashboard", name: "12-dashboard" },
  { path: "/dashboard/orders", name: "13-dashboard-orders" },
  { path: "/dashboard/orders/ord_demo10", name: "14-dashboard-order-detail" },
  { path: "/dashboard/products", name: "15-dashboard-products" },
  { path: "/dashboard/promotions", name: "16-dashboard-promotions" },
  { path: "/dashboard/settings", name: "17-dashboard-settings" },
  { path: "/dashboard/customers", name: "18-dashboard-customers" },
  { path: "/dashboard/returns", name: "19-dashboard-returns" },
];

async function crawlPage(browser, route, useAdminCookie) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  if (useAdminCookie) {
    await browser.setCookie({
      name: "sawpd_admin",
      value: `${SESSION_VALUE}.8743c2bd86511d709a45dab10aae2d6a6c15152c0ec7c79d248cd7caed3e6ebb`,
      domain: "localhost",
      path: "/",
    });
  }

  const issues = {
    route: route.path,
    name: route.name,
    consoleErrors: [],
    consoleWarnings: [],
    networkFailures: [],
    missingAlt: [],
    pageTitle: null,
    metaDescription: null,
    bodyOverflow: null,
    brokenImages: [],
  };

  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error") issues.consoleErrors.push(msg.text().slice(0, 200));
    if (type === "warning") issues.consoleWarnings.push(msg.text().slice(0, 200));
  });

  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400) {
      issues.networkFailures.push(`${status} ${res.url()}`);
    }
  });

  try {
    const resp = await page.goto(BASE + route.path, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    issues.status = resp ? resp.status() : null;

    await new Promise((r) => setTimeout(r, 800));

    issues.pageTitle = await page.title();

    const meta = await page.evaluate(() => {
      const d = document.querySelector('meta[name="description"]');
      return d ? d.getAttribute("content") : null;
    });
    issues.metaDescription = meta;

    const a11y = await page.evaluate(() => {
      const out = { missingAlt: 0, emptyButtons: 0, emptyLinks: 0 };
      document.querySelectorAll("img").forEach((img) => {
        if (!img.getAttribute("alt") && img.getAttribute("alt") !== "") {
          out.missingAlt++;
        }
      });
      document.querySelectorAll("button").forEach((b) => {
        if (!b.textContent.trim() && !b.getAttribute("aria-label")) {
          out.emptyButtons++;
        }
      });
      document.querySelectorAll("a").forEach((a) => {
        if (!a.textContent.trim() && !a.getAttribute("aria-label")) {
          out.emptyLinks++;
        }
      });
      out.bodyScrollWidth = document.body.scrollWidth;
      out.viewportWidth = window.innerWidth;
      return out;
    });
    issues.missingAlt = a11y.missingAlt;
    issues.emptyButtons = a11y.emptyButtons;
    issues.emptyLinks = a11y.emptyLinks;
    issues.horizontalOverflow = a11y.bodyScrollWidth > a11y.viewportWidth + 2;

    const brokenImgs = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("img").forEach((img) => {
        if (img.naturalWidth === 0 && img.src) {
          out.push(img.src);
        }
      });
      return out;
    });
    issues.brokenImages = brokenImgs;

    await page.screenshot({ path: `${SHOTS}/${route.name}.png`, fullPage: true });
  } catch (e) {
    issues.error = e.message;
  }

  await page.close();
  return issues;
}

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
});

console.log("Crawling public routes...");
const publicResults = [];
for (const r of publicRoutes) {
  const i = await crawlPage(browser, r, false);
  publicResults.push(i);
  console.log(`  ${r.path} → ${i.status || "ERR"}${i.error ? " (" + i.error + ")" : ""}`);
}

console.log("\nCrawling admin routes...");
const adminResults = [];
for (const r of adminRoutes) {
  const i = await crawlPage(browser, r, true);
  adminResults.push(i);
  console.log(`  ${r.path} → ${i.status || "ERR"}${i.error ? " (" + i.error + ")" : ""}`);
}

console.log("\nCrawling dashboard routes...");
const dashboardResults = [];
for (const r of dashboardRoutes) {
  const i = await crawlPage(browser, r, true);
  dashboardResults.push(i);
  console.log(`  ${r.path} → ${i.status || "ERR"}${i.error ? " (" + i.error + ")" : ""}`);
}

await browser.close();

const all = [...publicResults, ...adminResults, ...dashboardResults];
writeFileSync("/tmp/sawpd-ui-issues.json", JSON.stringify(all, null, 2));

console.log("\n=== Summary ===");
console.log(`Pages crawled: ${all.length}`);
console.log(`Pages with console errors: ${all.filter((p) => p.consoleErrors.length).length}`);
console.log(`Pages with network failures: ${all.filter((p) => p.networkFailures.length).length}`);
console.log(`Pages with horizontal overflow: ${all.filter((p) => p.horizontalOverflow).length}`);
console.log(`Pages with broken images: ${all.filter((p) => p.brokenImages.length).length}`);
console.log(`Screenshots in: ${SHOTS}`);
