# KK-01 Internal Link Audit

**Date:** 2026-05-09  
**Script:** `scripts/internal-link-audit.mjs`  
**Queue item:** KK-01 — Identify orphaned pages + over-linked hubs  
**Audit ref:** `docs/audits/codebase-health-2026-04-24.md` §5 (SEO + discoverability)

---

## Summary

| Metric | Count |
|--------|-------|
| Total page routes scanned | 524 |
| Orphaned (in-degree = 0) | 192 |
| Low-linked (in-degree = 1) | 82 |
| Over-linked hub (out-degree ≥ 25) | 1 |

**How to regenerate:** `node scripts/internal-link-audit.mjs`

---

## Over-linked hubs

Only one file exceeds the threshold (25 outgoing internal links):

| File | Out-degree |
|------|-----------|
| `components/Footer.tsx` | 64 |

The Footer is intentionally the primary navigation hub — no action needed. Its 64 links are the expected global nav surface. This does mean any page only linked from the footer is fragile (single point of inbound discoverability).

---

## Top 20 most-linked pages

These are the pages with the most inbound links from other pages:

| Rank | Route | In-degree |
|------|-------|-----------|
| 1 | `/compare` | 80 |
| 2 | `/find-advisor` | 59 |
| 3 | `/invest` | 54 |
| 4 | `/advisors` | 50 |
| 5 | `/quiz` | 38 |
| 6 | `/foreign-investment` | 36 |
| 7 | `/privacy` | 35 |
| 8 | `/how-we-earn` | 25 |
| 9 | `/calculators` | 24 |
| 10 | `/methodology` | 21 |
| 11 | `/terms` | 17 |
| 12 | `/etfs` | 13 |
| 13 | `/account` | 12 |
| 13 | `/articles` | 12 |
| 13 | `/editorial-policy` | 12 |
| 13 | `/how-we-verify` | 12 |
| 13 | `/quotes/post` | 12 |
| 18 | `/advisor-portal` | 10 |
| 19 | `/pro` | 9 |
| 19 | `/property/buyer-agents` | 9 |

---

## Orphaned pages — classified

### Category A: Expected orphans (no action needed)

These pages are legitimately discovered via external links, search, or auth-gated flows rather than internal navigation:

**Dynamic content routes** — crawled via sitemap, not cross-linked:
- `/advisor/[slug]`, `/advisors/[type]`, `/advisors/[type]/[state]`
- `/article/[slug]`, `/articles/[category]`
- `/advisor-guides/[slug]`, `/best/[slug]`, `/best-for/[slug]`
- `/broker/[slug]`, `/broker/[slug]/safety`, `/brokers/[slug]`, `/brokers/full-service/[slug]`
- `/community/[category]`, `/community/[category]/[threadId]`
- `/consultations/[slug]`, `/costs/[slug]`, `/course/[slug]`
- `/courses/[slug]`, `/courses/[slug]/[lessonSlug]`
- `/etfs/vs/[slugs]`, `/expert/[slug]`, `/firm/[slug]`
- `/foreign-investment/[country]`, `/foreign-investment/from/[country]`
- `/foreign-investment/guides/*` (3 country guides)
- `/glossary/[term]`, `/how-to/[slug]`, `/invest/[slug]/*`
- `/invest/funds/[slug]`, `/invest/*/listings/[slug]`
- `/investing/[city]`, `/newsletter/[edition]`
- `/property/buyer-agents/[slug]`, `/property/listings/[slug]`, `/property/suburbs/[slug]`
- `/quotes/[slug]`, `/quotes/[slug]/review`, `/quotes/by/[type]/[state]`
- `/reports/[slug]`, `/research/[slug]`, `/reviewers/[slug]`
- `/scenario/[slug]`, `/stories`, `/tag/[slug]`, `/topic/[slug]`, `/versus/[slugs]`

**Auth-gated / portal routes** — intentionally no public nav:
- `/account/` (auth-gated, linked from header when signed in)
- `/advisor-portal/*` (auth-gated)
- `/broker-portal/*` (auth-gated)
- `/dashboard`, `/portfolio`, `/preview/[token]`
- `/review/[token]`, `/review/broker/[token]`

**Utility / flow routes** — reached via redirect or form submission:
- `/advertise/featured-placement/success`
- `/export/comparison`, `/export/fee-impact`, `/export/quiz-results`
- `/go/[slug]/apply` (affiliate redirect handler)
- `/newsletter/confirm`, `/newsletter/unsubscribe`, `/unsubscribe`
- `/share/shortlist/[code]`

**Locale variants** — linked from language selector (not crawled as orphans):
- `/ar/foreign-investment/*`, `/ko/foreign-investment/*`, `/zh/foreign-investment/*`

---

### Category B: Actionable orphans (add internal links)

These pages should be linked from their natural parent hub but currently are not:

#### Calculators (missing from `/calculators` hub)

| Orphaned route | Natural parent | Recommended fix |
|---------------|---------------|-----------------|
| `/debt-calculator` | `/calculators` | Add card to calculators hub page |
| `/dividend-reinvestment-calculator` | `/calculators` or `/dividends` | Add to calculators hub + dividends page |
| `/fire-calculator` | `/calculators` | Add card to calculators hub page |
| `/mortgage-calculator` | `/calculators` | Add card to calculators hub page |
| `/property-vs-shares-calculator` | `/calculators` or `/property` | Add to calculators hub |
| `/retirement-calculator` | `/calculators` | Add card to calculators hub page |
| `/smsf-calculator` | `/calculators` or `/smsf` | Add card + link from `/smsf` |
| `/super-contributions-calculator` | `/calculators` or `/super` | Add card + link from `/super` |

#### Content pages (missing from relevant hubs)

| Orphaned route | Natural parent | Recommended fix |
|---------------|---------------|-----------------|
| `/accessibility` | Footer or `/about` | Add to footer (compliance/trust section) |
| `/api-docs` | Footer or `/for-advisors` | Add link from developer-facing pages |
| `/benchmark` | `/research-tools` or admin | Add to research tools hub |
| `/chess-lookup` | `/tools` or `/research` | Add to research tools |
| `/course`, `/start` | Homepage or `/learn` | Add to homepage hero or nav |
| `/embed` | `/for-advisors` or `/advertise` | Add to advertiser/developer pages |
| `/for-advisors/pricing`, `/for-advisors/sponsored` | `/for-advisors` | Add to `/for-advisors` nav |
| `/health-scores` | `/research-tools` | Add to research tools hub |
| `/jobs` | Footer or `/about` | Add to footer |
| `/press` | Footer or `/about` | Add to footer |
| `/properties`, `/property-platforms` | `/property` | Add to property hub nav |
| `/research-tools` | `/research` hub | Link from `/research` |
| `/robo-advisors` | `/advisors` or `/invest` | Add to advisors hub |
| `/term-deposits` | `/invest` or rates section | Link from `/invest` and `/rates` |

#### Sub-pages missing parent links

| Orphaned route | Missing link |
|---------------|-------------|
| `/advisor-guides/buyers-agent-vs-diy` | Should link from `/advisor-guides` hub |
| `/advisor-guides/financial-planner-vs-robo-advisor` | Same |
| `/advisor-guides/smsf-accountant-vs-diy` | Same |
| `/advisor-guides/tax-agent-vs-accountant` | Same |
| `/alerts/[slug]` | Should link from alert management UI |
| `/best-for` | Should link from `/best` or `/compare` |
| `/compare/etfs`, `/compare/insurance` | Should link from `/compare` hub |
| `/dividends/franking-credits` | Should link from `/dividends` page |
| `/etfs/bonds`, `/etfs/international`, `/etfs/sectors` | Should link from `/etfs` hub |
| `/how-to/transfer-from/[broker_slug]` | Should link from `/how-to/transfer-from` |
| `/insurance/health`, `/insurance/life`, `/insurance/income-protection`, etc. | Should link from `/insurance` hub |
| `/invest/alternatives/guides` | Should link from `/invest/alternatives` |
| `/invest/bonds`, `/invest/commodities`, `/invest/forex`, etc. | Should link from `/invest` hub |
| `/lump-sum-investing/inheritance`, `/lump-sum-investing/redundancy` | Should link from `/lump-sum-investing` |
| `/smsf/checklist`, `/smsf/crypto` | Should link from `/smsf` hub |
| `/startup/grants` | Should link from `/startup` |
| `/super/consolidation`, `/super/leaving-australia` | Should link from `/super` hub |
| `/tax/crypto`, `/tax/negative-gearing` | Should link from `/tax` hub |

---

## Priority fixes for KK-02

The highest-impact fixes (linking orphaned pages into their natural hubs) should be implemented in KK-02 (related-content widget) and KK-03 (topic cluster map). Immediate quick wins:

1. **`/calculators` hub** — add 8 orphaned calculators as cards (highest traffic impact)
2. **Footer** — add `/accessibility`, `/jobs`, `/press`, `/api-docs` to trust/company section
3. **`/etfs` hub** — add sub-category nav: bonds, international, sectors
4. **`/smsf` hub** — add links to checklist, crypto, calculator
5. **`/insurance` hub** — add sub-type links to all 6 insurance sub-pages
6. **`/invest` hub** — many orphaned sub-verticals (bonds, commodities, forex, etc.)

---

## Low-linked pages (in-degree = 1)

82 pages have exactly one inbound link — fragile discoverability. Key examples:

- `/cgt-calculator` — only linked from `FrankingClient.tsx` (add to calculators hub)
- `/fee-simulator`, `/fee-tracker` — only linked from footer (add to calculators hub)
- `/dividend-calculator` — only from one page (add to dividends hub)
- `/foreign-investment/hong-kong`, `/foreign-investment/new-zealand` — only from `HomeCrossBorder.tsx`
- `/brokers/full-service` — only from its own dynamic sub-page

---

## Recommended next steps

| Priority | Item | Queue |
|----------|------|-------|
| High | Add 8 orphaned calculators to `/calculators` hub | KK-02 |
| High | Add sub-category links in `/etfs`, `/smsf`, `/insurance`, `/super` hubs | KK-02 |
| Medium | Related-content widget at bottom of article pages | KK-02 |
| Medium | Topic cluster visualisation | KK-03 |
| Low | Automated internal link injection (needs kill-switch) | KK-04 |
