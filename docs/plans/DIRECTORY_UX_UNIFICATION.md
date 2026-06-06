# Directory UX Unification — Mega Session Plan

---

## Surface-consistency pass — 2026-06-06 (bot-driven re-audit)

Re-audited `/compare`, `/advisors`, `/invest` on production with the screenshot bot.
The Phase-1/2 primitives (`components/directory/*`) shipped, so **filter chrome is
now largely shared** between `/advisors` and `/invest`. The remaining "doesn't feel
uniform" problem is the **page header / hero**, which is still hand-rolled per surface
— there is **no shared `DirectoryHero`**.

**Current state (prod):**
| Surface | Hero | Toolbar | Verdict |
|---|---|---|---|
| `/invest` (marketplace) | Dark stat-led hero: pill + "184 live opportunities. $6.9B in aggregate ask." + 4 stat tiles (`app/invest/page.tsx:247-290`) | TabBar + search + sort + view toggle | canonical |
| `/advisors` | Dark stat-led hero: pill + "147 licensed advisors. Three free intros." + stat tiles (`AdvisorsClient.tsx`, `advisorHeroStats` ~606) | TabBar + search + All-filters + sort | matches invest |
| `/compare` | **Light** plain `<h1>` + `<p>`, GetMatchedEmbed card above it, logo-laden category pills + separate Features/Max-fee/Rating dropdowns (`app/compare/page.tsx:171-179`) | **outlier** | **drifted** |

Root cause: invest & advisors independently render the *same* dark hero; compare renders a different light one. Extract one component, apply to all three.

### Mega-changes (this pass)

- **SC-1 — Extract `<DirectoryHero>`** (`components/directory/DirectoryHero.tsx`): dark gradient section, breadcrumb, `iv2-pill`, stat-led headline (lead + coral accent), subtitle, right-side stat-tile grid. Modeled exactly on the canonical `/invest` hero so adopting it there is a no-op visual.
- **SC-2 — Adopt on `/compare`** (the visible win): replace the light `<h1>` block with `<DirectoryHero>`; add a lightweight `head:true` broker-count query for live stat tiles (platforms tracked · categories · fees-checked freshness · free). Keep the table, `GetMatchedEmbed`, `DirectoryBanners`.
- **SC-3 — DRY-migrate `/invest`** to `<DirectoryHero>` (no visual change; proves parity).
- **SC-4 — DRY-migrate `/advisors`** hero to `<DirectoryHero>` (no visual change).
- **SC-5 — Toolbar semantics alignment** (advisors ↔ marketplace): advisors tabs = entity sub-types; marketplace "tabs" = filter-openers. Make both use `TabBar` for entity/category and move filter-openers into a consistent toolbar row. (Lower priority; after SC-1..4.)
- **SC-6 — Token polish**: recolor the `bg-violet-600` advisor shortlist/featured accent to the amber/slate system; standardize hero padding, stat-tile styling, breadcrumb position across all three.
- **SC-7 — Streamline `/compare` filters** (added 2026-06-06, user-reported "too many different filters"): the `/compare` index showed **two** category systems — the sticky `CompareNav` tab-bar (links out to other pages) *and* the in-page category pills (filter the table). Same labels, different behaviour. Make the in-page pills the single category control on `/compare`; remove the duplicate sticky `CompareNav` there (kept on the standalone `/compare/*` sub-pages); preserve every link as a quiet, clearly-secondary "Specialised comparisons" link row so nothing is orphaned for SEO. The in-page facet filters (Features / Max fee / Rating) are already popover-based with active `FilterChips` — left as-is (already streamlined).

Each is one mergeable PR. SC-1+SC-2 ship together (component + first adopter); SC-3, SC-4, SC-5, SC-6 follow.

---


**Status:** draft, awaiting decisions on the 6 open questions at the bottom
**Owner:** TBD
**Scope:** `/invest`, `/advisors`, `/find-advisor`, `/compare/*`, pillar pages, deal/discovery pages
**Created:** 2026-05-19

## The problem in one paragraph

The site has **five distinct directory patterns** that all solve "show a filterable list of things to a country-aware user." `/invest` and `/advisors` are each ~1100–1600 line client components that re-implement search, sort, tabs, filter drawer, and saved-search from scratch. `/find-advisor` is a 1612-line parallel quiz path that competes with `/advisors` for the same intent. `/compare/*` uses a third (table) pattern. `/share-trading`, `/crypto`, `/savings`, `/robo-advisors` use a fourth (pillar) pattern. `/deals` is a fifth (hybrid). Banners drift, tab styles drift, save-search semantics drift, and country-mode messaging is hardcoded in component switch statements rather than a data layer.

## Smoking-gun findings

1. **The dwelling-ban banner asymmetry is one missing line.** `<CountryRuleAlerts />` lives at `app/advisors/page.tsx:115` but is not imported on `/invest`. Adding it to `app/invest/page.tsx` near line 223 closes the asymmetry — the data API (`/api/country-rule-alerts`) already exists.

2. **Banner copy lives in a hardcoded switch.** `components/foreign-investment/IntentCountryRecommendation.tsx:59-100` is a `buildRecommendation(surface, country)` switch that returns `{title, body, href, cta}` per surface. That's why `/invest` says "FIRB-eligible only" and `/advisors` says "Specialist advisors" — they're hand-coded variants of the same component. There is no data layer.

3. **Two complete filter implementations:**
   - `components/InvestListingsClient.tsx` (1096 lines) — URL-param-first, slide-over drawer
   - `app/advisors/AdvisorsClient.tsx` (1630 lines) — local-state-first with 300ms debounced URL sync, inline collapsible panel
   - Zero shared filter components.

4. **Tab counts on `/advisors` are static.** `providerTypeCounts` is computed once at render — when the user changes filters, the tab counts don't update. "All 240" remains "All 240" even after narrowing to NSW Financial Planners. UX-misleading.

5. **Two separate advisor paths.** `/find-advisor` (quiz, 1612 lines, sessionStorage-backed) and `/advisors` (directory, 1630-line client) are completely independent. They share no components and have no cross-linking — the quiz can't deep-link into the directory, the directory can't pre-fill the quiz.

6. **Saved-search bifurcation.** `/invest` "Save search" persists full filter state as JSON to `/api/saved-searches`, requires sign-in, supports email digests. `/advisors` "Advisor alert" captures `{email, type, state}` only via `/api/advisor-alerts`, no auth, no filter state. Same feature in concept, two different APIs.

7. **Geographic data gap.** `Professional` has `latitude`, `longitude`, `distance_km` and `/advisors` already supports "Use my location" + radius. `InvestmentListing` has only `location_state`/`location_city` strings. No coordinates → no map view on `/invest` without a migration.

8. **Five directory patterns sitewide.** See `Pages classification` table below.

9. **The purple shortlist bar** at `app/advisors/AdvisorsClient.tsx:634-656` uses `bg-violet-600`, which appears nowhere else on the site (amber-dominant). It works but breaks the design system.

10. **Duplicate alert capture on `/advisors`** — two near-identical email signup widgets (lines 1420-1456 inside the no-results card, and lines 1566-1602 below the advisor guides).

11. **Zero-count tabs render disabled** on both pages — "Expert Teams 0", "Business 0", "Mining 0" etc. clutter the UI. No `hidden`, just `cursor-not-allowed`.

12. **"Free tools, no signup" is the actual text** at `components/HomeToolsStrip.tsx:109` — the screenshot rendered it weirdly as "NO GIMP", but the source is fine.

## Pages classification

| URL | Source | Pattern | Banners present | Save feature | Map? |
|-----|--------|---------|-----------------|--------------|------|
| `/invest` | `app/invest/page.tsx` + `components/InvestListingsClient.tsx` | Opportunities | `IntentCountryBadge`, `IntentCountryRecommendation` | Save search (full state + email) | ❌ |
| `/advisors` | `app/advisors/page.tsx` + `app/advisors/AdvisorsClient.tsx` | Advisors | `IntentCountryBadge`, `IntentCountryRecommendation`, **`CountryRuleAlerts`** | Shortlist + alert | ❌ (geo ready) |
| `/find-advisor` | `app/find-advisor/page.tsx` (single 1612-line client) | Quiz funnel | None | sessionStorage only | ❌ |
| `/compare` | `app/compare/page.tsx` | Compare-table | `IntentCountryBadge` + `ComplianceFooter` | Multi-select checkboxes | ❌ |
| `/compare/super`, `/compare/insurance`, `/compare/etfs` | `app/compare/*/page.tsx` | Compare-table | `ComplianceFooter` | Multi-select checkboxes | ❌ |
| `/share-trading`, `/crypto`, `/savings`, `/robo-advisors` | Driven by `lib/verticals.ts` + `<VerticalPillarPage>` | Pillar | `ForeignInvestorCallout` (some), `ComplianceFooter` | ❌ | ❌ |
| `/deals` | `app/deals/page.tsx` | Hybrid | Inline `ADVERTISER_DISCLOSURE_SHORT` | ❌ | ❌ |
| `/best` | `app/best/page.tsx` | Discovery (not a directory) | None | n/a | n/a |
| `/brokers` | `app/brokers/page.tsx` | 301 redirect → `/compare` | n/a | n/a | n/a |

## The target architecture

**Don't rewrite the pages.** Extract primitives, then incrementally migrate.

Target end state:

```
components/directory/
├── DirectoryBanners.tsx       # stacks IntentCountryBadge + RuleAlerts + Recommendation
├── DirectoryToolbar.tsx       # search + sort + view-mode + save (configurable)
├── SearchInput.tsx            # controlled input + clear + ARIA
├── SortDropdown.tsx           # configurable options array
├── TabBar.tsx                 # counts, zero-count hide/disable config, horiz scroll
├── FilterPanel.tsx            # drawer | inline, accepts sections[]
├── ResultCount.tsx            # consistent "X listings found" + per-facet stat pills
├── DirectoryMap.tsx           # lat/lng → markers (post-migration)
├── SaveDirectoryButton.tsx    # search-state save | shortlist | none
└── useDirectoryParams.ts      # URL-param-first state hook (schema-typed)

lib/foreign-investment-country-data.ts
└── add pageRecommendations: Record<Surface, Record<CountryCode, RecCopy>>

lib/directory/
└── geo.ts                     # shared geocoding + radius + autocomplete
```

The two directory pages keep their distinct logic (eligibility filtering, match scoring, etc.) but use these primitives for chrome. Eventually a thin `<DirectoryPage entity="..." config={...}>` shell may emerge, but don't force it.

---

## Multi-session plan

**Convention:** each session is sized to fit one Claude session (~30–90 min of focused work) producing a single mergeable PR.

### Phase 1 — Quick wins and banner unification (3 sessions)

#### Session 1 — Close the banner asymmetry
**Files:** `app/invest/page.tsx`
**Risk:** ⚪ Low
- Import and render `<CountryRuleAlerts />` between `IntentCountryBadge` and `IntentCountryRecommendation` (consistent with `/advisors`)
- Extract a `<DirectoryBanners surface="invest" />` wrapper that composes all three banners in canonical order
- Use it on `/invest`, `/advisors`, and (optionally) `/compare`
- Tests: snapshot test for each surface confirming render order

**Acceptance:** When `iv_intent_country=gb` cookie set, `/invest` shows the dwelling-ban warning matching `/advisors`.

#### Session 2 — Move recommendation copy to data layer
**Files:** `components/foreign-investment/IntentCountryRecommendation.tsx`, `lib/foreign-investment-country-data.ts`
**Risk:** 🟡 Medium (touches compliance copy — Tier C; announce intent before merging per CLAUDE.md)
- Replace the switch at lines 59-100 with a lookup against new `pageRecommendations` map in `lib/foreign-investment-country-data.ts`
- Shape:
  ```ts
  pageRecommendations: {
    invest: { gb: { title, body, href, cta }, us: {...}, nz: {...}, default: {...} },
    advisors: { gb: {...}, us: {...}, nz: {...}, default: {...} },
    compare: {...},
  }
  ```
- Snapshot tests for every (surface, country) pair currently in the switch — must produce identical copy
- This unblocks "add a new country" without a code change

#### Session 3 — Banner visual unification
**Files:** `components/foreign-investment/*`
**Risk:** ⚪ Low
- Extract banner color tokens to `components/foreign-investment/tokens.ts`:
  - `BANNER_AMBER_BG`, `BANNER_AMBER_BORDER`, `BANNER_EMERALD_BG`, etc.
- Replace inline `bg-amber-50 border-amber-200` with token references
- Standardize border radius (`rounded-2xl`), padding (`p-4 md:p-5`), and max-width
- Add `role="region"` + `aria-label` consistently
- Audit `aria-live` — country recommendation appearing on mount is a perceived UX jump; consider `aria-live="polite"`

### Phase 2 — Filter primitives (4 sessions)

#### Session 4 — Extract `<SearchInput>` and `<SortDropdown>`
**Files:** new `components/directory/SearchInput.tsx`, `components/directory/SortDropdown.tsx`, plus consumer edits on both pages
**Risk:** ⚪ Low
- `<SearchInput>` props: `{ value, onChange, placeholder, onClear, ariaLabel?, name? }`. Renders icon + clear-X + native input with `role="search"` form wrapper.
- `<SortDropdown>` props: `{ options: Array<{value, label}>, value, onChange, ariaLabel? }`. Wraps native `<select>` for accessibility.
- Replace inline implementations:
  - `components/InvestListingsClient.tsx` lines ~444-476, ~496-503
  - `app/advisors/AdvisorsClient.tsx` lines ~700, ~709-716
- Tests for both primitives + integration tests for both pages

#### Session 5 — Extract `<FilterPanel>` with drawer + inline variants
**Files:** new `components/directory/FilterPanel.tsx`, `components/directory/FilterSection.tsx`; consumer edits
**Risk:** 🟡 Medium (filter UX touches every interaction)
- Component accepts:
  - `sections: FilterSection[]` — each section has `label`, `children`
  - `variant: "drawer" | "inline"` — drawer is mobile/overlay, inline is desktop sidebar
  - `open`, `onClose`, `onClearAll`
  - `responsiveMode?: "always-drawer" | "always-inline" | "mobile-drawer-desktop-inline"`
- Reimplement the existing `FilterDrawer()` in `InvestListingsClient` (lines 859-1055) and the inline panel in `AdvisorsClient` (lines 720-887) as consumers
- Decision deferred from open Q2 below: default `"mobile-drawer-desktop-inline"` — best of both
- ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` for drawer; Escape to close (already in InvestListingsClient:868-877)

#### Session 6 — `<TabBar>` + `<ResultCount>` primitives, fix zero-count UX
**Files:** new `components/directory/TabBar.tsx`, `components/directory/ResultCount.tsx`; consumer edits
**Risk:** 🟢 Low (mostly visual)
- `<TabBar>` props: `{ tabs: Array<{ id, label, count?, icon? }>, value, onChange, zeroCountBehavior: "hide" | "disable" | "show", scrollable? }`
- **Default `zeroCountBehavior: "hide"`** — fixes the "Expert Teams 0", "Business 0", "Mining 0" clutter
- `<ResultCount>` shows "X listings" with optional stat pills (FIRB-eligible, SIV-complying)
- Replace tab rendering at:
  - `InvestListingsClient.tsx` lines 530-619 (kind tabs + category tabs)
  - `AdvisorsClient.tsx` lines 661-695 (provider type tabs)
- **Bonus fix:** Make `/advisors` tab counts dynamic — recompute from current `filtered` array, not the unfiltered base

#### Session 7 — URL-param state alignment
**Files:** new `lib/directory/useDirectoryParams.ts`; consumer edits to `AdvisorsClient.tsx`
**Risk:** 🟡 Medium (changes URL semantics on `/advisors`)
- Build a typed hook: `useDirectoryParams<Schema>()` returning `[params, setParams]` with `router.replace({ scroll: false })`
- Migrate `/advisors` off local-state + 300ms debounced sync (lines 345-360 of AdvisorsClient) to immediate URL sync (the `/invest` pattern)
- Document the canonical param schema:
  - `q` = search query
  - `sort` = sort key
  - `view` = view mode (grid|list|table|map)
  - `<facet>` = filter facets (kind, state, specialty, etc.)
- Add 301 redirects only if any params are renamed

### Phase 3 — Save / shortlist / compare unification (1-2 sessions)

#### Session 8 — Resolve the "save" mental model
**Files:** `app/api/saved-searches/*`, `app/api/advisor-alerts/*`, `components/invest/SaveSearchButton.tsx`, `app/advisors/AdvisorsClient.tsx`, `lib/hooks/useAdvisorShortlist.ts`
**Risk:** 🟡 Medium (touches APIs and persistent data)
- **Requires decision from open Q3.** Recommended split:
  - **"Save search"** (intent: notify me when matches appear) — full filter state, sign-in, email digests. Apply to both `/invest` and `/advisors`.
  - **"Shortlist"** (intent: things I'm tracking right now) — entity IDs in localStorage with optional sign-in sync. Already on `/advisors`; add to `/invest`.
  - **"Compare"** is a view mode on top of shortlist (≥2 selected → show compare button).
- Migrate `/api/advisor-alerts` to subset of `/api/saved-searches` with `kind: "advisor-search"`
- Extract `<SaveDirectoryButton>` that handles both
- Remove the duplicate alert capture on `/advisors` (lines 1420-1456 OR 1566-1602 — keep only one)
- Recolor the shortlist bar — `bg-violet-600` → `bg-slate-900` or amber (open Q for design)

### Phase 4 — Geographic / map (3 sessions)

#### Session 9 — Schema migration: lat/lng on investment_listings
**Files:** `supabase/migrations/<new>.sql`, `lib/types.ts`
**Risk:** 🔴 High (production DB change, Tier C — announce intent)
- Forward-only migration adding `latitude DOUBLE PRECISION`, `longitude DOUBLE PRECISION` to `investment_listings`
- Idempotent (`IF NOT EXISTS`), with `COMMENT` and rollback note (per CLAUDE.md migration discipline)
- RLS unchanged (already public read for active listings)
- Update TS type `InvestmentListing`
- **Don't backfill in the migration** — separate cron job, see Session 9.5

#### Session 9.5 — Geocoding backfill cron
**Files:** new `app/api/cron/geocode-listings/route.ts`
**Risk:** 🟡 Medium
- Cron route (Vercel-cron-style, `requireCronAuth` first per CLAUDE.md convention)
- Reads listings where `latitude IS NULL`, geocodes `${location_suburb}, ${location_state}, Australia` via existing provider (whatever `/api/advisor-search/postcodes` uses — confirm)
- Rate-limited, batched (50/run, runs every 10 min until done)
- Logs progress via structured logger
- One-off until backfilled, then triggers on insert via a Supabase trigger (or a "new listing" hook)

#### Session 10 — `<DirectoryMap>` component
**Files:** new `components/directory/DirectoryMap.tsx`, package.json (map library)
**Risk:** 🟡 Medium
- **Requires decision from open Q1: Mapbox vs Leaflet.** Recommendation: **Mapbox GL JS** — better mobile UX, generous free tier (50K loads/mo), already an enterprise standard, supports clustering out of the box. Leaflet works but the developer ergonomics are worse and clustering needs a plugin.
- Props: `{ items: Array<{ id, lat, lng, label, badge? }>, selectedId?, onSelect, defaultBounds? }`
- Marker clustering, popup with mini-card, fitBounds on items change
- Wire into `/advisors` first (data is ready) as the 4th view mode after grid/list/table
- Test on slow 3G — defer Mapbox JS until view mode = "map"

#### Session 11 — `/invest` map view + geo search
**Files:** `components/InvestListingsClient.tsx`, new `lib/directory/useGeoSearch.ts`
**Risk:** 🟡 Medium
- Depends on Session 9 + 9.5 (backfill must be ~complete)
- Extract `useGeoSearch()` hook from current `/advisors` autocomplete + geolocation logic (AdvisorsClient.tsx lines 107-180)
- Add "Use my location + radius" to InvestListingsClient
- Add map view as 4th view-mode toggle

### Phase 5 — Cross-page consistency (3 sessions)

#### Session 12 — Apply primitives to `/compare/*`
**Files:** `app/compare/page.tsx`, `app/compare/super/page.tsx`, `app/compare/insurance/page.tsx`, `app/compare/etfs/page.tsx`
**Risk:** 🟡 Medium
- Replace banner stack with `<DirectoryBanners>`
- The table itself is intentionally different — keep it
- Add `<ResultCount>` above table
- Optional: add `<SearchInput>` for text search within table
- Settle multi-select compare UX vs shortlist (per Session 8 outcome)

#### Session 13 — Pillar pages: directory or editorial?
**Files:** `lib/verticals.ts`, `components/VerticalPillarPage.tsx` (or equivalent), all four pillar pages
**Risk:** 🟡 Medium (strategic decision)
- **Requires decision from open Q4.** If pillar pages should become filterable broker directories:
  - Refactor `<VerticalPillarPage>` to optionally render `<InvestListingsClient>`-style chrome
  - Migrate `/share-trading`, `/crypto`, `/savings`, `/robo-advisors`
- If they stay editorial:
  - Just align banners + compliance footer + intro card style with `<DirectoryBanners>`
- Either way, this should be coordinated with Fin (per `docs/strategy/FIN_NOTEBOOK.md` — appears strategic)

#### Session 14 — URL slug normalization
**Files:** routing config, `lib/nav-registry.ts`, sitemap, internal link audit
**Risk:** 🟡 Medium (SEO impact)
- **Requires decision from open Q5.** Recommended convention:
  - **Directories** (plural noun): `/advisors`, `/opportunities` (rename from `/invest`?), `/brokers`, `/super-funds`, `/savings-accounts`, `/insurance`, `/etfs`
  - **Quiz funnels**: `/find-advisor`, `/find-broker`
  - **Compare tables**: `/compare/[category]`
  - **Pillar pages**: `/learn/[vertical]` or keep editorial slugs
- Add 301 redirects from old paths
- Update `lib/nav-registry.ts` to surface the full directory set in the mega-menu (currently incomplete per audit)
- Sitemap regen
- **Don't rename `/invest`** without Fin's blessing — strong brand affinity

### Phase 6 — Polish (1-2 sessions)

#### Session 15 — Mobile UX + a11y sweep
**Files:** `components/directory/FilterPanel.tsx`, plus consumer pages
**Risk:** ⚪ Low
- Bottom-sheet drawer on mobile (more native-feeling than slide-over)
- Reduced-motion respect (`prefers-reduced-motion`) for filter open/close animations
- axe-core + Lighthouse pass on both pages, fix any findings
- Keyboard nav audit (tab order, focus trapping in drawer, Escape semantics)
- Touch target sizing — buttons ≥ 44px on mobile

#### Session 16 — `/find-advisor` ↔ `/advisors` integration
**Files:** `app/find-advisor/page.tsx`, `app/advisors/AdvisorsClient.tsx`
**Risk:** 🟡 Medium
- Quiz end-state should link to filtered `/advisors` (deep-link the quiz answers into URL params)
- "Build my action plan" CTA on `/advisors` should deep-link into quiz with `?source=advisors-directory`
- Remove the duplicate trust-pills implementations (three pages, three implementations)
- Cross-route shortlist (a user who saves on `/find-advisor` should see those advisors as shortlisted on `/advisors`)

---

## Quick-win micro-PRs (can ship today, in any order)

These don't require unification — they're isolated fixes:

| # | Change | File | Effort |
|---|--------|------|--------|
| QW1 | Add `<CountryRuleAlerts />` to `/invest` | `app/invest/page.tsx:223` | 5 min |
| QW2 | Hide zero-count tabs on `/advisors` ("Expert Teams 0") | `app/advisors/AdvisorsClient.tsx:677` (change `disabled` to conditional `null`) | 10 min |
| QW3 | Hide zero-count kind/category tabs on `/invest` | `components/InvestListingsClient.tsx:549-619` | 15 min |
| QW4 | Make `/advisors` tab counts dynamic (recompute from filtered list) | `AdvisorsClient.tsx:669-689` | 20 min |
| QW5 | Remove duplicate alert capture (keep no-results, drop bottom widget OR vice versa) | `AdvisorsClient.tsx:1566-1602` | 10 min |
| QW6 | Recolor shortlist bar from `bg-violet-600` to `bg-slate-900` | `AdvisorsClient.tsx:634-656` | 5 min |
| QW7 | Add a "Browse all advisors" link to `/find-advisor` confirmation step | `app/find-advisor/page.tsx:~1592` | 10 min |

## Progress (2026-05-19)

### Merged into main
- **PR #950** — `vercel.json` — drop unsupported `_regions_note` key blocking every preview deploy
- **PR #951** — ETF screener lint — `let`→`const` + `<SortIcon>` extraction, clears blocking lint error
- **PR #952** — Five directory quick-wins (`<CountryRuleAlerts />` on `/invest`, zero-count tabs hidden, duplicate alert widget removed, shortlist bar recolored slate-900)

### Open PRs by phase

| Phase / Session | PR | Status |
|-----------------|----|--------|
| (gate) a11y unblock — drop `role="menu"` from 4 nav dropdowns | [#953](https://github.com/Funs7575/invest-com-au/pull/953) | Open |
| Plan doc | [#948](https://github.com/Funs7575/invest-com-au/pull/948) | Open |
| **Phase 1** banner stack unification (`<DirectoryBanners>`, data-layer recommendations, `banner-tokens.ts`) | [#954](https://github.com/Funs7575/invest-com-au/pull/954) | Open |
| **Phase 2 Session 4** — `<SearchInput>`, `<SortDropdown>` primitives + consumer migration | [#955](https://github.com/Funs7575/invest-com-au/pull/955) | Open |
| **Phase 2 Session 6** — `<TabBar>`, `<ResultCount>` primitives + consumer migration | [#956](https://github.com/Funs7575/invest-com-au/pull/956) | Open |
| **Phase 2 Sessions 5 + 5.5** — `<FilterPanel>`, `<FacetGroup>`, `<RangeSlider>` primitives | [#957](https://github.com/Funs7575/invest-com-au/pull/957) | Open |
| **Phase 6 (partial)** — `/find-advisor` deep-link with quiz context + extracted lib + tests | [#958](https://github.com/Funs7575/invest-com-au/pull/958) | Open |
| **Phase 3 (partial)** — `<CompareBar>` primitive | [#959](https://github.com/Funs7575/invest-com-au/pull/959) | Open |

### Still to do (after merges unblock)
- **Phase 2 Session 5b** — migrate `InvestListingsClient` FilterDrawer + `AdvisorsClient` inline panel to use `<FilterPanel>` + `<FacetGroup>` + `<RangeSlider>` (depends on #957 merge to avoid conflicts)
- **Phase 2 Session 7** — URL-param state alignment on `AdvisorsClient.tsx` (~15 filter states currently local; align to `/invest`'s URL-first pattern) (depends on #955/#956)
- **Phase 3 Session 8 (full)** — refactor `lib/hooks/useShortlist.ts` from broker-specific to generic, add `useAdvisorShortlist` + `useListingShortlist` thin wrappers, unify `/api/saved-searches` + `/api/advisor-alerts` (large)
- **Phase 4 Session 9** — schema migration adding `latitude`/`longitude` columns to `investment_listings` (Tier C, needs approval)
- **Phase 4 Session 9.5** — geocoding backfill cron route
- **Phase 4 Session 10** — `<DirectoryMap>` component using Mapbox GL JS (needs MAPBOX_TOKEN in Vercel env)
- **Phase 4 Session 11** — wire `useGeoSearch` + map view into `/invest`
- **Phase 5 Session 12** — apply primitives + `<DirectoryBanners>` to `/compare/super`, `/compare/insurance`, `/compare/etfs` (depends on #954+#956+#957)
- **Phase 5 Session 13** — pillar pages: filterable directories or stay editorial? (strategic — needs Fin)
- **Phase 5 Session 14** — URL slug normalization: add 301s for `/super-funds` → `/super`, `/savings-accounts` → `/savings`, etc.
- **Phase 6 Session 15** — mobile bottom-sheet drawer + `prefers-reduced-motion` respect (depends on Sessions 5b, 7)
- **Phase 6 Session 16** — cross-route shortlist sync between `/find-advisor` and `/advisors` (needs Phase 3 full)

### Decisions still pending
- **Q4** — pillar pages: filterable directories or stay editorial? Needs Fin's input.

## Decisions (locked in 2026-05-19)

| # | Question | Decision |
|---|----------|----------|
| 1 | Map library | **Mapbox GL JS** — better mobile UX, native clustering, 50K loads/mo free tier. Add API key to Vercel env before Session 10. |
| 2 | Mobile filter UX | **Drawer on mobile + inline on desktop** — `FilterPanel` default `responsiveMode: "mobile-drawer-desktop-inline"`. |
| 3 | Save model | **Three features**: Save Search (filter state + email digests, sign-in required) · Shortlist (entity IDs, localStorage→DB on sign-in) · Compare (view on top of shortlist with ≥2 selected). Apply to both `/invest` and `/advisors`. |
| 5 | URL slugs | **Plural directories + `/find-*` funnels**: keep `/invest` (brand-sensitive), normalize advisors/brokers/super-funds/savings-accounts/insurance/etfs to plurals; quizzes at `/find-advisor`; tables at `/compare/*`. 301s where renamed. |
| 6 | Banner stacking order | **Default**: country pill → rule alerts (urgent) → country recommendation (advisory). Bake into `<DirectoryBanners>` in Session 1. |

## Filter ambition — "comprehensive and great, can do lots" (2026-05-19 user direction)

The basic plan above ships *consistent* filters across pages. The user wants more — filters that are genuinely powerful, not just unified. Expanded filter scope (folded into Phase 2 sessions and a new Session 5.5):

### Per-entity filter facets (target state)

**Investment opportunities** (`/invest`):
- **Asset kind** (multi-select): For-sale business, Asset, Equity raise, Project equity, Royalty stream, Managed fund, Physical asset, Listed security
- **Category/sub-kind**: Mining, Farmland, Commercial property, Franchise, Renewable, Startups, Alternatives, Private credit, Infrastructure, Funds
- **Ticket size** (range slider): $1K → $10M+ with quick-bucket presets ("$1K-$10K", "$10K-$100K", "$100K-$1M", "$1M+")
- **Minimum yield %** (range): 0-30%, with "yield-bearing only" toggle
- **Investor type**: Retail, Wholesale (708), Sophisticated, Professional
- **Compliance flags**: FIRB-eligible, SIV-complying, Wholesale-only, ESIC
- **Tax structure**: SMSF-eligible, CGT discount eligible, Franking credits, Capital works deductions
- **Location**: State (multi-select) + suburb autocomplete + map-radius (post Session 11)
- **Status**: Open, Closing soon (<14 days), Closed, New this week, Featured
- **Time horizon**: Cash flow now, 1-3yr, 3-7yr, 7+yr
- **Risk tier**: 1-5 scale with descriptions
- **ESG**: Climate-positive, Indigenous-led, Social impact, B-Corp
- **Advisor opt-in**: "Has advisor coverage", "I have an advisor watching this"
- **Country-mode aware**: auto-apply FIRB filter when intent_country ≠ AU
- **Saved searches**: filter combinations savable + shareable via URL + email-digest on new matches

**Advisors** (`/advisors`):
- **Type** (multi-select): Financial planner, Mortgage broker, Buyers agent, Tax agent, SMSF accountant, Risk insurance, Estate planning, Aged-care advisor, Crypto advisor, Property advisor, Wealth manager, Debt counsellor
- **Specialty tags** (multi-select with autocomplete): SMSF setup, retirement planning, FIRB, international tax, property syndicates, etc. (open vocabulary)
- **Location**: State + "Use my location" + radius (10-200km) + remote-only toggle + map view
- **Fee structure**: Fixed, % AUM, commission, hybrid, free consultation, no minimum
- **Fee range** (slider): $0-$5K initial / $0-2% AUM
- **Verification**: ASIC-verified only, AFSL-licensed, professional body memberships (FPA, AFA, IPA)
- **Rating**: Minimum stars (1-5) + minimum review count threshold
- **Response time**: <1hr, <24hr, <48hr badges
- **Languages**: multi-select (Mandarin, Cantonese, Arabic, Vietnamese, Greek, Italian, Hindi, Punjabi, etc.)
- **Availability**: Accepting new clients, Video consultation, In-person, Weekend appointments
- **Cultural focus**: Indigenous Australians, women advisors, LGBTQ+-friendly, religious considerations
- **Country-aware specialty**: Cross-border tax, international clients, expat returnees
- **Compare**: select ≥2 → side-by-side compare view (fees, ratings, response time, specialties)
- **Saved searches + email alerts**: notify when matching advisors join

### Cross-cutting filter capabilities

- **Combinatorial logic**: AND across facets (default), OR within facets (multi-select)
- **URL-shareable state**: every filter combination produces a copyable URL (deep links for marketing + email digests)
- **Faceted counts**: each facet shows how many results would match if toggled — like Airbnb / Booking.com
- **Smart suggestions**: "Did you mean X?" / "12 results when you remove the SIV filter" empty-state guidance
- **Filter chips**: active filters shown as removable chips in the toolbar (already on `/invest`, formalize for both)
- **Sort by relevance**: sortable by match-score when user has investor profile / advisor preferences set
- **Recently-viewed memory**: page remembers last 5 filter sets across sessions
- **A11y**: full keyboard nav, screen-reader-friendly facet groups, no purely-color affordances
- **Mobile-first**: bottom-sheet drawer with sticky "Show N results" CTA at bottom, swipe-to-dismiss

### Filter primitives — expanded scope for Phase 2

The primitives from Session 4-7 must support:
- `<SearchInput>` — debounced, with autocomplete suggestions (typeahead against entity index)
- `<SortDropdown>` — configurable, with "Smart match" option when user profile exists
- `<FilterPanel>` — sections, sub-sections, accordion, "show advanced" disclosure
- `<TabBar>` — hide-zero-counts default, scroll-shadow indicators on mobile
- `<ResultCount>` — animated count updates, "X of Y total" framing
- `<FilterChips>` — removable active-filter chips, with "Clear all" affordance
- New: `<RangeSlider>` — numeric ranges (yield, ticket, fees, rating) with quick-bucket presets
- New: `<FacetGroup>` — checkbox group with live counts per option (Airbnb-style)
- New: `<LocationPicker>` — postcode/suburb autocomplete + geolocation + radius slider
- New: `<SaveSearchDialog>` — name the search + email frequency picker + alert toggle
- New: `<CompareBar>` — sticky bottom bar showing selected items + "Compare N" CTA
- New: `<EmptyState>` — context-aware empty results with smart suggestions

### New Session 5.5 — Advanced filter primitives

Inserted between Sessions 5 and 6:
- Build `<RangeSlider>`, `<FacetGroup>`, `<LocationPicker>` primitives
- Migrate the per-facet count logic to be live (recompute on every filter change, not static)
- Add typeahead/autocomplete to `<SearchInput>` (debounced API call to entity index)
- Empty-state component with smart suggestions

This adds 2-3 sessions to the overall plan (so target is now ~18-20 sessions / ~50 focused hours), but the resulting filter UX matches industry benchmarks (Airbnb, Booking.com, Domain.com.au).

## Still open

| # | Question | Why blocked |
|---|----------|-------------|
| 4 | Pillar pages: filterable directories or stay editorial? | Strategic — needs Fin's input per `docs/strategy/FIN_NOTEBOOK.md`. Doesn't block Sessions 1-12. Park until Session 13. |

## What this plan does NOT propose

- Rewriting either page from scratch — too risky, too many regressions
- Extracting a design system into a separate package — premature
- Touching `/best`, `/deals/[deal-slug]`, individual broker profile pages — those aren't directories
- Removing `<VerticalPillarPage>` — it serves a different purpose (editorial pillars), regardless of the open Q4 decision
- Touching auth flows, payment flows, admin pages — out of scope

## Sequencing notes

- **Sessions 1, 4, 6** are zero-decision wins — start there even before the open questions are answered.
- **Session 2** is Tier C (compliance copy) — announce in chat per `docs/audits/MERGE_AUTHORIZATION.md` before merging.
- **Session 9** is a forward-only migration — irreversible in prod. Treat as Tier C minimum.
- **Sessions 13, 14** are strategic and probably need Fin's input.
- The audit-remediation queue (`docs/audits/REMEDIATION_QUEUE.md`) is independent — these sessions should be queued separately to avoid colliding with the loop's parallel workers.

## Estimated effort

- Phase 1 (banners): 3 sessions, ~4 hours total
- Phase 2 (filter primitives): 4 sessions, ~10 hours
- Phase 3 (save/shortlist): 1-2 sessions, ~4 hours
- Phase 4 (geo/map): 3 sessions, ~8 hours (plus backfill cron runtime)
- Phase 5 (cross-page): 3 sessions, ~8 hours (or 4-6 if pillar refactor is in scope)
- Phase 6 (polish): 1-2 sessions, ~4 hours

**Total: ~15-17 sessions, ~40 focused hours** — but quick-wins QW1-QW7 deliver most of the visible UX improvement in a single afternoon.
