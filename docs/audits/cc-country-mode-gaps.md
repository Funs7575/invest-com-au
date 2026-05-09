# Country Mode — Coverage Audit (CC-01)

**Date:** 2026-05-08  
**Auditor:** audit-remediation loop iter 319  
**Queue item:** CC-01  
**Refs:** `lib/country-mode/`, `docs/architecture/country-mode.md`

---

## Summary

The country-mode infrastructure (`lib/country-mode/`) is fully implemented and
tested, but three integration gaps exist between the library and production call
sites. Two of these are by design for Phase 1 (GeoIP SSR deferral, language
routing scaffold), and one requires a targeted fix (priority-chain wiring for
URL params on non-quiz pages). The NZ supply threshold is the highest-priority
tuning item.

---

## Gap 1 — `resolveCountryFromContext` never called in production

**Severity:** Medium (UX gap, not a bug)  
**Informs:** CC-03

`lib/country-mode/resolve-country.ts:resolveCountryFromContext()` implements the
full 5-level chain (URL param → cookie → GeoIP → fallback). It is exhaustively
tested but **no production component or page calls it**. Every call site uses
`getIntentCountry()` from `lib/intent-context-server.ts`, which only reads the
`iv_intent_country` cookie (levels 2/3 of the chain).

**Practical impact:**
- `?country=<slug>` URL params have no effect on server-rendered country-mode
  strips (homepage wrappers, `IntentCountryBadge`, `IntentCountryRecommendation`).
  Only the `/quiz` page handles `?country=` — as a client-side state pre-seed,
  not via `resolveCountryFromContext`.
- A user arriving from `/foreign-investment/india` (which sets the cookie on
  accept) gets country context. A user who deep-links with `?country=india` to
  the homepage gets no country context at first render.
- GeoIP only fires client-side via `GeoSoftPrompt` after hydration. This is
  intentional per `docs/architecture/country-mode.md` ("GeoIP suggests, never
  forces; renders nothing during SSR to avoid cache-fragmentation"). Acceptable
  by design.

**Recommended fix (CC-03):**  
Update `getIntentCountry()` (or add a new `resolveServerCountry(searchParams?)`)
that calls `resolveCountryFromContext` with:
- `urlParam`: from `searchParams.get("country")` where the caller has access
- `cookie`: `cookies().get(INTENT_COUNTRY_COOKIE)?.value`
- `geoIso`: skip at SSR to preserve ISR cacheability (keep GeoSoftPrompt
  as the only GeoIP path)

Callers requiring URL param support: homepage wrappers, `IntentCountryBadge`,
`IntentCountryRecommendation`. Pages that don't accept `searchParams` (deep in
layout subtrees) stay cookie-only — acceptable.

---

## Gap 2 — NZ supply threshold edge case

**Severity:** Low-Medium (affects NZ homepage strip visibility)  
**Informs:** CC-02

`SUPPLY_THRESHOLDS` (listings: 2, experts: 2, platforms: 3) are uniform across
all 12 countries. NZ is the only country with `nonResidentsOnly: false` — Kiwis
get resident-equivalent access, so the platform strip queries a wider pool.
However, NZ's listing verticals (`["funds", "commercial-property", "buy-business"]`)
and expert specialties target a Trans-Tasman niche that may return < 2 rows in
the current DB state.

**Observed:** No `homepageListingFilters.firb` set to `true` for NZ (correct —
NZ citizens don't need FIRB). If the listings query filters by `firb: false`
AND the three verticals AND supply threshold is 2, the strip may not render.
This is empirically testable against the live DB.

**Recommended fix (CC-02):**  
1. Run a live query for each filter set against the Supabase DB to measure
   current supply. If any filter returns < threshold rows, either:
   a. Add NZ to a `perCountryOverrides` map in `supply-thresholds.ts` with
      lower thresholds (listings: 1, experts: 1, platforms: 2), OR
   b. Broaden NZ's `homepageListingFilters.verticals` to include `"real-estate"`.
2. The architecture doc says thresholds are "Phase 1 conservative" — NZ is
   the most likely candidate for per-country override.

---

## Gap 3 — IN/SG/HK language routing not wired

**Severity:** Low (Phase 5 scaffold, explicitly deferred)  
**Informs:** CC-03 (partial)

`CountryConfig` has `hasRtlLanguage`, `defaultLanguage`, `supportedLanguages`,
`languageRoutes`, `rtlReady` fields. For IN (`["hi", "en"]`), SG (`["en", "zh"]`),
HK (`["zh", "yue", "en"]`), these are populated but nothing reads them.

This is correctly deferred to Phase 5 per the architecture doc. It is NOT a
gap to fix now — it's a known scaffold.

However, `homepageExpertFilters.languages` for IN (`["hi", "en"]`) and HK
(`["zh", "yue", "en"]`) is meaningful today: advisors who speak Hindi or
Cantonese/Mandarin exist in the DB. The filter IS used by `CountryExpertsPreview`
via `getHomepageFiltersForCountry`. No gap here.

---

## Gap 4 — No country-mode E2E tests

**Severity:** Medium (regression risk)  
**Informs:** CC-04

No Playwright tests exercise country-mode flows:
- Cookie-set → homepage re-renders with country strips
- `?country=<slug>` URL param → quiz pre-seed
- GeoSoftPrompt rendering (mocked geo)

The unit tests for `resolveCountryFromContext`, `applySupplyThresholds`, and
`getHomepageFiltersForCountry` are good (all three test files exist and pass).
But there's no integration-level coverage of the SSR → client hydration flow.

---

## Gap 5 — No hreflang / locale-aware sitemap

**Severity:** Low (SEO opportunity, not a bug)  
**Informs:** CC-05

The sitemap at `app/sitemap.ts` generates AU-centric URLs. There are no
`hreflang` alternates for the 12 foreign-investment hub pages, and no
`/foreign-investment/<slug>` entries with `x-default` / language alternates.

---

## Pages audited for country-mode wiring

| Page | Uses `getIntentCountry()` | Uses `resolveCountryFromContext` | Notes |
|---|---|---|---|
| `app/page.tsx` (homepage) | Via wrappers | ✗ (gap 1) | 5 country-mode wrapper components |
| `app/advisors/page.tsx` | ✓ (`IntentCountryBadge`, `IntentCountryRecommendation`) | ✗ | Cookie-only; URL param not supported |
| `app/compare/non-residents/page.tsx` | ✗ | ✗ | No country-mode integration at all |
| `app/quiz/page.tsx` | ✗ | ✗ | Handles `?country=` client-side directly |
| `app/foreign-investment/[country]/page.tsx` | ✗ | ✗ | Dynamic country hub; sets cookie on page load via `setIntentCountryAction` |
| `app/layout.tsx` | `GeoSoftPrompt` (client-side) | ✗ | By design (SSR/caching trade-off) |

`/compare/non-residents` is explicitly referenced in the architecture doc as a
"country dimension" page ("reads the cookie to default their filter") but does
NOT currently read the cookie. This is a concrete wiring gap to address in CC-03.

---

## Action plan summary

| CC item | Root cause | Recommended action |
|---|---|---|
| CC-02 | NZ supply may fall below threshold | Measure live DB supply; add per-country threshold overrides if needed |
| CC-03 | URL param not wired to server rendering; `/compare/non-residents` misses cookie | Add `resolveServerCountry(searchParams?)` wrapper; wire `/compare/non-residents` to read `getIntentCountry()` |
| CC-04 | No E2E tests for country-mode | Add 3 Playwright tests (cookie-set, URL param on quiz, GeoSoftPrompt mock) |
| CC-05 | No hreflang in sitemap | Add `/foreign-investment/<slug>` entries with country `lang` attribute |
