# Product Audit Report

**Generated:** 2026-04-15  
**Site:** https://invest-com-au.vercel.app  
**Method:** HTTP crawl (66 routes) + Supabase row counts (172 tables)

## Executive Summary

- **Routes checked:** 66 public routes
- **HTTP OK:** 65 | **HTTP errors:** 1 (CRITICAL)
- **Tables with data:** ~40 | **Tables empty:** ~90 | **Tables MISSING:** 5
- **Critical issues:** 3

---

## CRITICAL Issues

### 1. `/brokers` returns 404

The **main broker comparison listing** — the single most important page on the site — does not exist. The route is `/broker` (singular) but every natural link, internal nav, and SEO expectation points to `/brokers` (plural). Anyone typing the obvious URL, following an internal link, or clicking a Google result gets a 404.

**Fix:** Add a redirect from `/brokers` → `/broker`, or create `app/brokers/page.tsx`.

### 2. Missing tables — routes query non-existent tables

| Route | Missing Table |
|-------|---------------|
| `/newsletter` | `newsletter_editions` |
| `/newsletter/[edition]` | `newsletter_editions` |
| `/community` | `forum_categories` |
| `/community/[category]` | `forum_categories`, `forum_threads` |
| `/community/[category]/[threadId]` | `forum_categories`, `forum_threads`, `forum_posts`, `forum_user_profiles` |

These routes return 200 (Supabase client catches the error gracefully) but render **empty content with no error message**. A user sees a page that looks like it should have content but doesn't.

**Fix:** Either create the tables, or add a proper "coming soon" state.

### 3. `best_for_scenarios` has only 3 rows

The programmatic SEO engine (`/best-for/[slug]`) is the growth strategy, but it only has 3 seeded scenarios. For this to generate meaningful organic traffic, it needs 30-50 scenarios.

---

## Table Row Counts (key user-facing tables)

| Table | Rows | Verdict |
|-------|------|---------|
| brokers | 108 | OK — solid |
| articles | 223 | OK — solid |
| professionals | 155 | OK — solid |
| investment_listings | 60 | OK |
| suburb_data | 61 | OK |
| property_listings | 35 | OK |
| versus_editorials | 40 | OK |
| broker_data_changes | 395 | OK |
| investment_verticals | 28 | OK |
| buyer_agents | 20 | OK |
| professional_reviews | 33 | OK |
| broker_transfer_guides | 20 | OK |
| country_investment_profiles | 12 | OK |
| broker_health_scores | 10 | OK |
| scenarios | 7 | OK |
| advisor_articles | 5 | THIN |
| commodity_stocks | 5 | THIN |
| commodity_etfs | 2 | THIN |
| commodity_sectors | 1 | THIN |
| best_for_scenarios | 3 | THIN — needs 30+ |
| team_members | 3 | THIN — /authors shows only 3 |
| advisor_firms | 4 | THIN |
| courses | 1 | THIN |
| switch_stories | 0 | EMPTY |
| consultations | 0 | EMPTY |
| quarterly_reports | 0 | EMPTY |
| pro_deals | 0 | EMPTY |
| regulatory_alerts | 0 | EMPTY |
| broker_questions | 0 | EMPTY |
| commodity_news_briefs | 0 | EMPTY |
| commodity_price_snapshots | 0 | EMPTY |
| article_comments | 0 | EMPTY (UI exists, no comments yet) |
| article_reactions | 0 | EMPTY (UI exists, no reactions yet) |
| newsletter_subscriptions | 0 | EMPTY (subscribe page just shipped) |
| newsletter_editions | — | TABLE MISSING |
| forum_categories | — | TABLE MISSING |
| forum_threads | — | TABLE MISSING |
| forum_posts | — | TABLE MISSING |
| forum_user_profiles | — | TABLE MISSING |

---

## Empty-Content Routes (render 200 but have nothing to show)

These pages load correctly and degrade gracefully (no crashes), but a visitor sees a page with no content. Google will index them as thin content.

| Route | Table | Rows | Shows |
|-------|-------|------|-------|
| `/stories` | switch_stories | 0 | "No stories yet" |
| `/consultations` | consultations | 0 | Empty list |
| `/reports` | quarterly_reports | 0 | "No reports yet" |
| `/pro/deals` | pro_deals | 0 | Empty list |
| `/alerts` | regulatory_alerts | 0 | "No alerts yet" |
| `/community` | forum_categories | MISSING | Empty forum |
| `/newsletter` | newsletter_editions | MISSING | Empty archive |

**Recommendation:** Either seed real content, or `noindex` these pages until they have content. Thin content pages actively hurt domain authority.

---

## Routes That Work Well

65 of 66 checked routes return 200. The core product surfaces have real data:

- **Broker comparison:** 108 active brokers with fees, ratings, reviews
- **Articles:** 223 published articles across topics
- **Advisor marketplace:** 155 active professionals with reviews
- **Investment verticals:** 28 verticals with 60 active listings
- **Property:** 35 listings, 61 suburbs with data
- **Calculators:** All 7 calculator routes load correctly
- **Legal/trust pages:** All 10 render correctly
- **Best-for programmatic SEO:** All 3 existing scenarios render with real broker rankings

---

## Wave 11-18 Feature State

| Feature | Code | Data | UI | Verdict |
|---------|------|------|----|---------|
| Notifications | lib + API + cron | 0 rows | Bell in header | WORKS (fills on use) |
| Bookmarks | lib + API | 0 rows | Button on pages | WORKS (fills on use) |
| Article comments | lib + API + moderation | 0 rows | Form on articles | WORKS (fills on use) |
| Article reactions | lib + API | 0 rows | Buttons on articles | WORKS (fills on use) |
| Commodity hub | lib + pages | 5 stocks, 2 ETFs, 1 sector | 24+ pages | WORKS but thin data |
| Commodity news | lib + schema | 0 rows | Section on hub pages | EMPTY — no news seeded |
| Newsroom (articles) | 223 published | Full | Article pages | WORKS |
| Article scorecard | lib + cron | 0 runs | No public UI | HALF-BUILT |
| Price snapshots (broker) | schema + cron | 2376 rows | No chart UI | DATA EXISTS, NO UI |
| Price snapshots (commodity) | schema | 0 rows | No chart UI | EMPTY |
| Best-for scenarios | lib + pages | 3 scenarios | /best-for/[slug] | WORKS but thin |
| Newsletter subscribe | lib + API + page | 0 subs | /newsletter/subscribe | WORKS (just shipped) |
| Newsletter confirm | lib + page | — | /newsletter/confirm | WORKS |
| Newsletter archive | page | TABLE MISSING | /newsletter | BROKEN |
| Exit-intent modal | component | 0 events | Mounted in layout | WORKS |
| Advisor booking (Wave 17) | lib + API + widget | 0 slots | On advisor profiles | WORKS (no slots seeded) |
| Advisor lead scoring | lib + cron | 3 leads | Admin view | WORKS |
| Dark mode | globals.css + toggle | — | Header toggle | WORKS |
| Web vitals | lib + beacon + cron | 0 samples | No dashboard | HALF-BUILT |
| Search analytics | lib + API | 0 queries | No dashboard | HALF-BUILT |
| Attribution rollup | lib + cron | 0 rows | No dashboard | HALF-BUILT |

---

## Compliance Notes (for external lawyer review)

These pages make financial claims that an ASIC compliance review should cover:

1. `/best-for/*` — ranks brokers by algorithm; needs disclosure of methodology
2. `/broker/[slug]` — fee claims must be current; snapshot dates should be visible
3. `/invest/[vertical]` — commodity/sector pages with stock tickers
4. `/advisors/search` — marketplace matching; needs to disclose referral arrangement
5. `/for-advisors/pricing` — lead pricing claims
6. `/quiz` — produces broker recommendations; needs general advice warning
7. Every page with an affiliate "Apply" button — needs disclosure
8. `/how-we-earn` — must accurately describe the revenue model
9. `/fsg` — Financial Services Guide must match current business
10. `/editorial-policy` — must match actual editorial practices

---

## Next Actions (prioritized)

1. **Fix /brokers 404** — redirect to /broker or create route
2. **Create newsletter_editions table** — or noindex /newsletter until it has content
3. **Seed best-for from 3 → 30 scenarios** — programmatic SEO requires volume
4. **Noindex empty pages** (stories, consultations, reports, pro/deals, alerts) until they have content
5. **Build funnel dashboard** — observability data is accumulating with no reader
6. **Seed commodity_news_briefs** — hub pages show empty news sections
7. **External compliance review** of top 10 pages before meaningful traffic
