# `/global-investing` — Outbound Hub Program

Source of truth for the GI-stream build: AU residents investing globally
(direct-outbound) and via AU-listed foreign exposure (indirect-outbound).
Mirror of `/foreign-investment`, executed via existing `HubConfig`
infrastructure (`lib/verticals.ts`, `docs/audits/HUB_BLUEPRINT.md`).

**Authored:** 2026-05-04 from founder brief "build all of this in waves
and loop it". Companion to the audit-remediation queue — every page in
this doc is a queue item under stream **GI**.

**Read by:** every GI-stream iteration. If this doc and a queue item
conflict, the queue item wins for execution detail; this doc wins for
strategic intent.

---

## 1. Why this exists

`/foreign-investment` is heavily built (14 country pages, 9 sub-verticals,
3 calculators, 2 localisations, dedicated advisor vertical). The
outbound mirror — Australians investing globally — has **only 5 scattered
pages and zero hub**. Surface-area ratio ≈ 50:1 in favour of inbound.

The thesis: outbound is the bigger commercial opportunity by traffic
(broader audience, English-only, no localisation cost) but currently
fragmented across `/etfs/us-exposure`, `/etfs/international`, `/invest/forex`,
and ~14 `/best/*` slugs that cannibalise each other. Consolidate +
expand.

### Two tracks, one hub

| Track | Path pattern | Audience | Friction | Year-1 traffic share |
|---|---|---|---|---|
| **A — Direct outbound** | `/global-investing/shares/*`, `/property/*`, `/currency/*`, `/crypto/*` | Aspirational; uses foreign brokers | Higher (W-8BEN, foreign tax, FX) | ~30% |
| **B — Indirect via ASX** | `/global-investing/etfs/*`, `/lics/*` | Mainstream; uses AU brokers | Lower (no foreign account needed) | ~70% |

Track A pays better per conversion (foreign-broker CPAs $80-200). Track B
captures the bigger funnel and feeds Track A via cross-link rails.

---

## 2. URL + page map (canonical)

Every line below is either an existing page (`[exists]`) or a queue item
(`[GI-XX]`). Loop iterations resolve queue items into shipped pages.

```
/global-investing                              [GI-01] HUB
│
├── /shares                                    [GI-10] sub-pillar
│   ├── /us                                    [GI-02] CORNERSTONE (3-5k words)
│   ├── /uk                                    [GI-11]
│   ├── /hong-kong                             [GI-12]
│   ├── /japan                                 [GI-13]
│   ├── /singapore                             [GI-14]
│   ├── /europe                                [GI-15]
│   ├── /new-zealand                           [GI-16]
│   └── /[ticker]-from-australia               [GI-17] PROGRAMMATIC, top 50 tickers
│
├── /etfs                                      [GI-20] sub-pillar
│   ├── /us                                    [GI-03 redirect from /etfs/us-exposure]
│   ├── /global                                [GI-03 redirect from /etfs/international]
│   ├── /china                                 [GI-21]
│   ├── /asia                                  [GI-22]
│   ├── /japan                                 [GI-23]
│   ├── /europe                                [GI-24]
│   ├── /uk                                    [GI-25]
│   ├── /india                                 [GI-26]
│   └── /emerging-markets                      [GI-27]
│
├── /lics                                      [GI-30] sub-pillar
│   ├── /global                                [GI-31] MFF, WGB, PMC, EAI, FGG
│   ├── /asia                                  [GI-32]
│   └── /us                                    [GI-33] (small)
│
├── /property                                  [GI-40] sub-pillar
│   ├── /new-zealand                           [GI-41]
│   ├── /united-states                         [GI-42] FL/TX retiree-investor angle
│   ├── /indonesia                             [GI-43] Bali leasehold (tighter compliance)
│   ├── /united-kingdom                        [GI-44]
│   └── /portugal                              [GI-45] Golden-Visa equivalent
│
├── /currency                                  [GI-50] sub-pillar
│   ├── /best-fx-providers                     [GI-51] Wise vs OFX vs WorldFirst
│   ├── /multi-currency-accounts               [GI-52]
│   └── /sending-money-overseas                [GI-53] mirror /foreign-investment/send-money-australia
│
├── /bonds                                     [GI-60] sub-pillar
│   ├── /us-treasuries                         [GI-61]
│   └── /global-bond-etfs                      [GI-62]
│
├── /crypto                                    [GI-70] sub-pillar
│   ├── /global-exchanges                      [GI-71] Binance/Kraken/Bybit from AU
│   └── /au-vs-global                          [GI-72] domestic vs offshore comparison
│
├── /tax                                       [GI-80] sub-pillar — THE MOAT
│   ├── /fito                                  [GI-81] + calculator [GI-82]
│   ├── /us-estate-tax                         [GI-83] + calculator [GI-84]
│   ├── /cgt-on-foreign-shares                 [GI-85]
│   ├── /w-8ben                                [GI-86] form walkthrough
│   ├── /dta                                   [GI-87] outbound-side DTA table
│   └── /super-pension-transfer                [GI-88] QROPS
│
├── /to/[country]                              [GI-90] PROGRAMMATIC mirror of /from/[country]
│
├── /guides                                    [GI-100] sub-pillar
│   ├── stake-vs-commsec-international         [GI-101]
│   ├── stake-vs-ibkr                          [GI-102]
│   ├── moomoo-vs-tiger-vs-webull              [GI-103]
│   ├── chess-vs-custodial-international       [GI-104]
│   ├── ibkr-australia-setup                   [GI-105]
│   ├── how-to-fill-w-8ben                     [GI-106]
│   ├── us-estate-tax-australian-investors     [GI-107] lead magnet for tax-specialist routing
│   ├── fito-explained                         [GI-108]
│   ├── ato-foreign-shares-reporting           [GI-109]
│   ├── currency-conversion-fees-explained     [GI-110]
│   ├── direct-us-vs-asx-listed-equivalent     [GI-111] THE bridge between Track A and B
│   └── global-etf-vs-direct-us                [GI-112] VGS vs VOO; very-high intent
│
└── /calculators                               [GI-120] sub-pillar
    ├── /fx-impact-on-returns                  [GI-121]
    ├── /fito                                  [GI-82]  (alias)
    ├── /us-estate-tax-exposure                [GI-84]  (alias)
    ├── /direct-vs-asx-cost                    [GI-122] BIGGEST LEAD MAGNET — compares total cost VOO vs IVV after FX/brokerage/tax
    └── /total-cost-international-trade        [GI-123] extends existing /us-share-costs-calculator
```

### Reorganisation rules (canon)

- **No namespace duplication.** `/etfs/us-exposure` 301 → `/global-investing/etfs/us`. `/etfs/international` 301 → `/global-investing/etfs/global`. Don't fork ETF content.
- **Keep `/us-share-costs-calculator` at root.** It already ranks; only deep-link from the new hub.
- **`/foreign-investment/china` (inbound) and `/global-investing/etfs/china` (outbound) co-exist.** Different intent, both should rank.

---

## 3. Redirect map (Wave 1, GI-03)

301 permanent redirects. Land **after** the new target page is genuinely
better content (3k+ words, schema, fresh data) — flipping redirects
before content is upgraded loses ranking.

| From | To |
|---|---|
| `/best/us-shares` | `/global-investing/shares/us` |
| `/best/cheapest-us-shares` | `/global-investing/shares/us` |
| `/best/us-shares-5000` | `/global-investing/shares/us` |
| `/best/us-shares-monthly` | `/global-investing/shares/us` |
| `/best/us-fee` | `/global-investing/shares/us` |
| `/best/invest-in-us-shares` | `/global-investing/shares/us` |
| `/best/international-shares` | `/global-investing/shares` |
| `/best/best-international-etfs` | `/global-investing/etfs/global` |
| `/best/forex` | `/global-investing/currency/best-fx-providers` |
| `/best/start-forex-trading` | `/global-investing/currency/best-fx-providers` |
| `/best/low-fx-fees` | `/global-investing/currency/best-fx-providers` |
| `/etfs/us-exposure` | `/global-investing/etfs/us` |
| `/etfs/international` | `/global-investing/etfs/global` |

**Do NOT redirect:**
- `/best/china`, `/best/japan`, `/best/hong-kong` — these may have inbound intent too; need per-slug review
- `/us-share-costs-calculator` — root URL ranks; preserve
- `/invest/forex` — leave for now; assess in Wave 4

---

## 4. Monetisation slot population (per `HubConfig`)

For the hub itself (`/global-investing`):

```ts
{
  slug: "global-investing",
  audiences: ["expat", "founder", "hnw", "retiree"],  // any AU resident with capital
  complianceKey: "general_advice_us_securities",       // NEW key, see compliance section
  leadQueue: { kind: "general", topic: "global-investing" }, // until GI-specific queue ships
  relatedHubs: ["foreign-investment", "smsf", "private-markets"],
  // ... slots populated in GI-01
}
```

Lever-by-lever year-1 expectation (loose, validate before sizing):

| Lever | Slot | Source | Y1 estimate |
|---|---|---|---|
| #1 Lead routing | quiz at hub, calculator email-gates, footer CTA | International tax specialists, QROPS advisors, foreign property buyer's agents | AU$80k–300k |
| #2 Sponsored placements | hero rail "Featured global broker", directory top row | IBKR/Stake/Tiger/moomoo paid placements | AU$40k–150k |
| #3 Affiliate CPA | comparison tables, calculator results, in-article CTAs | Foreign brokers + FX providers (the biggest line) | AU$200k–900k |
| #4 Affiliate revshare | Sharesight, Wise long-term recurring | Tail revenue, compounds | AU$20k–80k |
| #5 Listings marketplace | `/property/listings/[slug]`, paid LIC manager featured slots | NZ property platforms, Bali developers, fund managers | AU$30k–120k |
| #6 Premium subscription | "Global deal alerts" — IPOs, AUD/USD threshold alerts | $30-50/mo, 200-500 subs target by month 12 | AU$50k–150k |
| #7 Sponsored content | "Advertising feature" articles by brokers, FX providers | $1.5-5k each, 1-2/mo | AU$30k–80k |
| #8 Display ads | article side rails on long-form guides only | Programmatic, secondary | AU$5k–20k |
| #9 Lead magnet | "AU US-tax pack" PDF, "W-8BEN walkthrough" PDF | Email capture → nurture | Indirect, feeds #1+#6 |
| #10 Newsletter sponsor | per-send sponsorship of GI cohort | $500-1.5k per send, 2-4/mo once list >5k | AU$15k–60k |
| #11 Events | quarterly "Global investing for Australians" webinar | $5-15k each, sponsored by broker | AU$20k–60k |
| #12 Courses | "Buying US shares from Australia" course at $99-199 | Long-tail, converts from cornerstone | AU$10k–40k |

**Year-1 reasonable range: AU$500k–2M.**
Highest line: lever #3 affiliate CPA. Highest moat: lever #1 + #9 fed by US-estate-tax / FITO calculators.

---

## 5. SEO architecture

### Pillar / cluster
- `/global-investing` = pillar
- Each top-level child (`/shares`, `/etfs`, `/property`, `/currency`, `/tax`, `/bonds`, `/crypto`, `/lics`) = sub-pillar
- Each guide = cluster spoke linking up to its sub-pillar and laterally to 3-5 sibling guides

### Internal-linking rules (enforced via component, not author discipline)
- Every Track A page links to its Track B equivalent ("Don't want a foreign broker? Here's the ASX-listed alternative")
- Every Track B page links to its Track A equivalent ("Want direct exposure? Here's how to buy on NYSE")
- Every guide links to ≥1 calculator and ≥1 directory page
- Every `/to/[country]` cross-links to `/from/[country]` if it exists ("Going the other way? See our inbound guide")

### Programmatic SEO (`programmaticSeoTemplates` in `HubConfig`)
- `/global-investing/shares/[ticker]-from-australia` × top 200 US tickers — pure programmatic, ~200 long-tail pages
- `/global-investing/etfs/[region]` — 7 region pages (above)
- `/global-investing/to/[country]` — 8 countries to start, expandable to 30
- `/global-investing/guides/[broker-a]-vs-[broker-b]` — versus matrix; reuse `/etfs/vs/[slugs]` pattern

**Estimate:** ~30 hand-written cornerstone pages + ~250 programmatic = **~280 indexable URLs**.

### Schema.org / JSON-LD (reuse `lib/schema-markup.ts`, `lib/seo.ts`)
- Hub: `WebPage` + `BreadcrumbList` + `FAQPage`
- Comparison pages: `Product` + `AggregateRating` for each broker/ETF row
- Guides: `Article` + `FAQPage`
- Calculators: `WebApplication`

### hreflang
- Outbound is English-only (AU residents). **No `/zh` or `/ko` mirror.**
- Add `<link rel="alternate" hreflang="en-AU" />` on every page.
- Consider light `en-NZ` mirror later — `/to/new-zealand` already half-serves NZ residents.

---

## 6. Compliance

The outbound thesis sits closer to personal tax/financial advice than the
rest of the site. Compliance load is materially higher.

### New `lib/compliance.ts` keys (GI-04)

```ts
GLOBAL_INVESTING_GENERAL_ADVICE   // covers /global-investing/* general
US_SECURITIES_DISCLAIMER           // for /shares/us, /tax/*, /etfs/us
TAX_AGENT_DISCLAIMER               // explicit "we are not tax agents" gate
QROPS_DISCLAIMER                   // for /tax/super-pension-transfer
FX_GENERAL_ADVICE                  // for /currency/*
US_ESTATE_TAX_DISCLAIMER           // for /tax/us-estate-tax + calculator
FITO_DISCLAIMER                    // for /tax/fito + calculator
```

### Required reviews before merge

- **Tax-agent review** of US estate tax + FITO calculator outputs (NOT optional). Track in `docs/audits/handoffs/gi-tax-review.md`.
- **QROPS** content needs an authorised QROPS advisor partnership OR a clear "factual information only" framing reviewed by tax counsel.
- **Affiliate restrictions:** Robinhood (no AU), Fidelity (no), Schwab (no for new), E*TRADE (no), Public.com (no), M1 Finance (no). **Viable universe:** IBKR, Stake, Tiger AU, moomoo AU, Webull AU, eToro, Superhero (US lite), CMC International, CommSec International, Pearler (US lite), Vested.

### Tier (per CLAUDE.md merge authorization)

- Page UI / content / docs: **Tier A** — autonomous merge after CI green
- New `lib/compliance.ts` keys: **Tier C** — announce before merge
- New schema migration (`broker_markets` join table for GI-09): **Tier C** — announce before merge

---

## 7. Build sequencing — 4 waves

Each wave is independently shippable. Pause anywhere → still net positive.

### Wave 1: hub shell + cornerstone + redirects (queue items GI-01 → GI-09)
**Target: 2-3 weeks via loop, ~1 long session for the foundation.**

- **GI-01** Hub page `/global-investing` (HubConfig row + page.tsx + JSON-LD + FAQ)
- **GI-02** Cornerstone `/global-investing/shares/us` (3-5k words, broker comparison, FAQ)
- **GI-03** Redirect map (13 redirects above) in `next.config.ts`
- **GI-04** New compliance keys in `lib/compliance.ts` (Tier C, announce)
- **GI-05** Mega-menu entry (Header.tsx hand-edit until Y-stream lands)
- **GI-06** Sitemap entry in `app/sitemap.ts`
- **GI-07** Cross-link from `/share-trading` vertical → "Trading global markets?" CTA
- **GI-08** Move existing `/etfs/us-exposure` content to `/global-investing/etfs/us` (clone, then 301)
- **GI-09** `broker_markets` join table migration (Tier C, announce) — replaces fragile `accepts_global_trading` flag pattern

### Wave 2: Track B AU-listed foreign exposure (queue items GI-20 → GI-32)
**Target: 3-4 weeks via loop.** This is the bigger traffic funnel.

- **GI-20** `/global-investing/etfs` sub-pillar
- **GI-21**–**GI-27** 7 region pages (china, asia, japan, europe, uk, india, emerging-markets) modelled on `/etfs/us-exposure`
- **GI-30** `/global-investing/lics` sub-pillar
- **GI-31**–**GI-33** 3 LIC pages (global, asia, us)
- **GI-111** Bridge guide: `direct-us-vs-asx-listed-equivalent`
- **GI-101**–**GI-105** 5 versus pages (Stake-vs-IBKR, Stake-vs-CommSec-International, etc.)

### Wave 3: tax moat + calculators (queue items GI-80 → GI-88, GI-120 → GI-123)
**Target: 3-4 weeks via loop. Includes tax-agent review window.**

- **GI-80** `/global-investing/tax` sub-pillar
- **GI-81**–**GI-88** 8 tax pages (FITO, US estate tax, CGT on foreign shares, W-8BEN, DTA, QROPS)
- **GI-82** FITO calculator (reuse engine from `non-resident-dividend-calculator`)
- **GI-84** US estate tax exposure calculator (NEW, lead-gen gold)
- **GI-122** `direct-vs-asx-cost` calculator — biggest single lead capture asset in build
- **GI-130** `/advisors/global-investing-specialists` (mirror `/advisors/international-tax-specialists`)
- **GI-131** Wire calculator results → email-gate → tax-specialist routing

### Wave 4: country pages + currency + completion (queue items GI-40 → GI-72, GI-90, GI-17, etc.)
**Target: 3-4 weeks via loop.**

- **GI-90** `/to/[country]` programmatic — start with 8 countries
- **GI-40**–**GI-45** 5 property pages
- **GI-50**–**GI-53** Currency hub + 3 sub-pages
- **GI-60**–**GI-62** Bonds hub + US treasuries + global bond ETFs
- **GI-70**–**GI-72** Crypto sub-pages
- **GI-17** `/shares/[ticker]-from-australia` programmatic — top 50 to start
- **GI-140** Newsletter cohort + push category for "global-investing"

---

## 8. Definition of Done (per HUB_BLUEPRINT §6)

A GI-stream item ships only when:

- [ ] Slug registered (HubConfig row OR ad-hoc page until W-12 ships)
- [ ] `revalidate=86400` on content pages, lower on data pages
- [ ] Breadcrumb + JSON-LD via `lib/seo.ts` helpers
- [ ] FAQ JSON-LD on long-form pages
- [ ] All disclaimers via `lib/compliance.ts` keys (no inline strings)
- [ ] All affiliate links via `getAffiliateLink()` from `lib/tracking.ts`
- [ ] All dated stats via `<DatedStatBadge>` with `dataAsOf` + `stalesAt`
- [ ] Mega-menu + sitemap entries (registry-driven once Y-stream lands; hand-edit until then)
- [ ] Internal cross-links: ≥1 to a Track A/B counterpart, ≥1 to a calculator, ≥1 to a directory
- [ ] `npm run type-check` clean
- [ ] Vitest tests for any new helpers; integration test for redirect map
- [ ] One human dev-session UAT before deploy (CLAUDE.md "Before shipping")
- [ ] PR description ticks every box; reviewer can verify in 5 minutes

---

## 9. Risks (don't pretend these don't exist)

1. **301 redirect risk.** `/best/us-shares*` slugs currently rank. If we redirect before the target is genuinely better, we lose 3-6 weeks during recrawl. Mitigation: Wave 1 lands target page **before** flipping redirects (GI-02 lands before GI-03).

2. **Cannibalization with `/share-trading` and `/etfs/us-exposure`.**
   - `/share-trading` = AU broker comparison (default, AU-listed)
   - `/global-investing/shares/us` = direct-to-NYSE
   - `/global-investing/etfs/us` = AU-listed US exposure
   The three should cross-link, not compete. GI-07 enforces this.

3. **Compliance load is higher than inbound.** GI-04 + tax-agent review. Don't merge calculators (GI-82, GI-84, GI-122) without tax-agent sign-off in `docs/audits/handoffs/gi-tax-review.md`.

4. **Some brokers restrict AU traffic.** Filter list in §6.

5. **AUD/USD cycle dependence.** Build evergreen content; don't tie page freshness to FX prints.

6. **Opportunity cost.** Could instead build `/wholesale` or `/family-office` (Tier-1, higher RPV). Outbound chosen because it feeds the broader retail funnel that everything else hangs off.

7. **Track B cannibalises Track A affiliate revenue.** A reader picking IVV over VOO loses the foreign-broker CPA. But they convert to a domestic broker (CommSec, SelfWealth) — net negative is small. Don't hide Track B; honest comparison ranks better long-term.

---

## 10. Anti-goals

- **No `/zh` or `/ko` localisation for outbound.** Audience is English-speaking AU residents.
- **No new dynamic `[country]` route at hub level** (only at `/to/[country]`). Avoids URL ambiguity with `/foreign-investment/[country]`.
- **No bespoke layout per page** once W-12 ships HubPage HOC. Until then, follow `/foreign-investment/page.tsx` as the canonical hand-rolled pattern.
- **No outbound DASP duplication.** DASP belongs in `/foreign-investment/super`. One cross-link from `/global-investing/tax/super-pension-transfer` is enough.
- **No brand/visual differentiation** between inbound and outbound hubs. Two hubs, one design system.
- **No premature monetisation slots.** Empty slots leave a clean page. Only populate when there's real inventory (real sponsors, real listings, real lead-routing partners).

---

## 11. Loop integration

- Each `GI-XX` item lives in `docs/audits/REMEDIATION_QUEUE.md` under `### GI — Global Investing` section.
- Loop iteration contract (per `REMEDIATION_DEFAULTS.md`): pick top non-blocked item, do it, update queue, exit.
- This program is **Tier A by default** (page UI + content). Items flagged Tier C in §6 require chat-announcement before merge.
- Diff cap: ≤800 LOC per iteration (existing convention). Long pages (cornerstones) may need 2 iterations: scaffold + content.
- Cross-stream coordination: GI-stream depends on W-12 (HubPage HOC) eventually but doesn't block on it. Until W-12 lands, GI-XX items use the hand-rolled `/foreign-investment` pattern.

---

## 12. Status (live)

| Wave | Status | Last update |
|---|---|---|
| 1 — Foundation | in-progress (this PR) | 2026-05-04 |
| 2 — Track B ETFs | queued | — |
| 3 — Tax moat | queued | — |
| 4 — Long-tail | queued | — |

Loop iterations append progress here.
