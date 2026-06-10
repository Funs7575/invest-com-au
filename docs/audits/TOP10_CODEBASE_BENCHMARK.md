# TOP-10 REVENUE OPPORTUNITIES — CODEBASE BENCHMARK

**Date:** 2026-06-10  
**Assumption:** AFSL granted (late 2027 in real timeline, but assume live for code planning)  
**Scope:** What code exists? What's missing? What needs 100% completion?  
**Deliverable:** Road to 100% code readiness for each opportunity

> ## ⚠️ CORRECTIONS (2026-06-10, same day — read first)
>
> The first draft of this document was written from strategy docs without
> verifying the codebase. Founder spot-checks caught material errors. Verified
> corrections (by reading code + the live staging mirror):
>
> 1. **#9 Alt-assets is NOT 0% greenfield.** `/invest/alternatives` is live on
>    the staging mirror with a platforms comparison (Vinovest, Cult Wines, …),
>    listings, and guides (`app/invest/alternatives/{platforms,listings,guides}`),
>    plus ~50 other `/invest/*` sub-verticals. Real completion: **~80%**;
>    remaining work is partner data feeds + affiliate deals, not pages.
> 2. **#3 "Self-serve partner onboarding portal — missing" was FALSE.** It
>    exists: `app/broker-portal/register/` → `POST /api/marketplace/register`
>    (Zod-validated, rate-limited, pending-status + admin approval queue at
>    `app/admin/marketplace/brokers`), and the broker portal has 20+ pages
>    including analytics **with CSV export**.
> 3. **#3 verified true gaps (now shipped 2026-06-10 on this branch):** the
>    quality multiplier (approved 2026-04-30, never built), server-side reserve
>    enforcement, and a broker-account standing gate in the allocation engine.
>    See `lib/marketplace/quality-score.ts` + commit `f48adf3`.
> 4. **Remaining #3 work is non-code:** RG 246 legal sign-off (founder action).
> 5. Treat every other "current %" figure below as **unverified estimate** until
>    audited the same way — read the code before scoping from this doc.

---

## #1 — LEAD GENERATION (CPL — Cost Per Lead) CONVERSION

**Revenue potential:** AUD $150–500k pre-AFSL; $500k–$2M+ post-AFSL  
**Real effort:** 3–4 wks tech + 4–6 wks BD

### ✅ WHAT EXISTS

| Component | File | Status | Notes |
|---|---|---|---|
| **Lead submission API** | `app/api/quiz-lead/route.ts` | ✅ Live | Handles quiz → lead capture |
| **Lead routing** | `app/api/submit-lead/route.ts` | ✅ Live | Single-advisor allocation, ranker, `professional_leads` table |
| **Advisor scoring** | `lib/quiz-advisor-scoring.ts` | ✅ Live | Weighted match engine; `computeAdvisorProfileMatch` |
| **Credit ledger table** | `advisor_credit_ledger` | ✅ Exists in prod | Tracks credits per advisor per partner |
| **Resend webhooks** | `lib/resend-webhook/` | ✅ Live | Handles partner integrations |
| **Lead UI (find-advisor)** | `app/find-advisor/page.tsx` | ✅ Live | Quiz → match → contact → lead submit |
| **PostHog tracking** | `lib/posthog/events.ts` | ✅ Live | Funnel events: `quiz_started`, `quiz_completed`, `lead_submitted` |

### ❌ WHAT'S MISSING (→ 100%)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Partner self-serve onboarding portal** | Today: manual CSV upload in admin; CPL partner needs to manage leads/SLA without touching your DB | 2–3 wks | HIGH |
| **Quality scoring multiplier** | Auto-adjust CPL price based on match confidence or conversion rate; prevent low-quality paid leads | 1 wk | MEDIUM |
| **Partner lead dashboard** | Partners can see: leads routed (real-time), conversion rate, SLA status, adjust CPL rate | 2 wks | HIGH |
| **Lead quality audit trail** | Track: lead submitted → advisor accepted → booking scheduled; measure SLA compliance | 1 wk | MEDIUM |
| **Dynamic pricing by vertical** | Different CPL rate for mortgage (high intent) vs. crypto (low intent); `dynamic_pricing_rules` table exists but unused | 1 wk | LOW |

### 📋 BUILD PLAN (To 100%)

1. **Partner onboarding portal** (2–3 wks)
   - New route: `app/partner/dashboard/page.tsx`
   - Portal auth: API key + webhook signing (HMAC-SHA256)
   - UI: leads table, conversion rate chart, SLA status badge, rate adjustment slider
   - DB: extend `api_customers` table with `partner_type` (CPL vs. affiliate), webhook_url, sla_target_hours

2. **Quality scoring** (1 wk)
   - Modify `POST /api/submit-lead` to compute `quality_score` (match confidence + advisor rating + response time)
   - Store in `professional_leads.quality_score`
   - Adjust CPL in dashboard based on tier: 0–50 = base, 50–80 = 1.2x, 80+ = 1.5x

3. **Lead dashboard** (2 wks)
   - Real-time leads table (polling or websocket)
   - Conversion funnel (submitted → accepted → booked)
   - SLA badge (green if < target_hours, red if breached)
   - Export leads to CSV

4. **Quality audit trail** (1 wk)
   - Track state changes: `professional_leads` status + `adviser_actions` timestamps
   - Expose via `/api/partner/leads/:id/events`

### 🎯 Code completion: Currently 40% → Target 100% (6–8 wks work)

---

## #2 — CO-BRANDED FINANCIAL PRODUCTS (savings/super/brokerage/ETF)

**Revenue potential:** AUD $5–15M at maturity  
**Real effort:** 8–12 wks ops/partner (mostly non-code; this is post-AFSL)

### ✅ WHAT EXISTS

| Component | File | Status | Notes |
|---|---|---|---|
| **cobranded_products table** | `cobranded_products` | ✅ Exists | Schema ready; RLS agent-only |
| **Quiz outcomes routing** | `lib/quiz-outcome.ts` | ✅ Live | 7 outcomes; includes bundle-stack |
| **Wealth-stack scoring** | `lib/quiz-scoring.ts` | ✅ Live | `buildStackResults` computes per-vertical matches |
| **Super/savings/robo results** | `app/quiz/_components/QuizResultsScreen.tsx` | ✅ Live | Renders matched super/savings/robo alongside brokers |
| **Product comparison pages** | `app/super/`, `app/savings/`, `app/robo/` | ✅ Live | Full comparison directory for each vertical |
| **Stripe integration** | `lib/stripe.ts` | ✅ Live | Full webhook handler; subscription logic |

### ❌ WHAT'S MISSING (→ 100%)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Warm handoff API** | When quiz → product match, trigger partner integration (e.g., "open account" link pre-filled with user intent) | 2 wks | HIGH |
| **Co-brand product pages** | `/super/acme-super/`, `/savings/judo/` — full product profiles with co-brand identity/logo/terms | 3 wks | HIGH |
| **Trail revenue reporting** | Dashboard: AUM by partner, trail rate realized, monthly payouts pending | 2 wks | MEDIUM |
| **Account opening flow** | E-sign + KYC + account creation (partner API integration) | 4 wks | HIGH |
| **User account linking** | Once co-brand account opened, link to user profile; show in `/account/` | 1 wk | MEDIUM |

### 📋 BUILD PLAN (To 100%)

1. **Warm handoff flow** (2 wks)
   - New API: `POST /api/product-handoff`
   - Input: quiz answers + matched product
   - Output: partner sign-up link + prefilled user intent (name, email, budget, risk profile)
   - Store handoff event in `cobranded_products_handoffs` (new table)

2. **Co-brand product pages** (3 wks)
   - Duplicate `/super/page.tsx` → `/super/[partner]/page.tsx`
   - Partner metadata: logo, hero image, terms link, fee structure, fund list
   - Comparison vs. public super funds
   - CTAs: "Open an account" → warm handoff API

3. **Account linking** (1 wk)
   - New table: `user_cobranded_accounts` (user_id, product_type, partner_slug, account_id, opened_at)
   - Dashboard widget on `/account/`: "Your Judo Savings Account" → AUM + interest earned

4. **Trail revenue dashboard** (2 wks)
   - Admin route: `/api/admin/cobranded-revenue`
   - Monthly revenue by partner (sum trail fees from Stripe receipts + partner feed)
   - Payout pending vs. realized

### 🎯 Code completion: Currently 30% → Target 100% (8–10 wks work)

---

## #3 — HYBRID MARKETPLACE AUCTION (Broker/Partner Placement)

**Revenue potential:** AUD $100–300k  
**Real effort:** 4–6 wks

### ✅ WHAT EXISTS

| Component | File | Status | Notes |
|---|---|---|---|
| **Auction engine** | `lib/marketplace/auto-bid.ts` | ✅ Live | CPC → CPA optimizer; already running |
| **Admin marketplace UI** | `app/admin/marketplace/` | ✅ Live | Manual placement upload + bidding UI |
| **marketplace_placements table** | DB | ✅ Exists | Stores placement + bid + vertical |
| **Homepage teaser** | `app/page.tsx` (home-listing-curation) | ✅ Live | 6-slot carousel, 3-paid cap, sponsor-aware |
| **Sponsor disclosure** | `<SponsorChip />` | ✅ Live | Labels paid placements |
| **RLS policies** | `marketplace_placements` | ✅ Live | Admin-only writes |

### ❌ WHAT'S MISSING (→ 100%)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Self-serve partner onboarding** | Partners manage their own placements without admin intervention | 2 wks | HIGH |
| **Eligibility gate** | Min rating / approval tier before placement eligible for top slots | 1 wk | MEDIUM |
| **Quality multiplier** | CTR/CR → bid multiplier; prevent low-converting placements from buying top slot | 1 wk | MEDIUM |
| **Reserve prices** | Min bid per vertical (brokers can't underbid) | 1 wk | LOW |
| **Analytics dashboard** | Partner sees: impressions, clicks, CTR, placements booked, ROI | 2 wks | HIGH |
| **Legal sign-off artifact** | RG 246 conflict-of-interest review completed + documented | 0.5 wk | BLOCKING |

### 📋 BUILD PLAN (To 100%)

1. **Partner portal** (2 wks)
   - New route: `app/partner/placements/page.tsx`
   - Portal auth via OAuth (Google/Apple) + broker email verification
   - UI: placement editor (broker name, logo, vertical, bid, approved?), analytics dashboard
   - Backend: `POST /api/partner/placements`, `GET /api/partner/placements/analytics`

2. **Eligibility gate** (1 wk)
   - Add `eligibility_tier` to `marketplace_placements` (standard/premium/featured)
   - Tier A (standard): any broker; max 1 placement per vertical
   - Tier B (premium): rating ≥ 4.5; up to 3 placements
   - Tier C (featured): rating ≥ 4.8 + manual approval; unlimited

3. **Quality multiplier** (1 wk)
   - Track CTR/CR in `marketplace_placements_analytics` (new table)
   - Compute `quality_score = (ctr + 0.5 * cr) / 2` monthly
   - Multiply effective bid: `final_bid = stated_bid * (1 + 0.5 * quality_score)`
   - Re-rank monthly

4. **Analytics** (2 wks)
   - Dashboard: impressions (from tracking pixel), clicks, CTR, placements → leads, ROI
   - Export CSV (monthly report)
   - Predictive: "Based on trend, you'll hit $X revenue this month"

### 🎯 Code completion: Currently 50% → Target 100% (6–8 wks work)

---

## #4 — CROSS-BORDER SPECIALIST ADVISOR LINE (Phase B+C)

**Revenue potential:** AUD $65–200k (Y1–2); $500k+ (Y3+)  
**Real effort:** 2–3 wks Phase B; 4–6 wks BD (Phase C)

### ✅ WHAT EXISTS (Phase A)

| Component | File | Status | Notes |
|---|---|---|---|
| **Cross-border specialties** | `lib/advisor-specialties.ts:122–138` | ✅ Shipped | UK Pension Transfer, FATCA US Expat, DASP, FIRB Property |
| **1.75x premium pricing** | `lib/advisor-billing.ts` | ✅ Live | Multiplier applied at lead submit |
| **Country pages** (12 hubs) | `app/foreign-investment/[country]/page.tsx` | ✅ Live | Deep content per corridor |
| **Foreign-investment quiz** | `app/foreign-investment/quiz/page.tsx` | ✅ Live | Separate international track |
| **available_in_countries** | `professionals.available_in_countries` | ✅ Exists | TEXT[] column; GIN index live |
| **Advisor self-selection UI** | `CountriesServedField` in portal | ✅ Live | Persist via profile PATCH |
| **Ranker country-match boost** | `advisor-ranker` option | ✅ Built, wired | +15 default per country match |

### ⚠️ WHAT'S INCOMPLETE (Phase B)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **End-user country-preference capture** | Quiz doesn't ask user "which country are you from?" on domestic track; only international track captures it | 1 wk | HIGH |
| **Country-specific CTA wiring** | When UK user lands on `/foreign-investment/uk`, CTA should route `/find-advisor?country=uk&specialty=uk-pension-transfer` | 1 wk | HIGH |
| **Cross-border partner panel** | Affiliate slots for FX/remittance/non-resident mortgage partners (template exists, unpopulated) | 1 wk | MEDIUM |
| **FIRB eligibility explainer** | Not legal advice, but help users understand if FIRB applies (Chinese ownership, threshold, etc.) | 2 wks | MEDIUM |

### ❌ WHAT'S MISSING (Phase C — post-AFSL BD)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Visa advisor partner network** | SIV/188C premium CPL integration (partner: Fragomen, etc.) | 3 wks | HIGH |
| **US-AU tax desk integration** | FATCA/PFIC specialist co-listing | 2 wks | MEDIUM |
| **Non-resident mortgage specialist** | Referral to Northridge / Omega (partner APIs) | 2 wks | MEDIUM |
| **Pension-transfer specialist desk** | Qualified UK/US pension transfer advisors | 2 wks | MEDIUM |

### 📋 BUILD PLAN (Phase B — To 100%, 3–4 wks work)

1. **Domestic track country capture** (1 wk)
   - Add optional question to domestic quiz: "Are you planning to invest internationally?" + country selector
   - Store in `answers.investor_country_secondary`
   - If set, apply country-match boost on results

2. **Country-specific CTA wiring** (1 wk)
   - On country pages, CTA template: `<Button href={`/find-advisor?country=${countrySlug}&specialty=${specialty}`}>`
   - Pre-populate quiz with country/specialty filters
   - Test: `/foreign-investment/uk` → "Find a UK Pension Transfer specialist" CTA → `/find-advisor?country=uk&...`

3. **Cross-border partner panel population** (1 wk)
   - Edit `/lib/foreign-investment-country-data.ts` to populate `crossBorderPartners` for each country
   - Add partner logos, affiliate links, disclosure
   - Render `<CrossBorderPartnerPanel />` on country pages

4. **FIRB explainer** (2 wks)
   - New page: `/foreign-investment/firb-explained` (educational, not legal advice)
   - Calculator: "Do I need FIRB approval?" (flowchart-style)
   - Link from all property-related cross-border flows

### 🎯 Code completion: Currently 60% (Phase A+B ready) → Target 100% with Phase C (6–8 wks work post-AFSL)

---

## #5 — AI Q&A CAPTURE LAYER (Public QA platform + data moat)

**Revenue potential:** $0 direct (Y1); $500k–$2M+ data product (Y3)  
**Real effort:** 2–3 wks public pages; 8–12 wks data product

### ✅ WHAT EXISTS

| Component | File | Status | Notes |
|---|---|---|---|
| **Chatbot engine** | `lib/chatbot.ts` | ✅ Live | Claude+OpenAI, prompt injection detection, AFSL guardrails |
| **Embeddings infra** | `lib/embeddings.ts` | ✅ Live | Vector store ready; FAQ pre-embedded |
| **Cost caps** | `lib/ai-cost-caps.ts` | ✅ Live | Prevent runaway LLM bills |
| **AI referrer tracking** | `lib/geo/ai-referrer.ts` | ✅ Live | Perplexity/ChatGPT/Claude/Gemini detection |
| **PostHog events** | `ai_referral` event | ✅ Live | Consent-gated; fires once/session |
| **Admin Q&A interface** | `app/admin/ai/` (partial) | ✅ Started | Admin can test chatbot |

### ❌ WHAT'S MISSING (→ 100%)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Public Q&A landing pages** | `/questions/[slug]` with answer-first structure + FAQ schema | 1–2 wks | HIGH |
| **Question-capture form** | Users can submit Q; bot answers; stored for future training | 1 wk | HIGH |
| **Data warehouse layer** | Aggregate Q&A dataset; run trend analyses; surface to advisor subscribers | 6–8 wks | HIGH |
| **Advisor subscription UI** | Advisors can pay $99–299/month for "Market Intelligence" insights | 2 wks | MEDIUM |
| **FAQ schema on public Q&A** | Helps LLM citations; structured markup | 1 wk | MEDIUM |
| **Question ranking/curation** | Popular questions surface first; spam/low-quality removed | 2 wks | LOW |

### 📋 BUILD PLAN (To 100%, 10–15 wks work)

1. **Public Q&A pages** (2 wks)
   - New route: `app/questions/[slug]/page.tsx`
   - DB table: `public_qa_items` (question, answer, answer_source: "chatbot"|"manual", approved: boolean, views: int)
   - Display: question heading + answer paragraph + FAQ schema + "Ask a similar question" CTA
   - ISR: `revalidate = 3600` (1 hour)

2. **Question-capture form** (1 wk)
   - New route: `app/api/questions/submit`
   - Form: question text + email (optional) + consent
   - Validation: Zod schema; rate-limit 3/10min per IP
   - Trigger chatbot; store Q+A in `public_qa_submissions` table

3. **Data warehouse** (6–8 wks — optional, high-complexity)
   - Batch daily: aggregate Q&A trends into `qa_trends` table (question_topic, mention_count, change_week_over_week)
   - Dashboards: 
     - Topic trends (e.g., "FIRB mentions +40% MoM")
     - Seasonal patterns (property questions spike Sept–Nov)
     - Advisor-market signals (crypto interest declining)
   - Expose via `/api/advisor/market-intelligence`

4. **Advisor subscription** (2 wks)
   - New Stripe product: "Market Intelligence"
   - Route: `/advisor-portal/market-intelligence` (gated by subscription)
   - Display: trending topics, historical trends, export CSV
   - Webhook: Stripe subscription → unlock feature

### 🎯 Code completion: Currently 60% → Target 100% (10–15 wks work, can be phased)

---

## #6 — PREMIUM RESEARCH SUBSCRIPTION

**Revenue potential:** AUD $30–120k  
**Real effort:** Content-only (0 wks tech)

### ✅ WHAT EXISTS

| Component | File | Status | Notes |
|---|---|---|---|
| **Stripe integration** | `lib/stripe.ts` | ✅ Live | Full webhook handlers |
| **Pro tier** | `app/pro/` | ✅ Live | Subscription management UI |
| **Customer portal** | Stripe dashboard link | ✅ Live | Manage billing |
| **Login wall** | Articles can be gated | ✅ Live | Feature flag + auth check |

### ❌ WHAT'S MISSING

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Premium content plan** | Define what's gated: articles, PDFs, live video, research reports | 0 | BLOCKING (non-code) |
| **Content authoring workflow** | Editorial allocates 4–6 articles/week to premium backlog | 0 | BLOCKING (non-code) |
| **Premium article tagging** | Tag articles `premium: true` in CMS; wire gate | 1 day | MEDIUM |
| **Premium newsletter** | Weekly digest of premium content to subscribers | 1 wk | LOW |

### 📋 BUILD PLAN (To 100%, 1–2 wks code work)

1. **Premium article gate** (1 day)
   - Add `is_premium: boolean` to `articles` table
   - Article page: check auth + subscription status
   - If premium + not subscribed: render paywall + "Subscribe for $19/month" CTA

2. **Premium newsletter** (1 wk, optional)
   - New cron: `/api/cron/premium-digest`
   - Collect articles tagged `is_premium: true` from past week
   - Email via Resend to all active `subscription_status: active` users
   - Template: digest of 4–6 articles + exclusive research preview

### 🎯 Code completion: Currently 95% → Target 100% (1–2 wks work, mostly editorial non-code)

---

## #7 — ADVISOR PORTFOLIO MONETIZATION (Certifications, tools, firm subscriptions)

**Revenue potential:** AUD $50–200k  
**Real effort:** 4–6 wks

### ✅ WHAT EXISTS

| Component | File | Status | Notes |
|---|---|---|---|
| **Advisor portal** | `app/advisor-portal/*` | ✅ Live | Profile, settings, leads, firm admin |
| **Professional profiles** | `app/advisor/[slug]/` | ✅ Live | Public profiles; booking widget |
| **Lead management** | LeadsTab in portal | ✅ Live | View, assign, respond |
| **Firm admin** | `firm_admin: boolean` on `professionals` | ✅ Live | Can manage team leads |

### ❌ WHAT'S MISSING (→ 100%)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Advisor tier structure** | Free (basic) / Pro ($99/mo) / Firm ($999/mo) | 2 wks | HIGH |
| **Subscription self-serve** | Advisors can upgrade tier in portal; Stripe integration | 2 wks | HIGH |
| **Profile completeness tracker** | % completion + "Next action" prompt (add photo, bio, specialties) | 1 wk | MEDIUM |
| **Certification system** | "Invest.com.au Accredited Advisor" badge; CPD requirement | 2 wks | MEDIUM |
| **Metrics dashboard** | Lead-to-booking rate, response time, client satisfaction | 2 wks | MEDIUM |
| **Lead limits per tier** | Free: 5 leads/mo; Pro: 50 leads/mo; Firm: unlimited | 1 wk | MEDIUM |

### 📋 BUILD PLAN (To 100%, 8–10 wks work)

1. **Subscription tier system** (2 wks)
   - New table: `advisor_subscriptions` (advisor_id, tier: "free"|"pro"|"firm", status: "active"|"cancelled", stripe_customer_id)
   - Tier features in code:
     - Free: 5 leads/month, basic profile, can't bulk-manage firm
     - Pro: 50 leads/month, advanced metrics, analytics export
     - Firm: unlimited leads, team management, API access, custom branding
   - Stripe products: "$19/mo Pro", "$999/mo Firm"

2. **Portal subscription self-serve** (2 wks)
   - New tab in advisor portal: "Subscription"
   - Display current tier, usage (leads this month), upgrade/downgrade buttons
   - Integration with Stripe: create/manage subscription
   - Webhook: Stripe subscription event → update `advisor_subscriptions` table

3. **Profile completeness** (1 wk)
   - Compute: (photo + bio + specialties + fee + availability + booking_link) / 6 * 100
   - Display on portal: "50% complete — add your bio →"
   - Empty-state guidance on each tab

4. **Certification** (2 wks)
   - New table: `advisor_certifications` (advisor_id, type: "accredited", granted_date, expires_date)
   - Requirements: approved profile, 10+ reviews, 4.5+ rating, CPD hours submitted
   - Badge on profile: "Invest.com.au Accredited Advisor"
   - Annual renewal via CPD submission

5. **Metrics dashboard** (2 wks)
   - Charts: lead volume (monthly), response time (avg), booking rate (%), client satisfaction (NPS)
   - Filters: date range, advisor type
   - Export: CSV monthly report

### 🎯 Code completion: Currently 20% → Target 100% (8–10 wks work)

---

## #8 — SWITCHING-AS-A-SERVICE (Super/Savings/Broker HIN transfers)

**Revenue potential:** AUD $80–250k per vertical  
**Real effort:** 4–6 wks per vertical

### ✅ WHAT EXISTS

| Component | File | Status | Notes |
|---|---|---|---|
| **Super switching calculator** | `/calculators/switch-super` | ✅ Live | Comparison impact visible |
| **Savings calculator** | `/calculators/savings-switching` | ✅ Live | Rate comparison |
| **Broker cost calculator** | `/calculators/broker-cost` | ✅ Live | Fee comparison |
| **Partner integration framework** | Resend webhooks, API patterns | ✅ Live | Can call external APIs |
| **SMS consent** | `NF-20` (PR #1422) | ✅ In-flight | Consent infrastructure ready |

### ❌ WHAT'S MISSING (→ 100%)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Partner e-sign integration** | DocuSign / HelloSign for transfer form | 2–3 wks | HIGH |
| **Lead routing to specialist** | Calculate handoff to Smartshift (super) / equivalent (savings/broker) | 1 wk | HIGH |
| **Warm handoff flow** | User calculates savings → shows transfer benefit → "I want to switch" → e-sign form pre-filled | 1 wk | HIGH |
| **SLA tracking** | Monitor 30-day resolution; escalate if delayed | 1 wk | MEDIUM |
| **Completion webhook** | Partner notifies you when transfer is done; mark lead as completed | 1 wk | MEDIUM |
| **ROI calculator** | Show user: "You'll save $X/year by switching" | 1 wk | LOW |

### 📋 BUILD PLAN (Per vertical, 6–8 wks work per vertical)

1. **e-sign integration** (2–3 wks)
   - Partner with DocuSign / HelloSign
   - Create transfer form template (name, email, account numbers, bank details)
   - New route: `POST /api/switching/initiate-transfer`
   - Input: calculator result (from/to accounts, benefit amount)
   - Output: e-sign URL (redirect user)
   - Store: `switching_transfers` table (transfer_id, user_id, type: "super"|"savings"|"broker", status: "initiated"|"signed"|"submitted"|"completed", partner_reference)

2. **Lead routing** (1 wk)
   - After e-sign, webhook from partner: "Transfer initiated"
   - Create lead in `professional_leads` (type: "switching_specialist", routed to top-rated specialist firm)
   - Send warm intro email to specialist

3. **Warm handoff flow** (1 wk)
   - Calculator result page: show savings amount + time to break-even
   - Button: "Start the transfer" → e-sign pre-fill (user name, email, from/to accounts pre-populated)
   - Post-sign: "We've sent your paperwork to [Partner]. You'll hear from them within 24 hours."

4. **SLA tracking** (1 wk)
   - Cron job: daily, check status of all "submitted" transfers
   - If > 30 days old, send escalation email (user + specialist)
   - Dashboard: % resolved within SLA

5. **Completion webhook** (1 wk)
   - Partner POST to `/api/switching/complete`
   - Mark `switching_transfers.status = "completed"`
   - Send completion email to user

### 🎯 Code completion: Currently 30% → Target 100% (6–8 wks per vertical; start super first)

---

## #9 — ALTERNATIVE-ASSET COMPARISON VERTICAL (Whisky/Wine/Art/Watches)

**Revenue potential:** AUD $100–400k per sub-vertical  
**Real effort:** 4–6 wks per sub-vertical

### ✅ WHAT EXISTS

| Component | File | Status | Notes |
|---|---|---|---|
| **9 proven comparison verticals** | `/broker`, `/savings`, `/super`, `/robo`, `/crypto`, `/etf`, `/funds`, `/managed`, `/solar` | ✅ Live | Directory architecture proven |
| **Directory architecture** | `components/directory/*` | ✅ Live | Filtering, sorting, pagination, facets |
| **Comparison table logic** | `<ComparisonTable />` | ✅ Live | Reusable across verticals |
| **Listing submission** | `app/invest/list`, `/api/listings/submit` | ✅ Live | Admin approval workflow |
| **Affiliate redirect tracking** | `/api/go/` | ✅ Live | Click tracking + revenue attribution |

### ❌ WHAT'S MISSING (→ 100%)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Partner data integration** | Cask 88 (whisky), Vinovest (wine), Masterworks (art), Chrono24 (watches) | 3–4 wks per partner | HIGH |
| **Asset-specific comparison dimensions** | Whisky: region, age, cask-type; wine: vintage, varietal, terroir; art: artist, authentication, provenance | 2 wks | HIGH |
| **Valuation feeds** | Whisky market indices (Whiskystats, Rare Whisky 101), wine indices (Liv-ex), art benchmarks | 2–3 wks | MEDIUM |
| **Lead routing** | Send qualified buyers to dealer/auction house | 1 wk | MEDIUM |
| **SEO content** | Pillar articles, glossary terms for each asset class | 3–4 wks (editorial) | MEDIUM |

### 📋 BUILD PLAN (Per vertical, 8–12 wks work per vertical)

1. **Directory skeleton** (1 wk)
   - Duplicate `/broker/page.tsx` → `/whisky/page.tsx`
   - New table: `whisky_listings` (name, distillery, region, age, bottling_year, cask_type, price_usd, link_to_merchant, merchant_id)
   - Filters: distillery, region, age range, price range
   - Display: asset image, key specs, current market price, merchant

2. **Partner data feed** (3–4 wks)
   - Contract with Cask 88 API (or web scraping if no API)
   - Nightly cron: `/api/cron/sync-whisky-listings`
   - Fetch: top 500 assets by volume/interest
   - Store in `whisky_listings`; update prices daily
   - De-dupe across merchants

3. **Valuation feed** (2–3 wks)
   - Integration with market-index API (Whiskystats, Liv-ex, etc.)
   - Show historical price trend (1y, 5y charts)
   - "Market outlook" badge (trending up/down/stable)

4. **Comparison dimensions** (2 wks)
   - Whisky: region, distillery, age, ABV, cask-type, bottling year, production year, price per ml
   - Sorting: price, market trend, rarity, volume traded
   - Filters: all of the above + price range

5. **Lead routing** (1 wk)
   - User clicks asset → shows merchant info + "Contact dealer" CTA
   - If high-value asset ($1k+), can route to investment advisor network
   - Track: leads sent, conversions

6. **SEO content** (3–4 wks, editorial + tech)
   - Whisky pillar articles: "Whisky investment guide", "Top distilleries for collectors", regional deep-dives
   - Glossary: 50+ terms (Islay, Speyside, peating, etc.)
   - FAQ schema on key assets

### 🎯 Code completion: Currently 0% → Target 100% (8–12 wks per vertical; start whisky first)

---

## #10 — CONCIERGE WEALTH-STACK BUILDER (Multi-product routed matching)

**Revenue potential:** AUD $150–400k (direct advisor leads) + $300–800k (product co-brand handoffs)  
**Real effort:** 3–4 wks

### ✅ WHAT EXISTS

| Component | File | Status | Notes |
|---|---|---|---|
| **Quiz scoring** | `lib/quiz-scoring.ts` | ✅ Live | 8 weight dimensions |
| **Outcome resolver** | `lib/quiz-outcome.ts` | ✅ Live | 7 outcomes; includes bundle-stack |
| **Multi-product scoring** | `buildStackResults` | ✅ Live | Scores super/savings/robo per-vertical |
| **Results screen** | `QuizResultsScreen` | ✅ Live | Shows matched brokers + stack results |
| **Wealth-stack questions** | `stack_risk`, `stack_super`, `stack_savings` | ✅ Live | Appended to DIY track for relevant goals |

### ❌ WHAT'S MISSING (→ 100%)

| Gap | Why it matters | Build effort | Priority |
|---|---|---|---|
| **Multi-product results orchestration** | If user needs {broker + super + savings}, show all 3 on one screen with coordinated CTAs | 1–2 wks | HIGH |
| **Secondary CTA visibility** | Each outcome (broker, super, savings) has primary CTA; secondary outcomes should be visible, not hidden | 1 wk | HIGH |
| **Co-brand product handoff** | When quiz routes to super/savings, trigger warm intro to co-brand partner (not just generic result) | 2 wks | MEDIUM |
| **Sequenced advisor routing** | If user needs mortgage + super, route mortgage advisor first (urgency), super advisor in follow-up drip | 1 wk | MEDIUM |
| **Portfolio rebalancing suggestion** | "Your broker + super + savings allocation suggests you're 40% growth, 60% stable. Consider..." | 2 wks | LOW |

### 📋 BUILD PLAN (To 100%, 5–7 wks work)

1. **Multi-product results orchestration** (1–2 wks)
   - Modify `QuizResultsScreen.tsx` to accept `stackResults` (super_fund, savings_account, robo_advisor arrays)
   - Layout: hero outcome (post-job / advisor-match / diy-broker) + secondary outcomes below
   - Each outcome: matched item card + primary CTA + secondary CTA for alternative path
   - Example: "Best advisor match: John Smith (mortgage broker)" + below: "Also recommended: Judo Savings ($650/year interest)" + "Also recommended: Raiz Robo ($5 setup fee)"

2. **Secondary CTA routing** (1 wk)
   - Each secondary outcome has a visible button: "Explore super" → filters `/super/` to matched fund
   - Preserve context: if dismissed, don't re-show (store in session)
   - Track: "user saw secondary outcome for savings_account:judo"

3. **Co-brand handoff** (2 wks)
   - When quiz outcome = "bundle-stack", trigger `POST /api/product-handoff` for each vertical (if co-brand available)
   - Pass quiz context (user intent, budget, risk profile) to partner
   - Example: quiz → Judo savings match → `https://judo.com.au/open?referrer=invest.com.au&intent=savings&budget_range=medium&risk=balanced`

4. **Sequenced advisor routing** (1 wk)
   - If user needs mortgage + super, create two leads:
     - Immediate: mortgage broker (stage=under-contract signal)
     - Drip (3 days later): super specialist
   - Email: "Here's John (mortgage), and we've also found Sarah (super specialist) who'll reach out in a few days"

5. **Portfolio rebalancing suggestion** (2 wks, optional)
   - Compute allocation from matched products: broker% + super% + savings%
   - Simple heuristic: allocation badge (e.g., "Growth-skewed: Consider adding conservative super fund")
   - Card on results: "Recommended: Switch $X to [conservative fund]"

### 🎯 Code completion: Currently 70% → Target 100% (5–7 wks work)

---

## 📊 SUMMARY TABLE — CODE COMPLETION STATUS

| Opportunity | Current % | Target % | Effort (wks) | Priority | Blocker |
|---|---|---|---|---|---|
| #1 Lead Gen (CPL) | 40% | 100% | 6–8 | HIGH | None |
| #2 Co-branded Products | 30% | 100% | 8–10 | HIGH | AFSL grant |
| #3 Hybrid Auction | 50% | 100% | 6–8 | HIGH | Legal sign-off (RG 246) |
| #4 Cross-border (Phases B+C) | 60% | 100% | 6–8 | HIGH | Partner BD (Phase C) |
| #5 AI Q&A + Data Moat | 60% | 100% | 10–15 | MEDIUM | None |
| #6 Premium Research | 95% | 100% | 1–2 | MEDIUM | Editorial content plan |
| #7 Advisor Monetization | 20% | 100% | 8–10 | MEDIUM | None |
| #8 Switching-as-a-Service | 30% | 100% | 6–8 per vertical | MEDIUM | Partner API contracts |
| #9 Alt-Asset Verticals | 0% | 100% | 8–12 per vertical | LOW | Partner data feeds |
| #10 Concierge Stack | 70% | 100% | 5–7 | HIGH | None |

**Total effort to 100% code readiness:** ~70–100 weeks of focused build (assuming AFSL granted, partners signed, content plan set)

---

## 🎯 RECOMMENDED BUILD SEQUENCE (Code-first, assuming no blockers)

1. **Phase 1 — Foundation (Weeks 1–4)**
   - #6 Premium Research (1–2 wks) — lowest effort, ships first
   - #10 Concierge Stack (5–7 wks) — highest leverage, unblocks downstream

2. **Phase 2 — Revenue Engines (Weeks 5–12)**
   - #1 Lead Gen CPL Portal (6–8 wks)
   - #3 Hybrid Auction Partner Portal (6–8 wks) — parallel

3. **Phase 3 — B2B & Monetization (Weeks 13–22)**
   - #7 Advisor Portfolio (8–10 wks)
   - #4 Cross-border Phase B (3–4 wks)

4. **Phase 4 — Scaling Verticals (Weeks 23–35)**
   - #8 Switching-as-a-Service (6–8 wks per vertical; start super)
   - #2 Co-branded Products (8–10 wks; parallel with partner BD)

5. **Phase 5 — Data Moat & New Markets (Weeks 36+)**
   - #5 AI Q&A + Data Product (10–15 wks; ongoing)
   - #9 Alt-Asset Verticals (8–12 wks per vertical; parallel)

---

**Next Step:** Pick Phase 1 items and begin implementation sprints.

