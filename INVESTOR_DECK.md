# SAWPD — Investor Memo

> **The shop in your bio.**
> A storefront platform for Instagram creators in India.

---

## The Problem

**50 million+ Indian Instagram creators sell through DMs.** They lose 5-10 hours every week manually taking orders, chasing UPI screenshots, and managing inventory in chat threads. Existing tools don't fit:

| Tool | Why It Fails Creators |
|---|---|
| **Shopify** | ₹2,000+/mo, overkill for 50-product shops, complex setup |
| **linktr.ee** | Links only — no products, no cart, no checkout |
| **Selar / Instamojo** | 5-10% commission on every sale + settlement delays |
| **WhatsApp Commerce** | No storefront, no tracking, no analytics |
| **Instagram Shopping** | Limited to Meta catalog, no custom orders, no UPI |

**The result:** Creators either don't sell online at all, or lose margin to middlemen.

---

## The Solution

SAWPD gives every Instagram creator a **beautiful, shareable shop** at `sawpd.shop/s/your-handle` — the link in their bio becomes a checkout.

**How it works:**
1. Creator applies (5-min form, reviewed by a real person within 24h)
2. Storefront goes live with products, UPI QR, and custom order forms
3. Customer browses → adds to cart → pays via UPI → uploads screenshot
4. Creator verifies payment → ships → done

**Key differentiator:** SAWPD charges a **flat subscription**. Sellers keep **100% of every sale.** No commission. No transaction fees. No settlement delay.

---

## Market Opportunity

### Total Addressable Market

| Segment | Size | Source |
|---|---|---|
| Instagram sellers in India | 50M+ | Meta India estimates |
| Active small sellers (≥10 orders/mo) | 5-8M | Industry research |
| Addressable with current pricing | 2-3M | Sellers doing ₹10K+/mo |

### Why Now

1. **Instagram Commerce is exploding**: 70% of Indian buyers discover products on Instagram
2. **UPI adoption**: 300M+ monthly UPI transactions — the infrastructure is mature
3. **Creator economy boom**: India's creator economy projected at $25B by 2030
4. **Post-COVID shift**: Every solopreneur needs an online storefront, yesterday
5. **No dominant player**: Shopify is too complex, linktr.ee has no commerce, Selar takes commission

---

## Product

### What We've Built (v1.0 — Shipped)

A **full-stack, multi-tenant platform** with:

**Customer-facing:**
- Editorial storefront (parallax hero, product grid, search + filters)
- Bottom-sheet cart + product detail (mobile-native UX)
- UPI QR checkout with screenshot upload + auto-validation
- Order tracking (status timeline, no login required)
- Custom order templates with live price calculators
- Returns with seller-defined policies

**Seller-facing:**
- Dashboard with revenue sparkline, order management, product CRUD
- Multi-image upload (drag/drop, clipboard paste, reorder)
- Promo/coupon system with scheduling + usage limits
- Customer CRM (LTV, repeat buyers, search)
- Custom order template builder (drag-and-drop, 5 field types)
- Settings (UPI, Instagram, WhatsApp, hero image)

**Admin:**
- Application review pipeline (approve → auto-provision store → 14-day trial)
- Store suspension/reactivation with audit trail
- Manual email outreach to applicants
- 11-event audit log

**Infrastructure:**
- Supabase PostgreSQL (10 tables, RLS, foreign keys)
- Rate limiting, brute-force protection, CSP/HSTS headers
- Email notifications via Resend
- TypeScript strict mode, `pnpm typecheck` + `pnpm lint` pass

### Custom Orders (Competitive Moat)

No competitor offers this. Sellers build configurable product templates:
- Customer picks options (size, color, material, add-ons)
- Each option carries a price adder
- Total auto-calculates in real-time
- Customer uploads reference image + special instructions
- Seller accepts, rejects, or fulfills

**Use cases:** Custom bouquets, personalized cakes, gift boxes, bespoke jewelry, made-to-order clothing.

---

## Business Model

### Revenue Streams

| Stream | Price | Status |
|---|---|---|
| **Pay-as-you-go** | ₹499/week | Live |
| **Monthly** | ₹1,499/month | Live |
| Payment gateway rev share | 2% txn fee | Roadmap (v1.1) |
| Custom domain upsell | Premium tier | Roadmap (v1.1) |
| Shipping integration | Rev share on labels | Roadmap (v2.0) |

### Unit Economics (Projected)

| Metric | Conservative | Optimistic |
|---|---|---|
| Monthly subscribers | 500 | 5,000 |
| Average plan value | ₹1,000/mo | ₹1,200/mo |
| MRR | ₹5,00,000 | ₹60,00,000 |
| ARR | ₹60,00,000 | ₹7,20,00,000 |
| Monthly churn | 15% | 8% |
| LTV per seller | ₹6,667 | ₹15,000 |
| CAC (blended) | ₹2,000 | ₹3,000 |
| LTV:CAC | 3.3x | 5x |

### Path to ₹50L MRR (Month 12)

- 1,000 paying sellers × ₹5,000 ARPU = ₹50L MRR
- Requires ~3,000 total signups (33% conversion)
- At 50% approval rate, need ~6,000 applications
- At 50 applications/week, achievable in 12 months

---

## Competitive Landscape

| | SAWPD | Shopify Lite | linktr.ee | Selar |
|---|---|---|---|---|
| **Commission** | **0%** | 2% | N/A | 5-10% |
| **UPI native** | **Yes** | Partial | No | Partial |
| **Mobile-first** | **Yes** | Partial | Yes | Partial |
| **Hand-reviewed** | **Yes** | No | No | No |
| **Custom orders** | **Yes** | No | No | No |
| **Setup time** | **10 min** | 2-3 hours | 5 min | 30 min |
| **Starting price** | **₹499/wk** | ₹2,000/mo | $9/mo | Free |

### Why We Win

1. **Zero commission** — the only platform where sellers keep 100%
2. **UPI-native** — QR code checkout, no gateway, no settlement delay
3. **Custom orders** — first-class template engine with dynamic pricing
4. **Hand-reviewed** — every shop approved by a real person (trust signal)
5. **Made for India** — INR-only, UPI-first, ₹499 entry point

---

## Go-To-Market

### Phase 1: Seed (Months 1-3)
- **Target**: 50 fashion/beauty/jewelry sellers with 5K-50K followers
- **Channel**: Direct Instagram DM outreach
- **Offer**: Free 14-day trial + concierge onboarding
- **Goal**: 20 paying sellers, ₹1L MRR

### Phase 2: Grow (Months 4-8)
- **Target**: 500 sellers across 10 niches
- **Channel**: Instagram ads, creator partnerships, referrals
- **Offer**: Referral program (1 week free for both)
- **Goal**: 200 paying sellers, ₹10L MRR

### Phase 3: Scale (Months 9-12)
- **Target**: 2,000+ sellers
- **Channel**: Content marketing, SEO, influencer deals
- **Offer**: Custom domains, shipping integration
- **Goal**: 1,000 paying sellers, ₹50L MRR

### Distribution Wedge

Instagram DM outreach to creators who:
- Have "shop" or "store" in their bio
- Post product photos but no link to buy
- Use linktr.ee or similar (link-only, no commerce)
- Have 5K-50K followers (micro-creators, underserved)

---

## Traction

| Metric | Status |
|---|---|
| Product status | **v1.0 shipped** — fully functional MVP |
| Tech stack | Production-ready (Supabase, Next.js 15, TypeScript) |
| Security | Rate limiting, brute-force protection, CSP/HSTS, input sanitization |
| Database | 10 tables, RLS policies, foreign keys, audit trail |
| Email | Resend integration (9 notification types) |
| Custom orders | Template engine + dynamic pricing (unique in market) |
| Typecheck + Lint | **Passing** |

### What's Next (v1.1)
- Razorpay integration (real payments, 2% rev share)
- Cloudflare Turnstile CAPTCHA
- Phone OTP for customers
- Test suite (Vitest)

---

## Team

*[Fill in: Founders, backgrounds, relevant experience]*

---

## The Ask

*[Fill in: Funding amount, use of funds, runway]*

| Use of Funds | Allocation |
|---|---|
| Engineering | 40% |
| Growth & Marketing | 30% |
| Operations | 20% |
| Legal & Admin | 10% |

---

## Why Now, Why Us

1. **Timing**: Instagram commerce + UPI adoption + creator economy — all converging in India right now
2. **Product**: v1.0 is shipped. Full-stack, multi-tenant, production-ready. Not a pitch deck — it's code.
3. **Differentiation**: Zero commission + UPI-native + custom orders — no competitor offers all three
4. **Market**: 50M+ Instagram sellers in India, no dominant platform serving them
5. **Moat**: Hand-reviewed creator network + custom order templates + community flywheel

---

## Appendix

### Tech Stack
Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL + Storage), Resend, Zustand, Framer Motion, Zod, react-hook-form

### Database
10 tables: sellers, stores, products, orders, promos, applications, returns, billing, subscribers, audit_log

### Key Files
- `src/app/page.tsx` — Landing page
- `src/app/s/[slug]/page.tsx` — Storefront
- `src/app/s/[slug]/checkout/` — UPI checkout
- `src/app/dashboard/` — Seller dashboard
- `src/app/admin/` — Admin panel
- `src/app/demo/` — Custom orders demo
- `src/lib/` — Domain layer (15 modules)
- `supabase/migrations/` — Database schema

### Security
Rate limiting (sliding window), brute-force lockout (5 fails → 15 min), CSP + HSTS headers, input sanitization, password strength validation, admin auth checks, CAPTCHA scaffolded

---

*SAWPD — The shop in your bio.*
*Built for Indian creators. By Indians.*
*June 2026*
