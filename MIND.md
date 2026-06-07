# Mind File — SAWPD

> **Rebrand 2026-06-06:** Project renamed from "InstaShop" to **SAWPD**.
> Historical change-log entries still mention the prior name.

> **For new sessions / other days:** Read this file first. It tells you the
> project shape, what's done, and what to pick up next. After every meaningful
> change, append to the **Change log** and update the **Next set** section.

---

## 0. TL;DR for a new session

1. **What**: A Next.js 15 app for Instagram creators — they apply, get approved,
   get a `/s/<slug>` storefront, take UPI orders, verify screenshots, ship.
2. **Where**: `/Users/rey/Desktop/m3test`. Working dir of this opencode session.
3. **Status**: MVP complete + 6 polish/feature sets shipped. `pnpm typecheck` and
   `pnpm lint` both pass. **No tests yet.**
4. **What to do next**: pick the first item under **"Next set — pick this up"**
   below and ship it. Update this file (change log + status) at the end.

## 1. Quick start (verification)

```bash
cd /Users/rey/Desktop/m3test
pnpm typecheck         # tsc --noEmit  → must pass
pnpm lint              # next lint     → must pass
pnpm dev               # start dev server on :3000
```

Admin login (set in `.env.local`):
- `ADMIN_SECRET=demo-admin-password-change-me` → sign-in password.
- `NOTIFY_EMAIL=` (blank by default; gates the admin inbox in `lib/notify.ts`).

## 2. Tech stack

- **Next.js 15.1.3** (App Router, React 19, Server Components + Server Actions).
- **TypeScript** (strict), **Tailwind 3**, **Framer Motion**, **Zustand**, **Zod**, **react-hook-form**.
- **pnpm** workspace. Scripts: `dev`, `build`, `start`, `lint`, `typecheck`.
- **Storage**: file-based JSON in `data/` (gitignored). No DB. No Supabase.
- **Auth**: single signed cookie (`sawpd_admin`) HMAC-SHA256 with `ADMIN_SECRET`.
- **Payment**: no gateway. UPI QR generated client-side via `qrcode`. Owner manually
  verifies screenshots.
- **Email**: stubbed. `lib/notify.ts#deliver()` writes to `data/notifications.log`
  (rolling 200-line cap) + `console.log`. Replace with Resend/Postmark/SES later.

## 3. Surfaces (every route in the app)

| Route | Purpose | Auth |
|---|---|---|
| `/` | Marketing (hero, how-it-works, pricing, FAQ, final-cta) | public |
| `/s/[slug]` | Storefront (hero, product grid, cart, product detail) | public |
| `/s/[slug]/checkout` | UPI QR, form, screenshot, promo, post-order | public |
| `/track` | Customer order tracking (order ID + last-7 of phone) | public |
| `/apply` | Creator application form | public |
| `/admin/login` | Password → signed cookie | public |
| `/admin` | Admin overview (app stats, recent, trials ending soon) | admin |
| `/admin/applications` | List + tabs (all/pending/approved/rejected) + `?from=&to=` date filter | admin |
| `/admin/applications/[id]` | Review + approve/reject (creates `trialEndsAt` 14d) | admin |
| `/admin/stores` | All stores with order/product counts + "View shop" | admin |
| `/dashboard` | Seller overview (revenue, pending, low-stock, recent, trial banner) | admin |
| `/dashboard/orders` | Paginated list, status tabs | admin |
| `/dashboard/orders/[id]` | Order detail + action panel (verify/ship/complete/cancel/resend) | admin |
| `/dashboard/customers` | LTV, repeat, search, client-paged | admin |
| `/dashboard/products` | CRUD with multi-image upload, drag/reorder | admin |
| `/dashboard/promotions` | CRUD with state, usage, expiry | admin |
| `/dashboard/settings` | Plan picker + store profile + UPI + hero | admin |
| `/api/dashboard/orders` | CSV export, admin-gated | admin |
| `/api/dashboard/customers` | CSV export, admin-gated | admin |

Plus boundary files: `app/not-found.tsx`, `app/error.tsx`,
`app/s/[slug]/error.tsx`, `app/dashboard/error.tsx`, `app/admin/error.tsx`.

## 4. Seeded data

- **Stores**: 2 — `riya` (paid `monthly`, renews 2026-06-20) and `kabir` (no plan, no trial).
- **Products**: 7 (under `riya` only).
- **Promos**: 3 (`WELCOME10`, `DIWALI500`, paused `OLDSCHOOL`) — all under `riya`.
- **Orders**: 4 (varied statuses — verified, awaiting_verification, awaiting_payment, completed).
- **Applications**: 3 (all approved, 2 active trials).
- **Billing**: 0 (created on plan activation).
- **Notifications log**: rotates to 200 lines.

The `kabir` store has no products — visiting `/s/kabir` shows the empty-state
"DM on Instagram instead" UI. Good for testing the empty path.

## 5. Architecture (subsystems, where they live)

### 5.1 Data layer (`src/lib/*` — single source of truth)
- `lib/store.ts` — `getStore`, `listStores`, `getFirstStore`, `updateStore`, plus
  billing (`activatePlanMock`, `listBillingForStore`).
- `lib/products.ts` — list/get/add/update/delete products. `MAX_PRODUCT_IMAGES = 6`.
- `lib/orders.ts` — list/get/add orders. Status transitions set
  `verifiedAt`/`shippedAt`/`completedAt`/`cancelledAt`/`resendRequestedAt` as
  appropriate.
- `lib/promos.ts` — CRUD, state machine (`getPromoState` returns
  `active|paused|scheduled|expired|exhausted`), `computeDiscount`,
  `validatePromo` (read-only) and `applyPromo` (increments `usageCount`).
- `lib/applications.ts` — list/get/add/decide. Approval sets
  `trialEndsAt = now + 14d`.
- `lib/customers.ts` — `aggregateCustomers(orders)` and CSV serializers.
- `lib/trial.ts` — `getTrialState`, `isStoreOpen` (single source of truth for
  store open/closed).
- `lib/plans.ts` — `PlanId`, pricing (₹499/wk, ₹1499/mo), renewal helper.
- `lib/notify.ts` — `notifyApplicationReceived/Decided`, `notifyOrderPlaced`,
  `notifyOrderStatusChanged`, `notifyTrialEnding`. Persists to
  `data/notifications.log`.
- `lib/payment-check.ts` — `checkPaymentScreenshot` (MIME/size heuristic).
- `lib/stores.ts` — `listStoreSummaries`, `listStoreSlugs` (multi-tenant).
- `lib/whatsapp.ts` — `buildWhatsAppLink`, `ownerContactMessage`.
- `lib/address-memory.ts` — cookie-backed last-used address.
- `lib/uploads.ts` — local file upload to `public/uploads/`.
- `lib/admin-auth.ts` — cookie sign/verify, `isAdmin`, `checkPassword`.

### 5.2 Server actions
- `src/app/apply/actions.ts` — `submitApplication`.
- `src/app/admin/actions.ts` — `loginAction`, `logoutAction`, `decideAction`.
- `src/app/dashboard/actions.ts` — product CRUD, order status updates, store
  settings, promo CRUD, **`choosePlanAction`**, **`requestResendAction`**.
- `src/app/s/[slug]/checkout/actions.ts` — `validatePromoAction`, `placeOrder`.
- `src/app/track/actions.ts` — `trackOrderAction` (public, ID + last-7 phone).

### 5.3 Stores (Zustand, client)
- `src/store/cart-store.ts` — items, hydrated flag (load from localStorage).
- `src/store/ui-store.ts` — `cartOpen`, `productDetailId`.

### 5.4 UI conventions
- `server-only` on every `lib/*.ts` that touches FS/env.
- `"use server"` on every `*/actions.ts`.
- `"use client"` on any file with hooks/framer-motion/QRCode.
- Forms: `react-hook-form` + `zodResolver`.
- Animations: framer-motion.
- Sheets/Dialogs: `@/components/ui/sheet`, `@/components/ui/dialog`.
- Server actions return tagged unions:
  `{ ok: true; ... } | { ok: false; error: string; fieldErrors? }`.
- `revalidatePath` on every mutation that affects the storefront.
- Tailwind with custom tokens (`bone`, `ink`, `vermillion`, `muted`) and
  components (`display-xl`, `display-l`, `display-m`, `display-s`, `eyebrow`,
  `eyebrow-ink`, `hairline`, `container-editorial`) in `globals.css`.

### 5.5 Entry points to skim first
- `src/lib/*.ts` — domain layer.
- `src/app/dashboard/actions.ts` — all seller mutations in one file.
- `src/app/admin/actions.ts` — admin auth + decide.
- `src/app/s/[slug]/checkout/actions.ts` — checkout flow.

## 6. Build / quality

- `pnpm typecheck` → ✅ passes
- `pnpm lint` → ✅ passes
- No tests, no test framework in deps.
- `.gitignore` covers `data/`, `public/uploads/*` (keeps `.gitkeep`), `.next/`, env files.

## 7. Next set — pick this up

The Sets 8–20 plan is the active queue (see `PLAN.md`). The rebrand landed as Set 18 (in-place; the planned SEO/share-assets scope deferred to a future set). Next: **Sets 19–20 — UI polish + remaining roadmap**.

Active work (2026-06-07): a UI audit surfaced ~14 issues. Fixing them set-by-set. **Sets 19A–19F** track the fixes:
- **Set 19A (in progress) — Brand + security.** `ADMIN_SECRET` env var name removed from `/admin/login`. Brand mark `IS → S` in the 3 spots the rebrand sweep missed (`/shops`, `/apply`, marketing footer). Favicon: `src/app/icon.png` (64×64 ink-square with white "S") + `public/favicon.ico` fallback. `scripts/make-favicon.mjs` regenerates from a temp HTML/Puppeteer render.
- **Set 19B — Page metadata.** Per-page `<title>` + `description` on `/apply`, `/s/[slug]/checkout`, `/dashboard/orders/[id]`, `/dashboard/promotions`, `/dashboard/customers`, `/dashboard/returns`. Currently fall through to the marketing default.
- **Set 19C — Visual bugs.** Hero "Handpicked" overflow on `/s/riya` (font-size clamp on the 3rd headline line). Replace broken Unsplash IDs in testimonials + featured shop.
- **Set 19D — UX polish.** "Coming soon" treatment for empty storefronts on `/shops`; settings hero image helper; customers LTV spacing; sidebar order (keep Returns as-is).
- **Set 19E — A11y/perf.** `whileInView` reduced-motion fallback + visibility timeout for storefront product cards (currently invisible to scrapers/reduced-motion users).
- **Set 19F (optional) — Trust strip text size; per-page titles for admin pages.

Beyond the plan:

1. **Per-seller auth** (medium, ~half day)
   - Currently the dashboard is single-tenant (`getFirstStore` + single admin cookie).
   - Add a `lib/seller-auth.ts` (mirror of `admin-auth.ts`) with a `seller_<slug>`
     cookie. Wire `/admin/login` to optionally pick a store, or add
     `/dashboard/login` for sellers.
   - Replace `getFirstStore` in dashboard pages with `getStoreForSession`.

2. **Real email provider** (small, ~1 hour)
   - Pick one (Resend is simplest). Add dep, env var.
   - Replace `deliver()` in `lib/notify.ts`. Add a smoke test path.

3. **Real payment gateway — Razorpay** (medium, ~1 day)
   - Replace `lib/store.ts#activatePlanMock` with a real checkout.
   - Add `app/api/razorpay/webhook/route.ts` to flip `store.plan` on successful
     subscription. Verify HMAC signature.
   - Plan picker becomes "Pay with Razorpay" instead of "Activate".

4. **Tests** (ongoing, ~2 days for full coverage)
   - Pick Vitest (Next.js friendly, fast).
   - Start with `lib/trial.ts`, `lib/promos.ts`, `lib/payment-check.ts` (pure logic).
   - Then a couple of action tests for `placeOrder` (mock the lib calls).

5. **Build artefacts cleanup** (trivial, ~5 min)
   - Delete `.next/` and `tsconfig.tsbuildinfo` from working dir. They regenerate.

When you finish a set, append a new entry under **Change log** and bump the
remaining items in this section.

**Full feature roadmap** lives in `/Users/rey/Desktop/m3test/PLAN.md` (Sets 8–20).
Sets 8+ are plan-driven work, not TODO. After completing a set, append a Change
log entry and mark it done in PLAN.md.

## 8. Change log

- **Set 1 (2026-06-06) — Cleanup**
  - Deleted empty stubs: `src/supabase/`, `src/components/layout/`.
  - Removed `Supabase` comment from `.gitignore`.
  - Fixed seed bug: `p-03` Cropped Knit no longer tagged `sold-out` (stock 9, available true).
  - Added `not-found.tsx` at root, `error.tsx` at root + `s/[slug]` + `dashboard` + `admin`.
- **Set 2 (2026-06-06) — Notifications + trial enforcement**
  - `lib/notify.ts` (provider-agnostic, logs to `data/notifications.log`).
  - `lib/trial.ts` (`getTrialState`, `isStoreOpen`).
  - Hooked into apply/decide/checkout/order-status.
  - Storefront vermillion "Shop paused" banner; cart hidden when closed.
  - Dashboard overview + settings use the trial helper.
- **Set 3 (2026-06-06) — Pagination + tag filtering**
  - `components/ui/pagination.tsx` (search-param driven).
  - `/dashboard/orders` (10/p, preserves `?status=`).
  - `/admin/applications` (15/p, preserves `?status=`).
  - `/dashboard/customers` uses inline `ClientPager` over the search filter.
  - Storefront `ProductGrid` filters by `?tag=new|limited|sale` with counts.
- **Set 4 (2026-06-06) — Mock plan flow**
  - `lib/plans.ts` (pricing + helpers), `lib/store.ts` (`activatePlanMock`, `listBillingForStore`).
  - `components/dashboard/plan-picker.tsx` (two plan cards, mock receipt, "Test mode" badge).
  - `dashboard/actions.ts#choosePlanAction` writes a `BillingRecord` to `data/billing.json`.
  - Settings page shows renewal date when on a paid plan.
- **Set 5 (2026-06-06) — Screenshot auto-check + resend**
  - `lib/payment-check.ts` — MIME/size heuristic on the uploaded data URL.
  - `Order.paymentScreenshot` field; `placeOrder` runs the check on every upload.
  - Order detail shows pass/fail badges and an empty-screenshot warning.
  - `requestResendAction` in dashboard actions + "Request resend" button in the action panel.
- **Set 6 (2026-06-06) — Multi-tenant scaffolding**
  - `lib/stores.ts` — `listStoreSummaries`, `listStoreSlugs`.
  - `generateStaticParams` enumerates slugs for `/s/[slug]` and `/s/[slug]/checkout`.
  - Seeded a second store (`kabir` / Earthen) in `data/store.json`.
  - New `/admin/stores` page with order/product counts. Added to admin nav.
- **Set 7 (2026-06-06) — Date range filter on /admin/applications**
  - `?from=YYYY-MM-DD&to=YYYY-MM-DD` query params, validated server-side.
  - Filter applied after status filter, before pagination. `to` is end-of-day inclusive (added 24h).
  - New `ApplicationsDateFilter` client component (`date-filter.tsx`) — two `<input type="date">` + "Clear dates" + "Status / dates applied" hint. Auto-submits on change via `useTransition` + `router.push`.
  - Tabs and Pagination now preserve `from`/`to` via `withDate()` helper and `extraParams`.
  - Empty-state copy updated: "No applications here." when no apps exist at all vs. "No applications match these filters." when filters drop everything.
- **Set 8 (2026-06-06) — Pricing honesty + landing visual**
  - **Pricing bug fixed**: landing page was advertising ₹249/wk and ₹799/mo, but `lib/plans.ts` actually charged ₹499/wk and ₹1499/mo. Standardised to the source-of-truth prices everywhere: pricing card (`pricing.tsx`), hero micro-copy (`hero.tsx`), and `activatePlanMock` (now uses `PLAN_PRICING[plan].amountInr` instead of a hardcoded literal).
  - Monthly savings copy updated from "Save 68%" (wrong, based on ₹249) to honest "Save 25%".
  - Hero restructured into 7/5 grid (copy on left, phone on right) on desktop, stacked on mobile.
  - New `PhoneMockup` subcomponent: pure-CSS iPhone-style frame with the live `/s/riya` hero, a featured product ("Pleated Trouser" using the existing Unsplash seed), cart preview, and CTA. Staggered fade-up + slight rotation on mount.
  - New `StatsStrip` below the hero: 4-up grid (200+ shops · 10K+ orders · ₹40L+ paid · 100% yours) in a card with bone/60 backdrop blur.
- **Set 9 (2026-06-06) — Social proof + featured shops**
  - New `LogoWall` section ("As featured in") with 6 text-only logos: Inc42 · YourStory · Instagram India · Mint · Forbes India · The Ken. Hairline dividers, no external assets.
  - New `Testimonials` section: 4 fabricated quotes (Ananya, Kabir, Priya, Aanya) with initials avatars, niche tag, and Instagram handle. Lead card spans 2 columns on desktop with a side hero image. All quotes tied to the seeded creator handles (Ananya/Kabir/Priya exist in `data/applications.json`; Aanya is invented to round out jewelry niche).
  - New `FeaturedShops` section (server component, calls `listStoreSummaries`): horizontal scroll carousel of live shop cards. Each card shows hero image, "Open"/"Paused" badge, name, product count, IG handle, order count, "Visit shop →" link. Snap scroll on mobile, hover lift on desktop. Filters out stores with 0 products (so kabir doesn't show). "See all shops" links to `/shops` (built in Set 10).
  - Page composition updated in `app/page.tsx`: Hero → LogoWall → HowItWorks → FeaturedShops → WhatWeVerify → Testimonials → Pricing → FAQ → FinalCta.
- **Set 10 (2026-06-06) — Marketing infra**
  - New `/shops` page (`src/app/shops/page.tsx`): public directory of all live shops. Server component, calls `listStoreSummaries`, filters to stores with products > 0, renders a 1/2/3-column responsive grid. Empty state if no shops. "Open a shop" CTA in header. `dynamic = "force-dynamic"` so it stays in sync with seed data.
  - New `lib/subscribe.ts` (server action, gated by `import "server-only"`): writes to `data/subscribers.json` (auto-creates dir). Zod email validation. Dedupe by email. Fires `notifySubscriberAdded` (new `NotificationKind` added to `lib/notify.ts`). `revalidatePath("/admin")` so the inbox count updates. `listSubscribers()` exported for future admin use.
  - New `NewsletterForm` client component (`src/components/landing/newsletter-form.tsx`): inline form with `useFormStatus` submit button, success/error states, "already subscribed" copy.
  - New `TrustStrip` section on the landing page (full-bleed ink background): 4-up grid with icons — UPI payments · 100% of every sale · Hand-reviewed · Made in India.
  - Footer rewired: now 4 sections (Product / Company / Resources) + Get-updates newsletter form on the left. Real links to /shops, /track, /apply, /admin/login, /about, /contact, /terms, /privacy (legal pages ship in Set 17).
  - Page composition updated: … → Pricing → TrustStrip → FAQ → FinalCta. Footer swapped to the 4-column version with newsletter.
- **Set 11 (2026-06-06) — Comparison + founder narrative**
  - New `ComparisonTable` section: 4-column × 7-row matrix of InstaShop vs Shopify Lite vs linktr.ee vs Selar. Cell values are "yes" / "no" / "partial" rendered as colored check/x/dash icons. InstaShop column gets a subtle highlight bg. Disclaimer footnote. Columns are min-width-[640px] inside an overflow-x-auto shell for mobile.
  - New `Founder` section: 2-column layout (image left, copy right) with a placeholder photo, ink-card with founder's name, "A note from the founder" headline, 2 paragraphs of narrative copy ("I watched a friend lose 9 hours a week to DMs..."), 2 stat cards (200+ creators, ₹40L+ paid), and a "Read the longer story →" link to /about (which ships in Set 17).
  - Page composition updated: … → Testimonials → ComparisonTable → Pricing → TrustStrip → Founder → FAQ → FinalCta.
- **Set 12 (2026-06-06) — Storefront polish**
  - **Stock urgency chip on product card image**: vermillion pill (bottom-left) with dot + "Only N left" when `stockCount <= 5` and in stock. Bumped threshold from 3 to 5. Existing inline "Only N left" text under the price kept.
  - **Search box** on storefront grid header: matches against `title`, `tagline`, `altText` (case-insensitive). URL-synced via `?q=` param. Syncs via `useTransition` + `router.replace`. Clear (X) button when non-empty. Pending indicator dot during transitions. Empty-state copy adapts to context ("No pieces match \"X\" in new").
  - **Sold ticker** in storefront footer: a 1-row strip above the footer's main content showing "X pieces sold in the last 7 days" + "Y sold to date · Z customers". `TrendingUp` icon. Pulled from `listOrders(slug)` in the page, passed to the footer. Counts only orders in `verified | shipped | completed` status. Hidden when no sold orders.
  - **Bug fix during this set**: the new product grid initially rendered 0 products. Root cause: removed the "all" short-circuit when refactoring — `matchesTag(p, "all")` returns false because "all" is not a real tag, so the filter dropped every product. Fixed by short-circuiting the filter when `active === "all" && !query`.
- **Set 13 (2026-06-06) — Multi-step apply form**
  - Refactored `apply-form.tsx` from a single long form to a 4-step wizard: **You → Shop → Sales → Why**.
  - **Progress bar** at the top: animated ink fill (framer-motion width), percent counter, dot indicators for each step (empty / current / done).
  - **Per-step client-side validation** (no submission until current step is valid). Error chips inline on each field.
  - **Draft persistence** via `localStorage` key `instashop.applyDraft.v1`. Auto-saves on every field change. Restored on mount (gated by `hydrated` flag to avoid SSR mismatch). Cleared on successful submission.
  - **Animated transitions** between steps using framer-motion `AnimatePresence mode="wait"`. Step label + description swap cleanly.
  - **Email confirmation card** on the success view: vermillion mail icon + the email the user just submitted + "check your spam folder" copy. Visible surface for the real email provider swap in Set 14/15.
  - **Apply again** button on success view resets to step 0 with empty form.
- **Set 14 (2026-06-06) — Dashboard analytics + inventory alerts**
  - `src/components/dashboard/sparkline.tsx` — pure SVG sparkline, animated smooth path, area fill, last-point dot. Exports `buildDailyRevenue(orders, days=30)` that buckets verified/shipped/completed totals by day.
  - `src/app/dashboard/page.tsx` — new "Last 30 days · revenue" card with the sparkline, last-7-day total, and week-over-week delta pill (vermillion up, ink-50 down). Low-stock alerts section now uses vermillion tint when flagged, with an explicit count and a `Check inventory` button; also a calm "all stocked up" state with the same button. Threshold bumped 3 → 5 to match storefront `isLowStock`.
  - `src/app/dashboard/actions.ts` — new `checkInventoryAction(storeSlug)` server action: scans products where `isAvailable && 0 < stockCount <= 5`, fires a single `notifyLowStock` summary (logs only — no email yet), revalidates `/dashboard`. Returns `CheckInventoryResult`.
  - `src/components/dashboard/check-inventory-button.tsx` — client button wrapping the action, with spinner / success / error states. `router.refresh()` after success so banner updates.
  - `src/lib/notify.ts` — added `low_stock` to `NotificationKind`; new `notifyLowStock({ storeName, storeEmail, products })` helper. Prefers `storeEmail` (so the seller gets it), falls back to admin inbox; logs if both empty.
- **Set 15 (2026-06-06) — Admin polish**
  - `src/lib/audit.ts` — JSONL append-only audit log at `data/audit.log`. `appendAudit(event)` (best-effort, swallows errors so the log can never block an action); `readRecentAudit(limit=10)` (cheapest possible tail read); `describeAuditEvent(entry)` for human-readable rendering. `AuditEvent` union: `admin_login | admin_logout | application_decided | application_emailed | store_suspended | store_reactivated | store_plan_changed`.
  - `src/lib/notify.ts` — added `admin_message` to `NotificationKind`; new `notifyStoreEmail({ to, subject, body })` helper. Used by the manual applicant-email action so admin outreach flows through the same logging path as templated notifications.
  - `src/lib/trial.ts` — `getTrialState` now short-circuits on `store.paused === true` to return `{ active: false, planLabel: "Suspended", reason: "suspended" }`. Paused stores are read-only regardless of plan state, so storefront + cart + orders respect an admin override without changing any other code path.
  - `src/types/storefront.ts#Store` — added optional `paused?: boolean` and `pausedReason?: string`. Both are admin-controlled.
  - `src/app/admin/actions.ts` — `loginAction` / `logoutAction` / `decideAction` now call `appendAudit`. New actions: `suspendStoreAction({ storeSlug, reason })`, `reactivateStoreAction({ storeSlug, reason })`, `changeStorePlanAction({ storeSlug, plan: "weekly" | "monthly" | "none" })`, `emailApplicantAction({ applicationId, subject, body })` (Zod-validated, per-field errors), `adminForceLowStockAction(storeSlug)`. All revalidate their relevant paths and write to the audit log.
  - `src/app/admin/stores/[slug]/page.tsx` (new) — per-store override page. Header (name, slug, plan label, state chip, open-storefront / view-application shortcuts). 4-up stats (Revenue / Verify queue / Products / Orders). Recent orders list (top 8 by recency, with image stack, customer, status, total). Right rail mounts `StoreControls`. Low-stock section in vermillion when any product is below 5.
  - `src/app/admin/stores/[slug]/store-controls.tsx` (new client component) — three stacked panels: **Store state** (suspend/reactivate with optional reason), **Plan override** (weekly / monthly / none, with current + warning copy), **Quick actions** (force low-stock notify + email-applicant inline form). `useTransition` + per-action error / success banners. Email form is gated on having a matched application (matched by `notifyEmail`).
  - `src/app/admin/stores/page.tsx` — each row now has a `Manage` button that links to `/admin/stores/[slug]` in addition to the existing `View shop` external link.
  - `src/app/admin/page.tsx` — new "Recent activity" section under recent applications. Reads `readRecentAudit(8)`, renders with a `describeAuditEvent` row, with `Suspended` events tinted vermillion. Empty state copy explains what to do to seed the log.
- **Set 16 (2026-06-06) — Onboarding + draft products + visual refresh**
  - **Design system refresh.** New tokens in `tailwind.config.ts`: `bone` palette (DEFAULT `#FAF9F7`, strong `#F5F2EC`), `vermillion` palette (DEFAULT `#FF4A1C`, deep `#DC320C`, soft `#FFEEE7`), full shadow scale (`xs | soft | sm | md | lg | float | glow`), and `bg-dots` / `bg-grid` utility classes. `globals.css` adds surface primitives: `.surface-card`, `.surface-card-hover`, `.surface-inset`, `.surface-glass`, `.ring-focus`, `.row-hover`, plus `::selection` accent in vermillion. Existing utility classes (`.display-xl/l/m/s`, `.eyebrow`, `.eyebrow-ink`, `.hairline`, `.container-editorial`) unchanged.
  - **Button.** Vermillion is now the default `variant` (was `ink`). The old `vermillion` variant is kept as an alias for the 18 existing call sites. New variants: `ink` (explicit black), `glass` (backdrop blur), `destructive` (vermillion tint on bone). Default focus ring is now vermillion/40, not ink/40. Default `shadow-glow` for vermillion buttons.
  - **Subscription-only copy scrub.** Every "0% commission" / "Zero commission" reference is gone. New claims: TrustStrip "100% of every sale · Flat weekly or monthly subscription. Sales are all yours." Hero stat: "100% yours, every sale". FAQ: "You keep 100% of every sale. We never touch the money." Testimonial: removed "no commission". Founder: "We keep 0%" → "You pay a flat subscription; you keep the customer, the money, and your evenings back." Pricing headline: "Pay only when you stay" (was "Pay only when you sell", which implied commission).
  - **First-time onboarding banner** (`src/components/dashboard/onboarding-banner.tsx`). Renders on `/dashboard` for any store where `onboardingDismissed !== true`. 4-step checklist with progress bar: **Add first product** (live products > 0), **Set UPI ID**, **Write hero copy** (heroSub > 20 chars + non-empty headline), **Add launch promo** (any active promo). Each step is a clickable chip with an arrow link. Dismiss button writes `onboardingDismissed: true` via `dismissOnboardingAction`. When all 4 are done, the banner collapses into a black "Your shop is ready to take orders" celebration card with a vermillion CTA to add another product.
  - **Product status field** — `ProductStatus = "live" | "draft" | "scheduled" | "archived"`. Optional `status?` and `scheduledFor?` on `Product`. Legacy products default to `status: "live"` via `normalize()` in `lib/products.ts`. New selectors: `isPubliclyVisible(p)` (hides draft + archived; scheduled only shows when `scheduledFor <= now`); `listLiveProductsForStore(slug)` (storefront selector); `countProductsByStatus(slug)`.
  - **Storefront selector swap.** `/s/[slug]/page.tsx` and `/s/[slug]/checkout/page.tsx` now read from `listLiveProductsForStore`. Drafts and archives never reach the customer. Dashboard, admin, and the audit log still call `listProductsForStore` (full list).
  - **Product form ("Save as draft")** — `formSchema` in `products-client.tsx` adds `status: "live" | "draft"`. The form sheet has three footer buttons: Cancel, **Save as draft** (outline), **Publish** (vermillion). Saving as draft forces `status: "draft"` regardless of what the live form thinks.
  - **Product grid grouping** — `ProductSections` (new helper in `products-client.tsx`) splits products into `live | drafts | archived` groups, each with a header chip + count. Drafts and archives are rendered with `draftStyle: true` (draft chip overlay, muted opacity, no hover-zoom). Empty state hides any group with zero items.
  - **Dashboard shell** — active sidebar nav now uses vermillion tint (`bg-vermillion/[0.08] text-vermillion-deep`) with vermillion icon and `strokeWidth={2.25}` when active; ink-icon `strokeWidth={1.75}` when inactive. Brand mark uses `rounded-xl shadow-glow` instead of `rounded-full`. Border colors tightened to `ink/[0.07]` / `ink/[0.06]`.
  - **Per-storefront quick-add** — `product-card.tsx` quick-add chip flipped from `bg-ink` to `bg-vermillion shadow-glow` so the add button visually pops on hover.
  - **Marketing surfaces** — `marketing-header.tsx`, `dashboard/page.tsx` "Choose plan" CTA, `shops/page.tsx` "Open a shop" CTA, and `newsletter-form.tsx` SubmitButton all switched to `bg-vermillion` + `shadow-glow`. Landing pricing card now scales up the highlighted tier (`md:scale-[1.02]`) and uses feature-row checkmarks inside a vermillion/10 pill instead of a bare icon.
- **Set 17 (2026-06-06) — Subscription UX refresh + Returns feature (4 user asks)**
  - **Subscription UX refresh — no payment is being taken yet.** Rewrote `plan-picker.tsx` copy: section header "Activate your shop", "We're in early access — pick a plan to unlock order taking. No card, no payment collected yet. You'll be billed when we open paid plans." Buttons now read "Choose Pay-as-you-go" / "Choose Monthly" / "Renew plan". Confirmation banner says "Pay-as-you-go plan active. Order taking is unlocked." Dropped "Test mode" / "Mock receipt" / `MOCK-` verbiage from the user-facing surface.
  - **Plan picker internal rename + receipt prefix.** `lib/store.ts#activatePlanMock` docstring now says "no payment is collected during this phase — we just stamp the plan + a renewal date and write a no-charge billing record." `lib/plans.ts#planReference()` now returns `EA-…` (Early Access) instead of `MOCK-…`. The function name is preserved for back-compat with `dashboard/actions.ts` and `admin/actions.ts` call sites.
  - **Final "commission" scrub.** MIND change-log + TrustStrip + Testimonial + FAQ + Founder all updated in Set 16. Set 17 finishes the docs: PLAN.md (Sets 1, 4) reworded to "100% of every sale" and "per-sale commission" column (instead of "0% commission" / "commission" rows). `comparison-table.tsx` rewrote the confusing "Commission on sales" row into two clearer rows: **Per-sale commission** (yes/no column) + **Flat subscription model** (yes/no column). Footer note explains what "no" means.
  - **Returns feature — data layer** (`src/lib/returns.ts`): JSONL-ish `data/returns.json` (pretty-printed for human inspection). `ReturnRequest` type with status `pending | approved | rejected | refunded`. CRUD: `addReturn`, `getReturn`, `listReturnsForStore`, `listReturnsForOrder`, `updateReturnStatus`. Pure `checkReturnEligibility({ order, customerPhoneLast7, policy, now? })` returns `{ eligible, reason?, daysLeft?, policy }`. Eligibility = policy enabled + order `shipped`/`completed` + last-7-digit phone match (same leniency as track) + within `windowDays` of `createdAt`. Reasons: `policy_disabled | no_policy | order_not_deliverable | phone_mismatch | outside_window`.
  - **Returns feature — types + default** (`src/types/storefront.ts`): new `ReturnsPolicy` type and `DEFAULT_RETURNS_POLICY = { enabled: false, windowDays: 7, mode: "any" }`. Added optional `returnsPolicy?: ReturnsPolicy` to `Store`. `lib/store.ts#normalizeStore` backfills the default for legacy stores.
  - **Returns feature — server actions.** `track/actions.ts#requestReturnAction(input)`: Zod-validated, normalises phone, runs eligibility check, verifies the chosen productId is on the order and qty ≤ ordered qty, writes the return, appends `return_requested` to the audit log, and emails the store via `notifyStoreEmail` (logs only — admin email is empty). `dashboard/actions.ts#decideReturnAction({ id, status, note?, refundAmount? })`: validates, refuses to re-decide a non-pending return, writes the decision, appends `return_decided` to the audit log, revalidates the order page + returns inbox + track. `updateReturnsPolicyAction(storeSlug, input)` is a separate Zod-validated action; takes the same `enabled | windowDays | mode | policyText` shape the form posts.
  - **Returns feature — seller surfaces.** `dashboard/settings/page.tsx` now mounts `<ReturnsPolicyForm>` (a new `components/dashboard/returns-policy-form.tsx`) below the existing store settings. The form has a master "Accept returns on this shop" checkbox, a window preset row (3/7/14/30 days + custom), an "Accept" mode radio pair (any / defective only), and an optional policy text textarea. When policy is disabled the inner controls dim. `dashboard/orders/[id]/order-returns-panel.tsx` (new) shows a per-order Returns card with a chip per request; each pending request expands an inline decision form (note + refund amount + Approve / Mark refunded / Reject) that calls `decideReturnAction` and revalidates. `dashboard/returns/page.tsx` (new) is a per-store inbox: 4-up stat chips (pending / approved / refunded / rejected), policy badge in the header, list of all returns with status chips and a link back to the originating order. New sidebar nav entry in `dashboard-shell.tsx` between Orders and Customers.
  - **Returns feature — customer surface.** `track/actions.ts#trackOrderAction` now also returns `returns[]` (id, status, productTitle, qty, requestedAt) and `returnsPolicy`. `track/track-returns-card.tsx` (new) renders below the order items: if returns exist, shows a status list with a "Request another return" toggle; if no returns exist and the order is shipped/completed AND the policy is enabled, shows a "Request return" disclosure with a product dropdown, qty input, reason textarea, and a clear "No refund is issued until the shop approves" disclaimer. Hidden entirely when the policy is off.
  - **Customer front: no login/signup — confirmed.** `grep -r "login|signup|signin|sign-in|register" src/app/s` returns only RHF `register` calls in the checkout form. Track is order-ID + last-7 phone. No auth surface on `/s/[slug]/checkout` or `/s/[slug]/page.tsx` or `/track`.
  - **Audit log additions** (`lib/audit.ts`): `return_requested` and `return_decided` kinds. `describeAuditEvent` returns "Return requested · {title} × {qty} · order {orderId}" and "Return {decision} · order {orderId}".
  - **No new files in `data/` were seeded;** `data/returns.json` is created on first write. Smoke test confirmed: an injected `ret_test01` shows up in the returns inbox + the order detail panel; data restored.
  - **Discoverability fix (2026-06-06, follow-up).** The returns card only renders when (a) the shop's policy is `enabled: true` and (b) the order is `shipped`/`completed` and within the window. Two follow-ups so the demo actually shows the feature:
    1. **Enabled returns on Riya in `data/store.json`** with `mode: "defective_only"`, `windowDays: 7`. The dashboard user can disable / re-tune it from Settings → Returns.
    2. **Promoted `ord_demo10` to `shipped`** (was `verified`) and added `shippedAt` + `trackingNote`. Age 1d, well inside the 7-day window.
    3. **Added a "Try a demo order" helper to `/track`** (vermillion card above the form, only on the demo site). The track page now reads the 2 most recent orders for `riya` and renders one-click Fill chips with `id` + `phone` + status. Hidden in prod when no orders are passed (`demos: []`). Implemented in `app/track/page.tsx` (server component, calls `listOrders("riya")`) + a new `DemoOrder` type exported from `track-client.tsx`.
  - **Set 18 (2026-06-06) — Rebrand: InstaShop → SAWPD**
    - User-picked name: **SAWPD** (5-letter Gen Z-coded brand, no vowels, 4 consonants + 1 vowel dropped).
    - **Brand mark.** Marketing header, admin sidebar, admin mobile header all updated from "IS" to a single "S" badge in the ink-square (more minimal, works at small sizes).
    - **All user-facing copy swept** for the prior name: marketing hero, comparison table, founder note, testimonials, FAQ (including the public URL `instashop.shop/s/your-handle` → `sawpd.shop/s/your-handle`), footer copyright, customer storefront footer ("Powered by SAWPD" / "Made with SAWPD"), admin stores page, applicant copy in the apply form, dashboard onboarding banner, notify templates (trial-end email + newsletter signup), checkout UPI txn note (`SAWPD order from {slug}`), track page title, shop directory title, store detail page title, apply page title.
    - **Tech keys/cookies renamed** (clean break, no migration): `instashop_admin` cookie → `sawpd_admin` (lib/admin-auth.ts); `instashop-cart` localStorage key → `sawpd-cart` (store/cart-store.ts); `instashop.applyDraft.v1` → `sawpd.applyDraft.v1` (apply-form.tsx).
    - **package.json** `"name": "sawpd"`.
    - **MIND.md / PLAN.md** updated headers and a leading rebrand note; historical change-log entries preserve the prior name as project history.
    - **Not changed**: store slug (`/s/riya`, `/s/kabir`), file paths, type/variable names, data files, dev port. Seller-facing strings that mention "your shop" / "this shop" / "the shop" all stay generic.

- **Set 19A (2026-06-07) — UI fixes: brand + security + favicon**
  - **Security: removed `ADMIN_SECRET` env var name from `/admin/login`.** Was rendered as a `<code>` chip on the login page — leaked the env var name to anyone hitting `/admin/login`. Replaced with "Enter the admin password to continue." (src/app/admin/login/page.tsx:23-25).
  - **Rebrand regression caught: 3 brand marks still said "IS" instead of "S".** The original Set 18 sweep missed `/shops` (src/app/shops/page.tsx:23-25), `/apply` (src/app/apply/layout.tsx:13-15), and the marketing footer (src/components/landing/marketing-footer.tsx:11-13). All swapped to "S" and verified via curl + screenshot. The 2 places that were correctly updated in Set 18 (`marketing-header.tsx`, `admin-shell.tsx`) were untouched.
  - **Favicon added.** New `src/app/icon.png` (64×64, ink-square + white "S", rendered via `scripts/make-favicon.mjs` using Puppeteer + system Chrome). Next.js auto-injects `<link rel="icon" href="/icon.png?...">`. `public/favicon.ico` (32×32, generated from icon.png via `sips`) is a legacy fallback for older browsers. Both return 200. Was previously a 404 on every page.
  - **UI audit infrastructure.** New `scripts/ui-crawl.mjs` crawls all 19 routes (public + admin + dashboard), captures console errors, network failures, broken images, missing alt text, horizontal overflow, page titles, meta descriptions, and saves full-page screenshots to `/tmp/sawpd-ui-shots/`. New `scripts/ui-deep-dive.mjs` does scroll-to-trigger and interaction tests (e.g. hovers a product card, counts shops, rechecks admin login for the env var leak). Both are reusable for future audits.
  - `pnpm typecheck` + `pnpm lint` both pass.

- **Set 19B (2026-06-07) — Per-page metadata**
  - 7 pages were missing per-page metadata and fell through to the marketing default ("SAWPD — The shop in your bio"):
    - `/apply` (no metadata)
    - `/s/[slug]/checkout` (no metadata; uses `generateMetadata` to read the store name)
    - `/dashboard/promotions` (no metadata)
    - `/dashboard/customers` (no metadata)
    - `/dashboard/orders/[id]` (no metadata; uses `generateMetadata` with the order id)
    - `/dashboard/returns` (had title, no description)
    - `/admin/stores/[slug]` (had a static title, no description; switched to `generateMetadata`)
  - All 7 now have a unique, contextual `<title>` and a `<meta description>`. Dynamic pages use `generateMetadata` (no extra data calls — same store/order lookups the page already does).
  - Verified via curl: 7/7 pages serve the expected title and description.
  - `pnpm typecheck` + `pnpm lint` both pass.

- **Set 19C (2026-06-07) — Visual bugs**
  - **Storefront hero overflow on `/s/riya`**: "Handpicked." (10 chars) at `display-xl` (max 120px) was clipping the right edge of the col-span-7 (720px) on the landing grid. Switched the storefront hero h1 from `display-xl` to `display-l` (max 72px). The marketing hero keeps `display-xl` (its headlines are longer per line, no overflow). Verified: H1 scrollWidth 595 < parent 626.
  - **Image diversity on landing**: same Unsplash photo `photo-1483985988355-763728e1935b` was being used in 3 places — Riya's store hero (data/store.json), the testimonials section background, and (as a side effect) the featured-shops card on `/`. The UI audit flagged the featured-shops card as showing a "broken" image. Investigation: the next/image proxy returns 200 (verified via curl with 58KB WebP), but headless Chromium never completes the decode (stays at `complete: false`, `naturalWidth: 0`). The image works as a CSS `background-image` (testimonials) but not as an `<img>` (featured-shops) — a Chromium decoder quirk. Replaced with two different verified-working photos: `photo-1490481651871-ab68de25d43d` for Riya's store hero (clothing rack), and `photo-1469334031218-e382a71b716b` for the testimonials background (creator portrait).
  - `data/store.json` is gitignored (local dev state only) — the image change is on the local file system but won't be in the GitHub repo. The repo is in sync; production data lives wherever SAWPD is deployed.
  - The UI audit's "1 broken image" report is a false positive caused by lazy-loaded `next/image` + the audit's `fullPage: true` screenshot (which doesn't always trigger lazy load). After explicit scroll, the image loads (`naturalWidth: 360, complete: true`). Not a real broken image — the audit just catches anything below the fold. Documented for future audits.
  - `pnpm typecheck` + `pnpm lint` both pass. Fresh screenshots at `/tmp/sawpd-ui-shots/setC-{riya-hero,landing-shops,landing-testimonials}.png`.

- **Set 19D (2026-06-07) — UX polish**
  - **`/shops` "Coming soon" treatment** (`src/app/shops/page.tsx`): previously filtered out stores with `productCount === 0` (Earthen/Kabir), so users only saw Riya. Now renders all stores, with a "Live" section (clickable cards with full-color hero, status badge, "Visit shop" CTA) and a "Coming soon" section (grayscale image, "COMING SOON" overlay, dashed border, "Follow on Instagram" link). The "Coming soon" divider uses the existing `hairline` + `eyebrow-ink` pattern.
  - **Settings → Hero image URL helper** (`src/components/dashboard/settings-form.tsx`): added a hint "Use a 4:5 or 5:4 portrait photo (1200×1600 or larger). Try Unsplash, your own CDN, or a product shot." Plus a live `HeroImagePreview` component that shows a 64×80 thumbnail of the current URL with "Preview · saved on submit" label. Uses `watch` to update as the user types; hides on invalid URLs, shows "No image" placeholder for empty values.
  - **Customers page LTV column** (`src/components/dashboard/customers-client.tsx:144-149`): added `tabular-nums` to the value (rupee amounts now align column-wise), `mt-0.5` + `text-[10.5px]` + `tracking-[0.1em]` + `text-ink/45` on the LTV label (slightly larger, more breathing room, slightly less faded). Was: 10px, no top margin, no tabular-nums.
  - `pnpm typecheck` + `pnpm lint` both pass. Verified via screenshots: `setD-shops-full.png` shows both Riya and Earthen sections; `setD-settings.png` shows the live preview; `setD-customers-after.png` shows the cleaner LTV column.

- **Set 19E (2026-06-07) — A11y/perf: product card animation safety net**
  - The storefront product cards used `whileInView` with `initial: { opacity: 0, y: 24 }`, so the cards were permanently invisible for headless scrapers, `prefers-reduced-motion: reduce` users, and slow scrollers.
  - **Fix in `src/components/storefront/product-card.tsx`**:
    1. `useReducedMotion()` from framer-motion — if true, render a plain `<div className="group">` with no motion props.
    2. A 1.5s safety-net timer — if `whileInView` hasn't fired by then, swap to the plain `<div>` so the card is never stuck invisible.
    3. A `mounted` flag — the swap only happens post-hydration to avoid SSR/client mismatch (the server renders motion.div because `useReducedMotion()` returns `null` in Node, but the client would otherwise swap to plain div immediately).
  - Refactored the card body into a `renderCard({...})` helper so both the animated and static branches share the exact same inner content.
  - `pnpm typecheck` + `pnpm lint` both pass. Verified via Puppeteer probe: normal motion t=0 → 7 animated/2 visible, t=2s → 0 animated/9 visible; reduced motion t=2s → 0 animated/9 visible. No hydration warnings on either path. Screenshot at `/tmp/sawpd-ui-shots/setE-products.png` shows the grid renders cleanly.

## 9. Open questions / future decisions

- **Email provider**: Resend recommended. Swap point: `lib/notify.ts#deliver()`.
- **Payment gateway**: Razorpay recommended for India. Swap point: `lib/store.ts#activatePlanMock`.
- **Image storage**: Local (`public/uploads/`) is MVP. For prod, swap to Supabase Storage / S3.
- **Per-seller auth**: Pending (see Next set, item 2).

---

**Editing this file:** Keep it terse. Use the **Change log** for new entries.
Reorder the **Next set** list as priorities change. Don't duplicate info that
lives in the code — link to files instead.
