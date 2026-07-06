# SAWPD — Platform Documentation & Pitch Deck

> **The shop in your bio.**
> A storefront platform built for Instagram creators in India.

---

## 1. What Is SAWPD?

SAWPD is a **multi-tenant storefront platform** that turns an Instagram creator's bio link into a fully functional online shop. Customers browse products, pay via UPI (QR code + screenshot), and the seller verifies payment and ships. SAWPD charges a flat subscription — the seller keeps **100% of every sale**.

### The Problem We Solve

| Pain Point | Impact |
|---|---|
| Instagram creators sell via DMs | 5-10 hours/week lost to manual order-taking |
| No native checkout on Instagram | Customers bounce, orders fall through cracks |
| Payment gateways charge 2-3% + ₹2-3/transaction | Small sellers lose ₹10,000s/year in fees |
| Payment gateways have T+2 settlement | Cash flow pain for small businesses |
| Shopify is overkill for 50-product shops | ₹2,000+/month + app ecosystem complexity |
| linktr.ee has no commerce | Just links — no products, no cart, no checkout |
| Selar takes commission on every sale | 5-10% cut on every transaction |

### Our Solution

A **beautiful, mobile-first storefront** at `sawpd.shop/s/your-handle` that:
- Lets customers browse products, add to cart, and check out in under 2 minutes
- Accepts UPI payments directly (no gateway, no settlement delay)
- Auto-generates QR codes for instant payment
- Verifies payment screenshots with auto-check + manual review
- Tracks orders end-to-end (pending → verifying → verified → shipped → delivered)
- Supports custom orders (configurable products with dynamic pricing)
- Handles returns with seller-defined policies

---

## 2. Platform Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 3, Framer Motion |
| State | Zustand (client), Server Components (server) |
| Forms | react-hook-form + Zod validation |
| Database | Supabase PostgreSQL (10 tables, RLS, foreign keys) |
| Storage | Supabase Storage (product images, hero images) |
| Auth | Cookie-based (HMAC-SHA256 signed), bcrypt passwords |
| Email | Resend API (graceful fallback to console.log) |
| Payments | UPI direct (QR code generation via `qrcode` library) |
| Security | Rate limiting, brute-force protection, CSP, HSTS, input sanitization |
| Language | TypeScript (strict mode) |

### Database Schema (10 tables)

```
sellers          →  Seller accounts (id, email, password_hash)
stores           →  Store profiles (name, slug, upiId, hero, returns policy)
products         →  Product catalog (title, price, stock, images, status)
orders           →  Customer orders (items, status, screenshots, tracking)
promos           →  Discount codes (type, value, limits, schedule)
applications     →  Creator applications (status, review notes, trial dates)
returns          →  Return requests (status, refund amount, decision notes)
billing          →  Subscription records (plan, amount, renewal dates)
subscribers      →  Newsletter subscribers
audit_log        →  Admin action audit trail
```

### Multi-Tenancy Model

- Each seller gets a unique slug (`/s/riya`, `/s/kabir`)
- Store isolation: cart clears when switching between stores
- `generateStaticParams` pre-builds all known slugs at deploy time
- Ownership checks on every mutation (`assertOwnsStore`)
- Admin can suspend/reactivate any store

---

## 3. Customer Experience (What Buyers See)

### Storefront (`/s/[slug]`)

**Editorial, not e-commerce.** The storefront reads like a magazine, not a catalog:

- **Hero section**: Full-width parallax image with headline, kicker text, and Ken Burns animation on mobile
- **Product grid**: Responsive 2/3/4-column layout with staggered fade-up animations
- **Search + filters**: Full-text search (title/tagline/altText) + tag pills (All/New/Limited/Sale) with counts
- **Stock urgency**: "Only 3 left" pulsing badge on low-stock products
- **Sold ticker**: "12 pieces sold in the last 7 days" social proof in footer
- **No navigation chrome**: Single scrollable page — hero → products → footer

### Product Cards

- Hover-to-reveal quick-add button (haptic feedback on mobile)
- Badges: "New" (bone), "Limited" (vermillion), "Only X left" (pulsing)
- Sold-out overlay with blurred image and strikethrough
- Click anywhere → opens bottom-sheet product detail

### Product Detail (Bottom Sheet)

- Image gallery with swipe (mobile) + arrow keys (desktop)
- Thumbnail strip for quick navigation
- Quantity selector capped at available stock
- Stock warnings: "Only X left", "You already have N in your bag", "Max stock reached"
- "Add to bag — ₹X" with total price

### Cart (Bottom Sheet)

- Slide-up drawer (not a page)
- Line items with image, title, price, quantity controls
- Cross-store guard: auto-clears when switching stores
- Subtotal, shipping note, total, "Checkout — ₹X" CTA
- Fine print: "Pay via UPI — Owner verifies your screenshot"

### Checkout (Two-Step)

**Step 1 — Pay via UPI:**
- Auto-generated UPI payment link with store name + total
- QR code rendered client-side (bone/dark colors)
- Copyable UPI ID with one-click copy button
- Promo code input with live discount calculation

**Step 2 — Your details:**
- Name, phone, email (optional), shipping address
- Address remembered via cookie (1-year expiry, no account needed)
- Payment screenshot upload (drag/drop or tap, JPEG/PNG/WebP/GIF, 4KB-8MB)
- Auto-validates: MIME type, file size, magic bytes
- Order summary sidebar with line items, discount, total

**Post-Order:**
- Confirmation screen with order ID + "Track this order" link
- "Chat on WhatsApp" button (green, pre-filled message) or "DM on Instagram"
- Cart cleared, browser history replaced (back → shop, not empty checkout)

### Order Tracking (`/track`)

- Enter order ID + last 7 digits of phone (no login required)
- **Status timeline** with 5 stages:
  1. Awaiting payment → 2. Verifying → 3. Verified → 4. Shipped → 5. Delivered
- Current stage highlighted in vermillion
- Cancelled orders show dedicated state
- Order items list with promo discount breakdown
- Returns card (eligible orders only)
- Contact CTA (WhatsApp or Instagram)

### Custom Orders (`/s/[slug]/custom`)

**A first-class feature for configurable products** (bouquets, cakes, gift boxes, jewelry):

- **Template browsing**: Cards with image, name, description, base price, option count
- **Dynamic form rendering** based on seller-defined templates:
  - Single-select (radio cards with +₹X price adder)
  - Multi-select (checkbox cards with +₹X per option)
  - Number input (stepper, 1-20)
  - Text input (textarea)
  - Date picker
- **Live price calculator**: Base + options × quantity = grand total (recalculates on every selection)
- **Reference image upload**: Optional drag/drop for design references (max 5MB)
- **Special instructions**: Free-text textarea
- **Preferred date**: Optional date picker
- **Customer details**: Name, phone, email
- **Submission**: Creates order with status `pending`, seller reviews and accepts/rejects

---

## 4. Seller Experience (What Creators Get)

### Onboarding Flow

1. **Apply** (`/apply`): 4-step wizard (You → Shop → Sales → Why) with progress bar, draft persistence, CAPTCHA
2. **Account creation**: Email + password with strength validation
3. **Admin review**: Real person reviews within 24 hours
4. **Approval**: Store auto-provisioned, 14-day free trial activated
5. **Dashboard onboarding**: 4-step checklist (add product, set UPI, write hero, add promo)

### Seller Dashboard (`/dashboard`)

**Overview:**
- Greeting + "View shop" link
- Trial/plan banner with countdown
- Revenue stat cards (total, verify queue, awaiting payment, products)
- 30-day revenue sparkline with week-over-week delta
- Low-stock alerts with "Check Inventory" button
- Recent orders list

**Orders (`/dashboard/orders`):**
- Status tabs: All, Verify, Awaiting, Verified, Shipped, Completed (with counts)
- Paginated list (10/page) with product images, customer info, status badges
- CSV export
- Order detail page with:
  - Customer info (name, phone, email, WhatsApp link)
  - Items with images, quantities, prices
  - Payment screenshot with auto-check results
  - Action panel: Verify payment → Mark shipped (with tracking note) → Mark delivered
  - Request resend (for missing screenshots)
  - Cancel order
  - Returns panel with inline approve/reject

**Products (`/dashboard/products`):**
- Grid with live/draft/archived sections
- CRUD with multi-image upload (drag/drop, clipboard paste, drag-to-reorder)
- Fields: title, tagline, price, stock, alt text, tags (New/Limited/Sold-out), status
- Save as Draft or Publish
- Delete blocked if pending orders exist

**Promotions (`/dashboard/promotions`):**
- State machine: Active → Paused → Scheduled → Expired → Exhausted
- Two types: percentage or fixed amount
- Min order amount, usage limits, date scheduling
- Random code generation

**Customers (`/dashboard/customers`):**
- Aggregated from orders (one row per phone)
- Stats: total customers, repeat buyers, average LTV, total revenue
- Search by name/phone/email
- CSV export

**Returns (`/dashboard/returns`):**
- Inbox with stat chips (pending/approved/refunded/rejected)
- Per-order returns panel with inline decision form
- Policy management in Settings

**Settings (`/dashboard/settings`):**
- Plan picker (Pay-as-you-go ₹499/wk or Monthly ₹1,499/mo)
- Store profile (name, Instagram handle, WhatsApp number)
- Payments (UPI ID, notification email, UPI QR image)
- Hero section (kicker, headline, sub text, hero image)
- Returns policy (toggle, window days, mode, policy text)

### Custom Order Management

**Template Builder:**
- Drag-and-drop form builder
- 5 field types: dropdown, checkboxes, number, text, date
- Per-option price add-ons
- Preview mode with live price calculator
- Toggle templates active/inactive

**Custom Orders Inbox:**
- Status tabs: All, Pending, Awaiting Payment, Confirmed, Fulfilled, Rejected
- Per-order detail with accept/reject/fulfill actions
- Seller notes on each decision

### Subscription Plans

| Plan | Price | Features |
|---|---|---|
| Free Trial | ₹0 (14 days) | Full storefront, unlimited products, UPI payments |
| Pay-as-you-go | ₹499/week | Cancel any week, concierge onboarding |
| Monthly | ₹1,499/month | Everything + custom URL, priority support, CSV exports |

**Key message**: "We're in early access — pick a plan to unlock order taking. No card, no payment collected yet."

---

## 5. Admin Capabilities

### Application Review

- **Pipeline**: Pending → Approved/Rejected (with reviewer note)
- **Details**: Follower count, sales volume, AOV, top products, niche, motivation
- **Approval**: Auto-provisions store, activates 14-day trial
- **Race condition protection**: Conditional DB update prevents double-approval

### Store Management

- **Directory**: All stores with order/product counts, plan labels, status
- **Per-store override**:
  - Suspend/Reactivate (with optional reason)
  - Plan override (weekly/monthly/none)
  - Force low-stock notification
  - Email applicant (manual outreach)
  - Delete store (danger zone, requires typing "DELETE")

### Audit Trail

11 event types tracked: login/logout, application decided/emailed, store suspended/reactivated/deleted, plan changed, return requested/decided

### Notifications (9 types)

| Event | Recipient |
|---|---|
| Application received | Admin |
| Application decided | Applicant |
| Order placed | Store owner + Admin |
| Order status changed | Store owner |
| Trial ending | Store owner |
| Low stock | Store owner |
| Subscriber added | Admin |
| Manual admin email | Applicant |

---

## 6. Competitive Landscape

### Direct Competitors

| Platform | Model | Commission | UPI Native | Mobile-First | Hand-Reviewed | Custom Orders |
|---|---|---|---|---|---|---|
| **SAWPD** | Flat subscription | **0%** | **Yes** | **Yes** | **Yes** | **Yes** |
| Shopify Lite | Monthly fee | 2% txn fee | Partial | Partial | No | No |
| linktr.ee | Freemium | N/A | No | Yes | No | No |
| Selar | Free + commission | 5-10% | Partial | Partial | No | No |
| Instamojo | Free + commission | 2% + ₹3 | Yes | Partial | No | No |
| WooCommerce | Self-hosted | Gateway fees | Via plugin | Partial | No | Via plugin |

### Why SAWPD Wins

1. **Zero commission**: Sellers keep 100% of every sale. Period.
2. **Native UPI**: QR code generation, screenshot verification, no gateway delays.
3. **Mobile-first checkout**: Bottom-sheet cart, haptic feedback, swipe galleries.
4. **Hand-reviewed creators**: Every shop approved by a real person. Builds trust.
5. **Custom orders**: First-class template engine with dynamic pricing. No competitor offers this.
6. **Instagram-native**: Designed for sellers whose primary channel is Instagram DMs.
7. **Editorial UX**: Storefronts look like magazines, not catalogs. Premium feel.
8. **Made for India**: INR-only, UPI-first, Hindi + English,₹499 entry point.

### Market Positioning

```
                    High Commission
                         |
          Selar •        |        • Shopify Lite
                         |
    Simple ——————————————+———————————————— Complex
                         |
        linktr.ee •      |      • WooCommerce
                         |
                    Zero Commission
                         |
                    • SAWPD (here)
```

SAWPD occupies the **simple + zero commission** quadrant — the sweet spot for Instagram creators who want to sell without losing margin or dealing with complexity.

---

## 7. Revenue Model

### Primary Revenue: Subscriptions

| Stream | Price | Target |
|---|---|---|
| Pay-as-you-go | ₹499/week | New sellers testing the platform |
| Monthly | ₹1,499/month | Established sellers (save 25%) |

### Unit Economics (Projected)

| Metric | Conservative | Optimistic |
|---|---|---|
| Monthly subscribers | 500 | 5,000 |
| Average plan | ₹1,000/mo | ₹1,200/mo |
| MRR | ₹5,00,000 | ₹60,00,000 |
| ARR | ₹60,00,000 | ₹7,20,00,000 |
| Churn rate | 15%/mo | 8%/mo |
| LTV per seller | ₹6,667 | ₹15,000 |

### Future Revenue Streams

| Stream | Timeline | Description |
|---|---|---|
| Payment gateway integration | v1.1 | Razorpay/Stripe integration (2% txn fee as rev share) |
| Custom domain upsell | v1.1 | Premium tier for `shop.yourbrand.com` |
| Analytics premium | v2.0 | Advanced dashboards, cohort analysis, conversion tracking |
| Shipping integration | v2.0 | Shiprocket/Delhivery API (rev share on labels) |
| Marketplace commission | v2.0 | Optional marketplace mode (5% commission, opt-in) |
| White-label | v3.0 | Agency/reseller tier for managing multiple creators |

---

## 8. Key Metrics & KPIs

### North Star Metric
**Monthly Active Sellers (MAS)** — sellers who processed at least 1 order in the last 30 days.

### Supporting Metrics

| Category | Metric | Target |
|---|---|---|
| **Growth** | Applications/week | 50+ |
| **Growth** | Approval rate | 60-70% |
| **Activation** | Time to first product | < 24 hours |
| **Activation** | Onboarding completion | > 80% |
| **Revenue** | MRR | ₹50L+ by Month 12 |
| **Revenue** | ARPU | ₹1,200/mo |
| **Retention** | 30-day retention | > 70% |
| **Retention** | Trial → paid conversion | > 30% |
| **Engagement** | Orders/seller/month | 15+ |
| **Engagement** | Avg order value | ₹800+ |
| **NPS** | Seller NPS | > 50 |
| **Support** | First response time | < 4 hours |

---

## 9. Go-To-Market Strategy

### Phase 1: Seed (Months 1-3)
- **Target**: 50 Instagram sellers in fashion/beauty/jewelry niches
- **Channel**: Direct outreach to creators with 5K-50K followers
- **Offer**: Free 14-day trial + concierge onboarding
- **Goal**: 20 active paying sellers, ₹1L MRR

### Phase 2: Grow (Months 4-8)
- **Target**: 500 sellers across 10 niches
- **Channel**: Instagram ads, creator partnerships, word-of-mouth
- **Offer**: Referral program (1 week free for referrer + referee)
- **Goal**: 200 active paying sellers, ₹10L MRR

### Phase 3: Scale (Months 9-12)
- **Target**: 2,000+ sellers
- **Channel**: Content marketing, SEO, influencer partnerships
- **Offer**: Custom domain tier, shipping integration
- **Goal**: 1,000 active paying sellers, ₹50L MRR

### Distribution Channels

1. **Instagram DM outreach** to creators with "shop in bio" problems
2. **Creator partnerships** (sponsored stories from early adopters)
3. **Word-of-mouth** (referral incentives)
4. **Content marketing** (blog: "How I got 50 orders in one week on SAWPD")
5. **SEO** (landing pages for "Instagram shop India", "UPI store", etc.)
6. **WhatsApp groups** for seller communities

---

## 10. Technical Differentiators

### Security

- Rate limiting on all public endpoints (sliding window)
- Brute-force protection on logins (5 failures → 15 min lock)
- CSP + HSTS + X-Frame-Options + nosniff headers
- Input sanitization (HTML entity escaping, control character stripping)
- Password strength validation (rejects common/weak passwords)
- Email enumeration prevention (generic error messages)
- Admin auth checks on all server actions
- CAPTCHA scaffolded (Cloudflare Turnstile)

### Performance

- Next.js App Router with Server Components (minimal client JS)
- Static generation for storefront pages (`generateStaticParams`)
- Image optimization via `next/image` + Supabase CDN
- Client-side cart with localStorage persistence
- Debounced search (300ms) to prevent excessive rerenders
- Staggered animations with `prefers-reduced-motion` support

### Data Integrity

- Supabase RLS policies for row-level security
- Conditional updates for race condition prevention
- Atomic promo code usage increments
- Ownership checks on every mutation
- Zod validation on all inputs
- Magic byte verification on file uploads

### Developer Experience

- TypeScript strict mode
- `pnpm typecheck` + `pnpm lint` both pass
- Server actions return tagged unions (`{ ok: true } | { ok: false, error }`)
- `revalidatePath` on every mutation
- Consistent error handling across all surfaces

---

## 11. Feature Roadmap

### Shipped (v1.0)
- [x] Multi-tenant storefront with editorial UX
- [x] UPI QR checkout with screenshot verification
- [x] Product CRUD with multi-image upload
- [x] Promo/coupon system
- [x] Order tracking with status timeline
- [x] Returns management
- [x] Custom order templates with dynamic pricing
- [x] Seller dashboard with analytics
- [x] Admin panel with application review
- [x] Store suspension/reactivation
- [x] Audit trail
- [x] Email notifications (Resend)
- [x] Supabase PostgreSQL + Storage
- [x] Security hardening (rate limiting, brute-force, CSP, HSTS)

### Next (v1.1)
- [ ] Cloudflare Turnstile CAPTCHA configuration
- [ ] Razorpay payment gateway integration
- [ ] Phone OTP for customers
- [ ] Vitest test suite
- [ ] Rate limiter persistence (Upstash Redis)

### Future (v2.0+)
- [ ] Abandoned cart recovery
- [ ] Product variants/SKU support
- [ ] Shipping integration (Shiprocket/Delhivery)
- [ ] Advanced analytics dashboard
- [ ] WhatsApp Business API integration
- [ ] Multi-language support (Hindi)
- [ ] PWA / mobile app
- [ ] Marketplace mode
- [ ] White-label / agency tier

---

## 12. Risk Analysis

| Risk | Mitigation |
|---|---|
| Payment fraud (fake screenshots) | Auto-check (MIME/size) + manual review. Future: OCR amount verification. |
| Seller non-fulfillment | No mediation policy. Customer resolves via DM. Platform reputation at stake. |
| Low trial → paid conversion | Concierge onboarding, 14-day free trial, low entry price (₹499/wk). |
| Competition from Shopify/Instagram | Differentiation: zero commission, UPI-native, custom orders, hand-reviewed. |
| Scalability (in-memory rate limiter) | Plan: swap to Upstash Redis when scaling to multiple instances. |
| Email deliverability | Resend with domain verification. Fallback to console.log in dev. |
| Data loss | Supabase backups, RLS policies, soft deletes where possible. |

---

## 13. Summary

**SAWPD is the simplest way for Instagram creators in India to start selling online.**

- **For creators**: A beautiful shop in your bio. Zero commission. UPI-native. Set up in 10 minutes.
- **For customers**: Browse, pay via UPI, track delivery. No accounts needed. Under 2 minutes.
- **For us**: Flat subscription revenue. Low churn. High LTV. Massive TAM (50M+ Instagram sellers in India).

**The shop in your bio. The hours back in your week.**

---

*Document generated from SAWPD codebase analysis. Last updated: June 2026.*
