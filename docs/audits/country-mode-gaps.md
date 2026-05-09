# Country-Mode Coverage Audit

**Generated:** 2026-05-09 (iter 332 / CC-01)
**Source files:** `lib/country-mode/`, `lib/intent-context.ts`, `lib/foreign-investment-country-data.ts`, `app/sitemap.ts`

---

## Current state

### Resolution chain
`lib/country-mode/resolve-country.ts` implements a pure 5-level chain:
URL param → cookie (`iv_intent_country`) → GeoIP (`/api/geo`) → AU/global fallback.
Covers all 12 `IntentCountryCode` values: `uk us cn in jp sg hk kr my nz ae sa`.

### Homepage filter coverage
All 12 country configs in `lib/foreign-investment-country-data.ts` define
`homepageListingFilters`, `homepageExpertFilters`, and `homepagePlatformFilters`.
The `lib/country-mode/filters.ts` `getHomepageFiltersForCountry()` function maps any
`IntentCountryCode → HomepageFiltersForCountry` cleanly. **No gaps in the type layer.**

### Supply thresholds
`lib/country-mode/supply-thresholds.ts` applies a single **global** gate:
`listings ≥ 2`, `experts ≥ 2`, `platforms ≥ 3`. All-or-nothing per strip.
Values are intentionally conservative for Phase 1 (comment in file).
**No per-country tuning exists** — a country with only 1 active listing is fully hidden.

### i18n locale registry (`lib/i18n/locales.ts`)
4 locales registered: `en` (en-AU), `zh` (zh-CN), `ko` (ko-KR), `ar` (ar-AE).
Only one non-AU route live: `/ar/foreign-investment/united-arab-emirates`.
`zh` and `ko` routes are in country configs but no dedicated `/zh/` or `/ko/` pages exist.

### Sitemap (`app/sitemap.ts`)
AU-only. No `/ar/`, `/zh/`, `/ko/` paths included.
Only explicitly lists foreign-investment pages (e.g. `/foreign-investment/new-zealand`),
not locale-prefixed variants.

### E2E coverage (`e2e/`)
**Zero tests** for country-mode. Playwright specs cover smoke, a11y, error-boundaries,
and critical flows, but none of: country selector UX, soft-prompt accept/dismiss,
cookie persistence, or GeoIP fallback.

---

## Gap matrix

| CC item | Gap | Severity | Notes |
|---------|-----|----------|-------|
| CC-02 | NZ supply-threshold tuning | Low–Medium | Global threshold is 2; NZ may have thin listing/expert supply. **Needs DB supply query before deciding.** Query: `SELECT count(*) FROM professionals WHERE status='active' AND 'nz' = ANY(countries_served)` etc. |
| CC-03 | IN/SG/HK homepage wiring | Low | All three have `homepageListingFilters` populated. "Priority-chain gaps" appears to be a false positive at the infrastructure level. Actual gap is supply: does IN/SG/HK have enough real rows to clear the global threshold? |
| CC-04 | Country-mode E2E tests | High | No Playwright tests at all. Highest-value gap: tests for cookie persistence, soft-prompt accept/dismiss, and GeoIP fallback path. |
| CC-05 | Locale-aware sitemap | Medium | `/ar/`, `/zh/`, `/ko/` paths absent from sitemap. Currently only one `/ar/` route is live; sitemap gap will matter when language-routing scales in Phase 5. |

---

## Recommended next steps

1. **CC-02 (verify, not blindly implement):** Run the supply query against prod DB before writing threshold overrides. If NZ already has ≥ 2 listings and ≥ 2 experts, CC-02 is a false positive.
2. **CC-03 (false positive likely):** Re-verify after CC-02 supply check. If IN/SG/HK clear the global threshold, no infra change needed — mark false positive.
3. **CC-04 (build):** E2E Playwright tests. Minimum viable suite: (a) cookie set on country select, (b) cookie read on page reload → strips render, (c) soft-prompt dismiss persists, (d) GeoIP fallback renders global strips when no cookie. ~3 test cases, ~150 LOC.
4. **CC-05 (build):** Add locale-prefixed sitemap entries. Only emit entries for routes that actually exist (currently just `/ar/foreign-investment/united-arab-emirates`). Wire to `lib/i18n/locales.ts` so future locale pages auto-appear.
