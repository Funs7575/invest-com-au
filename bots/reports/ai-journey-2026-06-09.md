# Filter System Audit — 2026-06-09

**Target:** https://lambent-sawine-17c3dd.netlify.app  
**Scope:** Advisor directory (/advisors) + Invest listings (/invest/*/listings)  
**Method:** Bot journeys + URL-param probing + full source code analysis

---

## Summary

The filter systems are **functionally solid at the URL/routing level** — all tested filter param combinations returned 200. The advisor directory has a genuinely deep filter surface. The listings marketplace has a sophisticated multi-axis filter system with compliance-aware gates.

However both surfaces have gaps between what the codebase *can* support and what users can actually *reach through the UI*, and there's one confirmed real bug: cross-listing links on detail pages generate 404s for several verticals.

---

## 1. Advisors (/advisors)

### What exists (source: AdvisorsClient.tsx)

**Primary pills (always visible):**
| Pill | Options |
|------|---------|
| Type | 35+ types derived from `PROFESSIONAL_TYPE_LABELS` — Financial Planner, Mortgage Broker, SMSF Specialist, Property Advisor, Tax Agent, Estate Planner, Insurance Broker, Buyers Agent, Wealth Manager, Mining Lawyer, Art Advisor, Royalty Broker, Crypto Advisor, Migration Agent, Business Broker, Energy Consultant, and 20+ more |
| Location | State grid (NSW/VIC/QLD/WA/SA/TAS/ACT/NT) with live counts |
| Fee | Fee for Service, Commission, Hybrid, % of AUM |
| Rating | 3.0+, 3.5+, 4.0+, 4.5+ stars |

**All-filters drawer (secondary):**
| Filter | Notes |
|--------|-------|
| Location search | Postcode/suburb autocomplete → proximity sort |
| Radius | 10/25/50/100/200 km |
| Advisor type | Same grid as Type pill |
| Fee structure | Dropdown |
| Advisory firm | Dynamic from current result set |
| Language | From actual advisor data; falls back to full AU_LANGUAGES list |
| State | Also in drawer as dropdown |
| Availability & focus | Verified only, International clients, Accepting new clients, Has intro video |
| Specialties | Dynamic from actual advisor data |

**Sort:** Highest Rated, Most Reviewed, Nearest (with location), Lowest/Highest Fee, Name A-Z, Newest

**Provider tabs:** All / Individuals / Firms / Expert Teams (hidden when only one type has entries)

**URL persistence:** All filters write to URL params. Deep-linkable, Back-button safe.

### URL params tested — all 200 ✓
- `?type=financial_planner`, `?type=smsf_specialist`, `?type=property_advisor`
- `?type=smsf_specialist&state=NSW` (combined)
- `?type=financial_planner,property_advisor` (multi-select)
- `?specialty=SMSF,Real%20Estate`
- `?language=Mandarin`
- `?type=mining_lawyer`, `?type=royalty_broker`, `?type=art_advisor` (new types)

### Gaps / Issues

**GAP 1 — Specialty filter is invisible until the drawer is opened.** Specialties are a powerful differentiator (SMSF, First Home Buyers, FIRB, Aged Care, Divorce Finance, etc.) but they're buried in "All filters" with no summary pill on the main bar. A user who wants "SMSF specialist + property advisor" has no quick path.

**GAP 2 — No cross-type specialty routes.** The type filter gives `/advisors/financial-planners` etc. but there's no `/advisors?specialty=SMSF` URL surfaced anywhere in the nav or hub pages. The deep-link works, it's just never exposed.

**GAP 3 — Advisor types added in 2026 (mining_lawyer, royalty_broker, art_advisor, wine_advisor, classic_car_specialist, luxury_asset_broker, energy_financial_planner, resources_fund_manager, petroleum_royalties_advisor, smsf_auditor, immigration_investment_lawyer, conveyancer, property_lawyer, foreign_investment_lawyer, etc.) have no dedicated `/advisors/<type>` hub pages** — they're only reachable via the `[type]` dynamic route. The dynamic route works (200) but has no SEO title/description tailored to the specialty.

**GAP 4 — Firm filter (drawer) can't drill by multiple firms.** It's a single-select dropdown. Useful but limited.

**GAP 5 — "Expert Teams" tab is decoupled from type/specialty filters.** Selecting a type filter (e.g. "SMSF Specialists") correctly filters individuals but teams still show everything — only state + search filter teams.

---

## 2. Investment Listings (/invest/*/listings)

### What exists (source: InvestListingsClient.tsx + MarketplaceFilterBar.tsx)

**Quick starts (horizontal presets):**
- Foreign-buyer eligible (FIRB)
- Buy & operate a business
- Income (5%+ yield)
- Growth & raises (equity/project equity, wholesale-gated)
- Collectibles & alternatives (physical assets, royalties)
- Public markets (ASX / listed securities)

**Primary filter bar pills:**
| Pill | Options |
|------|---------|
| Sector | All vertical categories (startups, commercial-property, farmland, funds, mining, etc.) |
| Kind | for_sale_business, for_sale_asset, equity_raise, project_equity, royalty, fund, physical_asset, listed_security |
| Budget | Under $10k → $10M+ (5 buckets) |
| Location | State (NSW/VIC/QLD/WA/SA/TAS/ACT/NT) with counts |

**Advanced drawer:**
| Filter | Notes |
|--------|-------|
| Investor type | Retail (PDS path), Wholesale (s708), SMSF trustee, SIV-complying, Family office |
| FIRB eligible | Toggle |
| SIV-complying | Toggle |
| Wholesale only | Toggle |
| ESIC eligible | Toggle |
| Min yield | Numeric % slider/input |
| Freshness | New this week, Closing soon |
| Featured only | Toggle |

**Sort:** Newest first, Price low→high, Price high→low, Most viewed, Closing soon

**View modes:** Grid, List, Table

**URL persistence:** All params URL-backed, shareable.

### URL params tested — all 200 ✓
- `?kind=equity_raise`, `?firb=eligible`, `?esic=true`
- `?price=under-10k`, `?investor=retail`, `?investor=wholesale`
- `?min_yield=5`, `?state=NSW`, `?min_yield=8` (funds)
- `?kind=equity_raise&firb=eligible&esic=true` (3-way combo)
- `?fresh=new_this_week`, `?fresh=closing_soon`
- Cross-sector: `/invest/commercial-property/listings?kind=equity_raise`, `/invest/funds/listings?min_yield=8`

### Gaps / Issues

**GAP 1 — Sub-category filter is invisible.** Each vertical has sub-categories stored in the DB (e.g. for startups: fintech, proptech, medtech, agritech, cleantech). The filter pipeline supports `?sub=<value>` and `SubCategoryNav` exposes it, but there are no filter chips or UI controls to reach sub-categories from the main filter bar. A user can't filter "startups + fintech only" without knowing to manually type the URL.

**GAP 2 — Kind filter is untailored per vertical.** On `/invest/startups/listings`, the Kind pill shows all 8 listing kinds — including `for_sale_business`, `for_sale_asset`, `physical_asset` which have zero startup listings. The filter correctly returns 0 results but the UI doesn't disable/hide irrelevant kinds. The `filterSpecForKind` function exists but isn't wired to restrict the pill options per vertical.

**GAP 3 — No yield range filter for income-seeking verticals.** The "Income" quick-start sets `min_yield=5` but there's no max yield or yield-range slider. For bonds, private credit, or infrastructure funds, a user might want to find "5–12% yield" deals.

**GAP 4 — "Investor type" filter is largely unexercised.** The `sophisticated` and `family_office` values exist in the type enum but don't have filter logic wired (`activeInvestorType === "retail"` and `"siv"` are the only two handled in the filter pipeline). Selecting "Sophisticated investor" or "Family office" silently returns the same results as "Any".

**GAP 5 — Cross-sector marketplace (`/invest`) doesn't link to sub-category pages.** From the marketplace you can pick a sector (navigates to `/invest/startups/listings`) but you can't deep-link directly to `/invest/startups/listings?sub=fintech` without knowing the URL. The sub-category nav (`SubCategoryNav`) only appears INSIDE a vertical page and only when sub-categories exist.

---

## 3. Confirmed Bug: Dead-link 404s on Listing Detail Pages

**Status: REAL — consistent across 3 retry attempts**

Three startup listing slugs are linked from detail pages at the retired flat path:
- `/invest/listings/agritech-platform-series-a` → **404**
- `/invest/listings/fintech-b2b-payments` → **404**
- `/invest/listings/medtech-remote-monitoring` → **404**

Correct canonical paths (all 200):
- `/invest/startups/listings/agritech-platform-series-a`
- `/invest/startups/listings/fintech-b2b-payments`
- `/invest/startups/listings/medtech-remote-monitoring`

**Root causes (two code paths):**

1. **`components/ListingCard.tsx:168`** — `getDetailPath()` switch had no cases for vertical aliases (`"startups"` vs `"startup"`) and was missing newly-added verticals (aquaculture, digital-infrastructure, livestock, royalties, carbon-environmental-markets, etc.). All fell to `default: return /invest/listings/${slug}`.

2. **`components/InvestListingsClient.tsx:740,771`** — Table view hardcoded `/invest/listings/${l.slug}` instead of using canonical `listingUrl(l)`.

**Fix applied in this session:**
- `ListingCard.tsx`: Added `normaliseVertical()` call before switch + added 9 missing vertical cases.
- `InvestListingsClient.tsx`: Imported `listingUrl` and replaced both table-view hardcoded paths.

---

## 4. Minor: Advisor journey bot drift

The advisor journey bot followed links rather than clicking filter UI (expected — link crawler can't click JS popovers). It found no broken routes and all advisor `?type=` URL param forms returned 200. The single `502` in console errors was a transient Next.js image optimization miss (not a filter issue).

---

## Recommendations (priority order)

### High (filter usability)
1. **Add a "Specialty" quick pill** to the advisor filter bar (alongside Type/Location/Fee/Rating). Show the top 8–10 specialties by advisor count. Clicking opens the same facet grid already in the drawer.
2. **Wire sub-categories into the listings filter bar.** When a vertical is locked, show a "Sub-type" pill that opens a popover with the sub-categories derived from the current result set (same pattern as Type in advisors).
3. **Fix Kind pill on locked vertical pages** — disable or hide listing kinds with 0 results in the current vertical.

### Medium (coverage)
4. **Add hub pages for new advisor types** (mining_lawyer, royalty_broker, energy_financial_planner, etc.) — at minimum a `[type]` page with a meaningful H1, description and FAQs rather than the generic fallback.
5. **Wire `sophisticated` and `family_office` investor type filters** in the listings pipeline — currently they match nothing.

### Low (polish)
6. **Add max-yield filter** for income-focused verticals (bonds, private credit, infrastructure).
7. **Expose sub-category deep-link paths** from sector hub pages (`/invest/startups` → chips for fintech / proptech / medtech / agritech / cleantech).
