# SAWPD — Product & Brand Plan

> **Rebrand 2026-06-06:** Project renamed from "InstaShop" to **SAWPD**.

> Living document. Bump sets to "In progress" → "Done" as we ship. Don't
> duplicate MIND.md; that's the persistent session log. This is the *roadmap*.

## 0. Current state (audit)

**What we have (verified working):**
- Marketing landing: hero (text-only, no visual), how-it-works (3 steps), what-we-verify, pricing (3 plans), FAQ, final-CTA, sticky header, footer.
- Apply form (5 sections, ~14 fields, no progress indicator, no auto-save).
- Storefront: hero, product grid with `?tag=new|limited|sale` filter, product detail sheet, cart sheet, UPI checkout, order tracking, "Shop paused" banner, empty-state CTA.
- Dashboard: overview (revenue cards + recent), orders (paginated, status tabs, resend, screenshot auto-check), customers (CSV, client-paged), products (CRUD, multi-image, drag-reorder), promotions (CRUD with state chips), settings (plan picker + identity + payments + hero).
- Admin: login, overview, applications (with date filter Set 7), per-application review, stores directory (count summary).
- Multi-tenant: 2 stores seeded, `generateStaticParams` enumerated.
- Subsystems: notifications (file-log stub), trial state, plans, payment screenshot check, billing ledger, signed-cookie auth.

**Critical bug found during this audit:**
- `src/components/landing/pricing.tsx` shows **₹249/wk and ₹799/mo**, but `src/lib/plans.ts` actually charges **₹499/wk and ₹1499/mo** and writes receipts at those values. Mismatched marketing → product. Must be fixed in Set 1 below.

---

## 1. Visual / look-and-feel gaps (the landing page)

The current landing page is honest but visually flat. No hero visual, no social proof, no live data, no storytelling beyond 3 short sections. To compete with linktr.ee / Shopify Lite / Selar, we need:

| Gap | Why it hurts |
|---|---|
| No hero visual | All text — visitors can't *see* what the product looks like on a phone. |
| No social proof (logos / creator photos / quotes) | High-friction purchase decision with no validation. |
| No stats counter | "10,000 orders processed, ₹40L paid out" would land hard. |
| No "featured shops" carousel | The product *is* the shops. Show them. |
| No "why SAWPD vs alternatives" section | Every visitor is comparing to Shopify / linktr.ee / Selar / Woo. |
| No founder story / "made for India" narrative | Trust signal. |
| No video / walkthrough | Demo > text. |
| No newsletter / "get updates" capture | No way to follow up with non-applicants. |
| No blog / changelog | Can't compound SEO. |
| No "trust badges" / payment logos | UPI / RBI / etc on landing. |
| Pricing mismatch (₹249/₹799 vs real ₹499/₹1499) | Legal / trust risk. |
| Footer is sparse | One tagline + 2 nav columns. |
| No terms / privacy / about pages | Application may be rejected by serious creators. |
| No light/dark mode (institutional choice) | Optional, but increases time-on-page. |

---

## 2. Functional gaps (across the product)

### Storefront (`/s/[slug]`)
- No product search box (only tag filter).
- No size / variant / SKU support.
- No "only N left" stock urgency.
- No estimated delivery date / shipping estimator.
- No wishlist.
- No product reviews.
- No "X people bought this today" social proof ticker.
- No Instagram feed embed or "follow me" block.
- No order-lookup shortcut from storefront.

### Checkout
- Single-step form (very long). No step indicator.
- No COD option (not all customers trust UPI).
- No save-address-for-next-time (cookie exists but UX is invisible).
- No "save my details" returning-customer detection.

### Dashboard
- No revenue / sales chart (sparkline or area chart).
- No inventory alerts / low-stock emails.
- No product variants in CRUD.
- No SEO settings (meta title/description for the storefront).
- No draft / scheduled products.
- No order internal notes (only customer-facing status).
- No bulk actions on orders.
- No refund / partial-refund flow.
- No way to message customer post-order (no in-app messaging).
- No accounting / GST export (CSV exists, but not accounting-formatted).
- No abandoned-cart recovery (this is the #1 revenue leak for indie sellers).
- No webhook to Shiprocket / Delhivery.

### Admin
- No per-store override (suspend, refund, plan-change).
- No email-the-applicant feature.
- No public-facing stores directory (only admin sees it).
- No per-store analytics.
- No payment-overrides for trials.
- No co-admin / staff seats.

### Application
- One long form, no progress bar, no section nav, no auto-save.
- No email confirmation ("we got your application").
- No login for applicants to track status.
- No file upload (portfolio / IG profile pic) — only text.

### Cross-cutting
- No notifications inbox (admin/seller can't read the JSONL log).
- No in-app support widget / contact form.
- No API for headless use.
- No audit log of admin actions.
- No webhooks out.
- No rate limiting on public forms.

---

## 3. The plan — prioritised, shippable sets

Each set is a 1–3 day deliverable. After each: typecheck + lint + smoke + MIND update.

### Set 8 — Pricing honesty + landing visual (start here, ~1 day)
The cheapest way to "make the landing page not feel simple" is a phone mockup + honest numbers.

1. **Fix the pricing mismatch.** Decide on a price and use it everywhere: `lib/plans.ts` (single source of truth), pricing card, hero micro-copy, "From ₹X" CTA. Update `data/store.json` to be consistent.
2. **Add a phone mockup component** to the hero — fake phone showing a real `/s/riya` screenshot (use a real product image + overlay frame). Use CSS only, no asset needed.
3. **Add a "stats strip" below the hero** — "10,000+ orders · ₹40L+ paid out · 200+ active shops" (use real numbers once available; use honest seed numbers until then).
4. **Tighten copy** — current "Try it free. Pay only when you sell." is a bit weak.

### Set 9 — Social proof + featured shops (~1 day)
1. **Testimonials section** — 3–4 short quotes from seeded creators (use `data/store.json` + `data/applications.json` to fabricate realistic quotes by niche). Card layout with avatar, name, niche, quote, link to their shop.
2. **"As seen in" logo wall** — "Inc42 · YourStory · Instagram India" etc. Use text logos in the brand style, no external assets.
3. **Featured shops carousel** — horizontal scroll of shop cards. Click → their live shop. Reads from `listStoreSummaries`.

### Set 10 — Marketing infrastructure (~1 day)
1. **Public `/shops` directory** — lists all active shops with their niche, product count, and a "Visit" button. Great for SEO + "see it before you sign up".
2. **Newsletter capture** — small inline form on the marketing page + footer. Stubs to a `subscribeEmail()` server action that writes to `data/subscribers.json` and fires a notification.
3. **Footer expansion** — Product / Company / Resources / Legal columns. Real links.
4. **Trust strip** — small row of badges "UPI payments · 100% of every sale · Hand-reviewed · Made in India".

### Set 11 — Comparison + narrative (~½ day)
1. **"Why SAWPD" comparison table** — SAWPD vs Shopify Lite vs linktr.ee vs Selar. Columns: per-sale commission, subscription model, UPI support, ownership, custom domain. Single eyebrow of self-confidence.
2. **"Made for India" founder section** — short blurb + photo placeholder + 2 facts ("200+ creators in 14 cities", "₹499 to start").

### Set 12 — Storefront enhancements (~1 day)
1. **Stock urgency chip** — "Only 2 left" when `stockCount <= 5`. Surface on product card and detail sheet.
2. **Search box** on the storefront — filters product grid by title/tagline/altText.
3. **"Recently sold" ticker** — small footer line "5 of these sold this week" using order data.

### Set 13 — Application flow polish (~½ day)
1. **Multi-step apply form with progress bar** — split into 4 steps (You / Shop / Sales / Why), save draft to localStorage between steps, server submit at the end. Mobile-friendly.
2. **Email confirmation** — when an application is submitted, fire a notification AND show an in-page "Check your email" message (even though email is stubbed, the surface is there for the real provider swap).

### Set 14 — Dashboard analytics + inventory alerts (~1 day)
1. **Revenue sparkline** on overview — last 30 days, by status. Pure SVG, no chart lib.
2. **Low-stock alert banner** — "3 products below 5 in stock" with quick link.
3. **Inventory email** — fire `notifyLowStock` when a product dips below threshold (during `placeOrder` decrement, or via a manual check).

### Set 15 — Admin polish (~1 day)
1. **Per-store override page** — `/admin/stores/[slug]` with suspend/reactivate, plan change, view orders, view revenue.
2. **Email-the-applicant** — quick action on the application detail page; reuses the notify stub.
3. **Audit log** — write to `data/audit.log` on admin actions (login, decide, plan-change).

> **Status**: ✅ done 2026-06-06. Audit log writes on login/logout/decide/suspend/reactivate/plan-change/email/force-low-stock. Suspended stores short-circuit `getTrialState` so they go read-only everywhere automatically. `Store` type gained `paused?` / `pausedReason?`. Per-store override page lives at `/admin/stores/[slug]`. Email-the-applicant is a collapsible form on the per-store page (matched by `notifyEmail` ↔ `application.email`). Recent activity on `/admin` shows the last 8 audit events.

### Set 16 — Onboarding + draft products (~1 day)
1. **First-time onboarding banner** in dashboard for stores with 0 products — checklist: add first product, set UPI ID, write hero copy, add a promo.
2. **Draft / scheduled products** — add `status: "draft" | "scheduled" | "live" | "archived"` to products. Hide drafts from storefront. List drafts separately in the dashboard.

> **Status**: ✅ done 2026-06-06. Onboarding banner on `/dashboard` (4 steps, progress bar, dismiss persists). Product `status` + `scheduledFor` fields. Storefront + checkout use `listLiveProductsForStore`. Products page groups live / drafts / archived. Form has a "Save as draft" button alongside Publish. Bundled with a system-wide visual refresh: new design tokens, vermillion primary buttons, subscription-only copy throughout.

### ~~Set 17 — Public + legal pages~~  →  **Set 17 (DONE 2026-06-06) — Subscription UX + Returns feature**
Re-scoped per user asks. Dropped "Public + legal pages" from the plan (deferring to Set 21+).
1. **Scrub remaining "commission" copy everywhere** — done.
2. **Reframe plan picker so subscription feels like "no payment taken yet"** — done: "Early access" chip, "no payment collected yet" copy, dropped "Test mode" / "Mock receipt" / `MOCK-` prefix (now `EA-…`).
3. **Returns feature (major)** — done: `lib/returns.ts` data layer, `Store.returnsPolicy` (enabled / windowDays / mode / policyText), `checkReturnEligibility`, `requestReturnAction` (track page), `decideReturnAction` (order detail), `updateReturnsPolicyAction` (settings). Customer surface: `track-returns-card.tsx` with disclosure form. Seller surfaces: `returns-policy-form.tsx` (settings), `order-returns-panel.tsx` (per-order), `/dashboard/returns` inbox page with stat chips. Audit log kinds: `return_requested`, `return_decided`.
4. **Confirm no customer login/signup on the front** — done. Track is order-ID + last-7 phone; checkout is a one-page form (name/phone/address). No auth surface.

### Set 18 — SEO + marketing assets (~½ day)
1. **Open Graph / Twitter Card** metadata on all public surfaces.
2. **Per-storefront SEO** — meta title, meta description, og:image in `SellerStore` + editable in dashboard settings.
3. **sitemap.xml** — enumerate `/`, `/shops`, `/s/[slug]`, `/apply`, `/track`.
4. **robots.txt** — allow public, disallow `/admin`, `/dashboard`, `/api`.

### Set 19 — Order ops (medium, ~1 day)
1. **Order notes** — internal-only `notes: string` field on `Order`. Editable from the order detail page, not visible to customer.
2. **Customer message** — quick "message customer via WhatsApp" button using `store.whatsapp` + `order.phone`.
3. **Refund / cancellation reason** — store the reason + who did it (admin vs seller vs customer).

### Set 20 — Abandoned cart recovery (large, ~2 days)
1. Persist a draft cart on the storefront (cookie or store) tied to a phone/email.
2. After 30 min of inactivity, fire a notify to the seller with a "remind the customer" link.
3. Optional: a public "complete my order" link the seller can DM.

---

## 4. Order to ship

Suggested order if you want to move fast: **8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20**.

If you only have a day, do **8 alone** — single biggest visual win + fixes the pricing bug.
If you have a week, do **8 → 9 → 10 → 11** to make the marketing page feel done.
If you have a sprint, do **8 → 12 → 14 → 16** to make the *product* feel done (not just the marketing).

## 5. Out of scope (for now)

- Real payment gateway (Razorpay). Swap point already documented.
- Real email provider. Swap point already documented.
- Per-seller auth. Pending.
- Tests. Pending.
- Multi-currency (INR-only for now).
- Mobile app / PWA install.
- Multi-language (English-only for now).
