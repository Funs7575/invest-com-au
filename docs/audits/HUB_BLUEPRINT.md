# Hub Monetisation Blueprint

Strategic reference for `invest.com.au` hub design. Every hub on the
platform is a node on the same money-flow graph and shares this blueprint.

**Read by:** every hub-related queue iteration (streams W, X, Y, Z and
post-Z Tier-2/3 hub builds). Authored 2026-04-27 from the founder brief
"make the hub perfect, leverage every monetisation opportunity".

**Source of truth:** if this doc and a queue item conflict, the queue item
wins for execution detail; this doc wins for strategic intent.

---

## Why this exists

invest.com.au is becoming the default starting point for any Australian
financial event — capital deployment, capital raising, lifecycle
transitions, professional services. The current hubs (`/smsf`, `/grants`,
`/dividends`, `/sell-business`, `/lump-sum-investing`, `/negative-gearing`,
`/visa-investment`, `/learn`) each pull 1–3 monetisation levers out of the
~12 available. Lifting that to 8–10 levers per hub multiplies revenue per
visitor without adding traffic — and gives every new hub a higher floor
from day one.

This blueprint is the contract. New hubs MUST conform; existing hubs
migrate progressively per stream W (component extraction) → Y (registry +
nav + dated-stats) → Z (Tier-1 builds) → post-Z (Tier-2/3 builds).

---

## 1. The 12 monetisation levers

| # | Lever | Typical revenue | Compliance bucket |
| --- | --- | --- | --- |
| 1 | **Lead routing to advisors** (quiz / form → routing → fee) | $50–$5,000+ per matched lead, depends on advisor type | s766B(6)/(7) factual carve-out OR registered tax agent / specialist advisor |
| 2 | **Sponsored placements** in directories / hub hero rail | $500–$10,000/mo per slot | Discloses "Sponsored" — standard adtech compliance |
| 3 | **Affiliate links — CPA** (broker / exchange / lender signups) | $30–$300 per signup | s766B carve-out — factual comparison only, no advice |
| 4 | **Affiliate links — RevShare** (long-term recurring on referred volume) | 10–40% recurring | Same as #3 |
| 5 | **Listings marketplace — paid by lister** (business-for-sale, pre-IPO, fund offerings, aged-care facilities) | $50–$5,000 per listing + featured upgrades | Listings = factual; pre-IPO needs s708 wholesale-investor self-cert gate |
| 6 | **Premium subscription** (deal alerts, premium data, gated reports) | $20–$500/mo per subscriber | Unregulated content publishing |
| 7 | **Sponsored content / native articles** | $1,500–$15,000 per piece | Disclosed adtech; "Advertising feature" label |
| 8 | **Display ads** (programmatic + direct sold) | $5–$50 RPM | Standard |
| 9 | **Lead-magnet email capture** (PDFs, templates, checklists) | Indirect — feeds email list / nurture funnel | Standard |
| 10 | **Newsletter sponsor slots** (per-hub list, sold per send) | $500–$5,000 per send | Standard |
| 11 | **Webinar / event sponsorships** | $5,000–$50,000 per event | Standard |
| 12 | **Course / certification revenue** | $99–$999 per enrolment | Educational; specialty (RG146/FAS-style) needs accreditation |

Each lever is a **slot** in the hub layout that the `HubConfig` either
turns on or leaves null. Empty slots don't render; populated slots render
in their canonical position.

---

## 2. The fully-monetised hub anatomy

Top-to-bottom canonical order. Slots are declarative — present in
`HubConfig` ⇒ rendered, absent ⇒ omitted entirely.

```
┌─ HEADER (global mega-menu, registry-driven)
├─ BREADCRUMB + JSON-LD
├─ HUB HERO
│   ├ Stats bar (≤4 numbers, each via DatedStatBadge)
│   ├ Primary CTA   (lever #1: lead-form / quiz-entry)
│   └ Secondary CTA (lever #9 lead magnet OR lever #6 subscribe)
├─ SERVICE GRID (≤6 cards — taxonomy of the topic)
├─ FEATURED LISTINGS    (lever #5; only on hubs with a marketplace)
│   ├ Sponsored carousel (lever #2; "Featured" badge)
│   └ "List your X" CTA  (sell-side onboarding)
├─ COMPARISON / DIRECTORY
│   ├ Filter sidebar (state, fee range, specialty)
│   ├ Sponsored top row (lever #2)
│   ├ Sortable directory rows (lever #1 lead-routing per row)
│   └ Affiliate rail for product comparison (lever #3 / #4)
├─ CALCULATOR (lever #1 — peak-engagement lead capture)
│   └ Email-gate option for "save / share results" (lever #9)
├─ ELIGIBILITY / DIAGNOSTIC QUIZ (lever #1 — pre-qualified leads)
├─ LEAD-MAGNET BAND (lever #9 — gated PDF / checklist / template)
├─ SPONSORED OFFER STRIP (lever #3 / #4 — affiliate)
├─ FEATURED ARTICLES (Supabase-driven, ISR'd)
├─ SPONSORED ARTICLE SLOT (lever #7 — disclosed)
├─ NEWSLETTER SUBSCRIBE (lever #6 / #10 — hub-specific list)
├─ PUSH-NOTIFICATION OPT-IN (re-engagement; powers deal-alerts subs)
├─ EVENT / WEBINAR PROMO (lever #11 — when relevant)
├─ COURSE TEASER (lever #12 — when relevant)
├─ FAQ (JSON-LD-emitting)
├─ ADVISOR CTA FOOTER (lever #1 — bottom-of-page lead capture)
├─ CROSS-HUB RAIL (related hubs, registry adjacency)
├─ COMPLIANCE BLOCK (lib/compliance.ts, hub-specific)
└─ FOOTER (global)
```

---

## 3. HubConfig schema

Additive to `lib/verticals.ts`. Lives alongside the existing
`VerticalConfig` (which serves `/invest/[slug]` comparison verticals).

```ts
export interface HubConfig {
  // Identity
  slug: string;
  parentSlug?: string;
  title: string;
  metaDescription: string;
  audiences: HubAudience[];           // 'founder' | 'hnw' | 'trustee' | 'retiree' | 'expat' | 'startup-investor'
  complianceKey: ComplianceKey;       // pointer into lib/compliance.ts

  // Layout
  hero: HubHero;
  serviceGrid?: ServiceCard[];
  deepDives?: DeepDiveCard[];
  faqs: FAQ[];

  // Monetisation slots (each null-able — null = slot not rendered)
  directory?: DirectoryConfig;            // levers #1 + #2
  listings?: ListingsConfig;              // lever #5
  calculators?: CalculatorRef[];          // lever #1
  quizzes?: QuizRef[];                    // lever #1
  affiliateOffers?: AffiliateOfferRef[];  // levers #3 + #4
  sponsoredSlots?: SponsoredSlot[];       // levers #2 + #7
  leadMagnets?: LeadMagnetRef[];          // lever #9
  newsletter?: NewsletterRef;             // levers #6 + #10
  pushCategory?: string;                  // re-engagement
  events?: EventRef[];                    // lever #11
  courses?: CourseRef[];                  // lever #12

  // Lead routing (typed at boundary — discriminated union)
  leadQueue: LeadQueueKey;                // 'grants' | 'smsf' | 'startup' | 'wholesale' | ...

  // Cross-hub graph
  relatedHubs: string[];                  // adjacency for CrossHubLinks

  // Article surface
  articleFilters: ArticleFilter;          // { category? | slugs? | tags? | category_in? }

  // SEO
  primaryKeywords: string[];
  schemaTypes: ('FinancialService' | 'Service' | 'WebPage' | 'FAQPage')[];
  programmaticSeoTemplates?: ProgrammaticTemplate[]; // long-tail expansion
}
```

The `HubConfig` registry replaces ~80% of bespoke layout code per hub.
Adding a new hub becomes: write one config row + author content +
(if needed) a custom calculator. Layout, mega-menu inclusion, sitemap
inclusion, breadcrumbs, JSON-LD, related-hubs all derive automatically
from the registry.

---

## 4. Lever-to-slot mapping cheat sheet

| Lever | Primary slot(s) | Secondary slot(s) |
| --- | --- | --- |
| 1 — Lead routing | Hero CTA, Directory rows, Calculator results, Quiz results, Footer CTA | Article inline CTAs |
| 2 — Sponsored placements | Directory top row, Featured Listings carousel | Hero rail, Article side rail |
| 3 — Affiliate CPA | Comparison table, Calculator results, Article inline | Side rail, Newsletter |
| 4 — Affiliate RevShare | Long-form articles, Calculator results | Sponsored offer strip |
| 5 — Listings marketplace | Featured Listings, Directory | "List your X" CTA |
| 6 — Premium subscription | Newsletter band, Push opt-in | Gated content paywall |
| 7 — Sponsored content | Sponsored article slot | Article side rail |
| 8 — Display ads | Article side rail, Article inline | Below FAQ |
| 9 — Lead magnet | Lead-magnet band | Hero secondary CTA, Calculator email-gate |
| 10 — Newsletter sponsor | Newsletter band | Per-send sponsorship |
| 11 — Webinars / events | Event promo slot | Newsletter, Article inline |
| 12 — Courses | Course teaser slot | Newsletter, Article inline |

---

## 5. Per-hub lever priority

Tier-1 builds MUST hit every level-1 lever; level-2 levers ratchet up
post-launch. Existing hubs migrate progressively.

### `/private-markets` (Tier-1, marketplace pattern)

| Priority | Lever | Why |
| --- | --- | --- |
| **1** | #5 listings marketplace | Pre-IPO companies + platforms pay to list (PrimaryMarkets, OnMarket secondary, ASIIN, Aussie Angels secondary). Highest single revenue line. |
| **1** | #6 premium subscription | Deal-alert tier — paid access to vetted pre-IPO opportunities behind s708 cert. Compounds. |
| **1** | #1 lead routing | Wholesale platforms + corporate / securities / tax lawyers around private deals. |
| 2 | #2 sponsored placements | Featured platforms in the directory. |
| 2 | #3 affiliate CPA | Sign-ups to PrimaryMarkets, OnMarket, etc. |
| 2 | #11 webinars | Sponsored deep-dives with featured platforms. |

### `/startup` (Tier-1, founder-funnel pattern)

| Priority | Lever | Why |
| --- | --- | --- |
| **1** | #1 lead routing | Grants consultants ($300–$800/lead) + R&D Tax advisors (10–20% contingent on $200K claim ⇒ leads worth $300–$1,500). The big one. |
| **1** | #5 listings marketplace | VC + angel + syndicate directory paid placements. |
| **1** | #3 affiliate CPA | SaaS tools (Stripe Atlas, Cake Equity, AWS Activate, Notion). |
| 2 | #6 premium | "Find investors" paid tier — premium access with warm-intro requests. |
| 2 | #9 lead magnet | "AU founder fundraising checklist" PDF — captures email at peak intent. |
| 2 | #12 courses | "How to apply for the R&D Tax Incentive yourself" course. |

### `/wholesale` (Tier-1, gated-alternatives pattern)

| Priority | Lever | Why |
| --- | --- | --- |
| **1** | #5 listings marketplace | Funds pay to list strategies / performance / min-ticket data. |
| **1** | #6 premium subscription | Deal-flow tier behind s708 cert. |
| **1** | #1 lead routing | Wholesale platforms, fund managers — high $ per match. |
| 2 | #2 sponsored placements | Featured fund-of-the-month. |
| 2 | #11 webinars | Manager Q&A events. |

### `/retirement` + `/aged-care` (Tier-2, lifecycle pattern)

| Priority | Lever | Why |
| --- | --- | --- |
| **1** | #1 lead routing | Aged-care advisors (~200 cert nationally, scarce) + retirement planners. $300–$1,000+/lead. |
| **1** | #3 affiliate CPA | Annuity providers (Challenger), reverse-mortgage brokers, funeral insurance. |
| **1** | #5 listings marketplace | Aged-care facilities + retirement villages — paid listings. |
| 2 | #9 lead magnet | "Means-test optimiser worksheet" + "Aged-care cost calculator results PDF". |

### `/angel` (Tier-2, capital-deployment pattern)

| Priority | Lever | Why |
| --- | --- | --- |
| **1** | #1 lead routing | Wholesale advisors, ESVCLP funds, syndicate operators. |
| **1** | #5 listings marketplace | Aussie Angels + private syndicates paid directory placements. |
| **1** | #6 premium | Deal-flow alerts. |

### `/business-for-sale` (Tier-2, marketplace pattern)

| Priority | Lever | Why |
| --- | --- | --- |
| **1** | #5 listings marketplace | Sellers pay to list. Featured-upgrade tier. |
| **1** | #1 lead routing | Business brokers (5–10% contingent on $1M sale ⇒ leads worth $1,000+). |
| **1** | #3 affiliate CPA | Vendor finance lenders. |
| 2 | #6 premium | Buyer email alerts (paid tier — first-look access). |

### `/crypto-exchange` + `/crypto-tax` (Tier-3, comparison pattern)

| Priority | Lever | Why |
| --- | --- | --- |
| **1** | #3 affiliate CPA | AU exchange signups ($50–$200 each, with volume bonuses). |
| **1** | #4 affiliate RevShare | Crypto-tax tools (Koinly recurring revshare). |
| **1** | #1 lead routing | Crypto-tax accountants. |

### `/family-office` (Tier-3, HNW pattern)

| Priority | Lever | Why |
| --- | --- | --- |
| **1** | #1 lead routing | Tiny audience ($5M+), but $5–20K per lead matched into a multi-family-office. Pure directory + diagnostic quiz. |

---

## 6. Definition of Done — hub launch checklist

A hub ships only when every box is ticked:

- [ ] Slug registered in `lib/verticals.ts` HubConfig registry
- [ ] All slots from §2 either populated or explicitly null (no "TODO" placeholders)
- [ ] `revalidate=3600` (or lower if real-time data)
- [ ] Breadcrumb + FAQ + Schema.org JSON-LD emitted
- [ ] Directory paginated + filterable (if directory slot active)
- [ ] At least one calculator using `<CalculatorShell>` (auto-handles disclaimer + share + save-results)
- [ ] At least one quiz using `<EligibilityQuiz>` (or hub explicitly opts out)
- [ ] Lead form routes to the correct hub-specific queue (typed at the boundary)
- [ ] Affiliate links use `lib/tracking.ts` builders, not raw URLs
- [ ] All disclaimers via `lib/compliance.ts` keys, no inline strings
- [ ] All dated claims wrapped in `<DatedStatBadge>` with `dataAsOf` + `stalesAt`
- [ ] 8+ articles seeded via idempotent `scripts/seed-<hub>.ts`
- [ ] At least one lead magnet (gated PDF / checklist / template)
- [ ] Newsletter signup with hub-specific list key
- [ ] Push-notification category configured
- [ ] Mega-menu auto-includes (registry-driven — no manual `Header.tsx` edit)
- [ ] Sitemap auto-includes (registry-driven)
- [ ] "Related hubs" rail populated via registry adjacency
- [ ] Smoke test: renders, no broken links, lead form posts, calculator computes, quiz routes
- [ ] Coverage on hub `lib/` ≥ 80%
- [ ] A11y: keyboard nav + screen-reader pass on top sub-page
- [ ] Programmatic SEO templates configured (or explicitly N/A)
- [ ] PR description ticks every box; CI verifies the mechanical ones

---

## 7. Cross-hub funnels

The platform's biggest moat is the cross-hub graph. Adjacency is declared
in `HubConfig.relatedHubs`; the renderer auto-emits the rail.

- **Inheritance funnel:** `/inheritance` → `/lump-sum-investing` → `/smsf` ∨ `/dividends` ∨ `/private-markets`
- **Founder lifecycle:** `/startup` → `/grants` → `/raise-capital` → `/exit` → `/sell-business` → `/lump-sum-investing` → `/smsf` ∨ `/private-markets` ∨ `/family-office`
- **Retiree lifecycle:** `/retirement` → `/smsf` (pension phase) → `/aged-care` → `/estate`
- **HNW lifecycle:** `/wholesale` ↔ `/private-markets` ↔ `/angel` ↔ `/family-office`

Inline lifecycle callouts (e.g. on `/sell-business`: "Just sold? See
`/lump-sum-investing`") use a `<LifecycleCallout from={hub} to={hub}
trigger={event}>` component.

---

## 8. Programmatic SEO patterns

Each hub declares programmatic SEO templates in `HubConfig`. The build
expands templates against data tables.

Examples:

- `/smsf/auditors/[state]` × 8 states → 8 pages
- `/grants/[program-slug]` × N programs → N pages
- `/find-advisor/[type]/[city]` × 12 types × 8 cities = 96 pages
- `/best-vc/[stage]/[sector]` × 4 stages × 12 sectors = 48 pages
- `/private-markets/[platform]` × N platforms → N pages

Each programmatic page reuses the directory / listings slot from the
parent hub's layout — same monetisation slots, narrower data.

---

## 9. Compliance gates per lever

| Lever | Gate | Source of truth |
| --- | --- | --- |
| #1 lead routing | s766B(6)/(7) factual carve-out OR registered-tax-agent OR aged-care-cert | `lib/compliance.ts` per advisor type |
| #5 listings (pre-IPO / wholesale) | s708 self-cert gate before opportunity data renders | New `<WholesaleGate>` component |
| #7 sponsored content | "Sponsored" / "Advertising feature" label, prominent + visible | `<SponsoredBadge>` component |
| #12 courses | RG146 / FAS-style courses → manual compliance review | Per-course gate |

`lib/compliance.ts` is single source of truth. New compliance keys
register there; never inline disclaimer text in pages (CI lint planned to
fail build on inline disclaimers — stream Y).

---

## 10. KPIs per lever — what to track

For each hub × lever:

- **Pageviews** (hub home + sub-pages)
- **Click-through rate** to the lever's CTA
- **Conversion rate** click → completion (lead, signup, purchase)
- **Revenue per visitor (RPV)** = lever revenue / pageviews
- **Time-to-revenue** (when did this hub first earn)

Aggregate to **revenue density per hub** = sum(RPV across all levers).
Use this to identify under-monetised hubs (existing hubs at <10% of
benchmark) and as a budgeting input for hub-prioritisation calls.

Wire to PostHog (existing) — no new analytics dep.

---

## 11. Implementation streams (queue refs)

| Stream | Title | Items | Priority slot |
| --- | --- | --- | --- |
| W | Hub foundation — component extraction + HubPage HOC + migrations | W-01..W-15 | After current quality gates; before V/T |
| X | createAdminClient backlog clearance | X-01..X-09 | Extension of stream C |
| Y | Vertical registry + mega-menu + dated-stats | Y-01..Y-08 | After W |
| Z | Tier-1 hub builds (private-markets, startup, wholesale) | Z-01..Z-21 | After Y |
| (post-Z) | Tier-2/3 hub builds (retirement, aged-care, angel, business-for-sale, crypto, family-office) | Queued after Z lands | Lowest of feature work |

Each stream gets a draft PR; iterations append commits per the standard
`audit-remediation-iteration.md` contract. Diff cap (≤800 LOC) and
verification gates apply unchanged.

---

## 12. Anti-goals (what NOT to do)

- **No inline layout in hub pages** once stream W is done. Pages must
  pass a `HubConfig` to `<HubPage>` and override slots only when truly
  bespoke. Drift will cost the velocity multiplier.
- **No hardcoded mega-menu entries** once stream Y is done. New hubs
  appear in nav by registering in the registry, not by editing
  `Header.tsx`.
- **No hardcoded dated claims** once stream Y-08 lints them. Wrap in
  `<DatedStatBadge dataAsOf=… stalesAt=…>` always.
- **No bespoke compliance copy** in pages. `lib/compliance.ts` keys only.
- **No service-role Supabase client** in public RSC pages. ESLint rule
  in stream X is the long-term enforcement.
- **No raw affiliate URLs.** `lib/tracking.ts` builders only — preserves
  click telemetry and the legal ID trail.
- **No premature monetisation.** Empty slots leave a clean page; only
  populate slots when there's real inventory (real sponsors, real
  listings, real lead-routing partners). Ghost slots erode trust.
