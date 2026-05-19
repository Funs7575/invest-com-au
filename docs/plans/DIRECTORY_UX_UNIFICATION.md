# Directory UX Unification — Mega Session Plan

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

## Open questions (need decisions before code)

1. **Map library**: Mapbox GL JS (paid free tier, polished mobile) or Leaflet (free, OSM, needs clustering plugin)?
2. **Mobile filter UX**: bottom-sheet drawer (native feel) vs inline panel (keeps results visible) vs both (drawer mobile, inline desktop — my recommendation)?
3. **Save vs shortlist vs compare** — are these one feature, two, or three? My read: shortlist + compare = same feature ("things I'm tracking, optionally compare them"); save-search is distinct ("notify me when new matches appear"). Confirm?
4. **Pillar pages**: should `/share-trading`, `/crypto`, `/savings`, `/robo-advisors` become filterable broker directories, or stay editorial? Strategic — coordinate with Fin.
5. **URL slug convention**: comfortable with `/advisors`, `/opportunities`, `/brokers`, `/super-funds` for directories + `/find-advisor` for quizzes + `/compare/*` for tables? Or keep `/invest` as primary slug?
6. **Banner stacking order**: when multiple banners apply (country pill + country recommendation + rule alert), what order? Suggest: pill → rule alerts (urgent) → recommendation (advisory). Acceptable?

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
