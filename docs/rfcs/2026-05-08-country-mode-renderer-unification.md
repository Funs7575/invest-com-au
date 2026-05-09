# RFC: Country Mode renderer unification

- **Status:** Proposed
- **Author:** Country Mode Phase 4
- **Date:** 2026-05-08
- **Related:** `docs/architecture/country-mode.md`, `lib/country-mode/`, `lib/foreign-investment-country-data.ts`, Phase 1+2 (12 country configs shipped)

## 1. Current state

`/foreign-investment/<country>` currently has **two parallel renderers** that produce different page shapes for overlapping country slugs.

### 1a. Config-driven (canonical for the 12 shipped countries)

- Source of truth: `lib/foreign-investment-country-data.ts` (4,300+ lines), exporting 12 `*_CONFIG` objects (`UK_CONFIG`, `US_CONFIG`, `CN_CONFIG`, `IN_CONFIG`, `HK_CONFIG`, `SG_CONFIG`, `NZ_CONFIG`, `JP_CONFIG`, `KR_CONFIG`, `MY_CONFIG`, `AE_CONFIG`, `SA_CONFIG`) plus the `COUNTRY_CONFIGS` registry keyed by `IntentCountryCode`.
- `CountryConfig` shape is rich: hero, two-audience cards, DTA rate table, FIRB/property tiles, FX corridor, pension/inheritance, expat case, migration pathways, FAQ, related links, lead-capture form, plus the Phase 1+2 Country Mode hooks (homepageListingFilters, homepageExpertFilters, homepagePlatformFilters, homepageFeaturedTools, preferredLanguages, hasRtlLanguage, defaultLanguage, supportedLanguages, languageRoutes, rtlReady).
- Each country has a thin standalone route file at `app/foreign-investment/<slug>/page.tsx` that imports the config and renders `<CountryHubTemplate config={…} />` (~30 lines, mostly metadata).
- Files: `app/foreign-investment/{china,hong-kong,india,japan,malaysia,new-zealand,saudi-arabia,singapore,south-korea,united-arab-emirates,united-kingdom,united-states}/page.tsx`. 12 routes, all live.
- Static, no DB query. Build-time copy; ISR `revalidate = 86400`.

### 1b. DB-backed (legacy dynamic route)

- Source of truth: Supabase tables `country_investment_profiles`, `foreign_investment_rates`, `professionals` (read-only filter by `accepts_international`).
- Single dynamic route: `app/foreign-investment/[country]/page.tsx`. Hard-codes a 7-entry `SLUG_TO_CODE` map (`united-states` → `US`, `japan` → `JP`, `india` → `IN`, `malaysia` → `MY`, `new-zealand` → `NZ`, `south-korea` → `KR`, `saudi-arabia` → `SA`) and `notFound()`s anything else.
- Page shape is **much thinner**: hero, 4-stat tile (DTA / Dividend WHT / Interest WHT / Annual FDI), NZ-specific notice, sectors grid, visa pathway grid, FIRB summary, stamp-duty surcharge table, advisor cards, CTA. No DTA rate table, no FX corridor, no pension transfer, no FAQ, no lead form.
- `country_investment_profiles` columns: `country_code`, `country_name`, `flag_emoji`, `hero_title`, `hero_subtitle`, `primary_investment_sectors[]`, `has_dta`, `dta_year`, `fta_partner`, `estimated_annual_fdi_aud_millions`, `popular_visa_pathways[]`, `recommended_advisor_types[]`, `key_facts JSONB`, `meta_title`, `meta_description`, `sort_order`, `active`.

### 1c. The conflict

Next.js App Router routing precedence: a static segment beats a dynamic segment. So for the 7 slugs that exist in both `SLUG_TO_CODE` and as standalone files (us, jp, in, my, nz, kr, sa), **only the standalone config-driven file fires**. The DB-backed route is functionally dead for those — it can only ever serve a slug that's in `SLUG_TO_CODE` *and* doesn't have a standalone file. Today that set is **empty**.

The DB-backed route is **dead code surfacing as live infra**: 540 lines of JSX, three Supabase queries, advisor join, all unreachable. `country_investment_profiles` has rows that nothing reads.

Worse: if someone adds a thirteenth country slug (say `germany`) to `SLUG_TO_CODE` *without* a standalone file, the page rendered will be the thin DB shape — silently inconsistent with the other 12. Footgun.

### 1d. Editor / admin-tooling state

`grep -rn "country_investment_profiles" app/admin lib`: **zero matches** outside `lib/database.types.ts` and the dynamic route itself. No admin UI editing this table. Rows were seeded by migration; no human workflow currently depends on the DB-backed shape.

`foreign_investment_rates` is also read by `app/api/foreign-investment/rates/route.ts` (a public JSON API). That endpoint is **independent** of the renderer choice and stays regardless.

## 2. Migration plan — three options

### Option A: Config canonical, retire DB renderer

- **Code:** Delete `app/foreign-investment/[country]/page.tsx`.
- **Data:** Mark `country_investment_profiles` rows for the 12 supported codes `active = false`. Leave the table; `foreign_investment_rates` stays for the JSON API.
- **Editing flow:** Country copy edits go via PR to `lib/foreign-investment-country-data.ts`. Same flow Phase 1+2 used.
- **Cost:** ~540 lines of JSX deleted. Zero data migration. Zero admin-UI rebuild.

### Option B: DB canonical, port configs into rows

- **Code:** Delete the 12 standalone routes. Expand the dynamic route to render every section in `CountryConfig`.
- **Data:** Schema-evolve `country_investment_profiles` to hold every `CountryConfig` field (mostly JSONB blobs). Write a port script. ~12 rows × ~600 lines JSON each.
- **Editing flow:** Build admin UI for editing 600-line JSON blob per country. Or accept Studio-only editing.
- **Cost:** Big. Admin UI, schema migration, port script, regression tests, validation layer.

### Option C: Hybrid — DB write, config read

- **Code:** Same 12 standalone routes + `CountryHubTemplate`. Add cron / build-step that snapshots DB into a generated `lib/foreign-investment-country-data.generated.ts`.
- **Data:** Same as Option B (DB holds everything). Plus generated file in git.
- **Cost:** Schema migration + admin UI + generation script + cache-invalidation story.

## 3. Recommendation

**Option A. Retire the DB-backed renderer.**

Reasoning, in order of weight:

1. **No editor workflow exists today** that we'd be breaking (§1d). The "DB lets non-engineers edit copy" upside in B/C is hypothetical. We'd be paying real engineering cost (admin UI, JSON schema management, validation, migration) for an unconfirmed user.
2. **The DB renderer is already unreachable** (§1c). Option A is closer to "delete dead code" than to "migrate".
3. **Phase 1+2 already shipped 12 countries via the config path** with zero issues. The pattern is proven.
4. **Type safety**: `CountryConfig` is strongly typed end-to-end. JSONB-in-DB sacrifices that for runtime Zod validation, a clear regression on a strict-TS codebase.
5. **Git history wins on compliance copy** (DTA rates, FIRB thresholds, WHT %s). `git blame` gives audit trail; a Supabase `updated_at` column does not.
6. **Reversibility**: if a Marketing-driven CMS need emerges in 6 months, we can move to C from A more cheaply than from B.

Counter-arguments considered:
- *"What if Marketing asks tomorrow?"* — Then we revisit. YAGNI-style we don't preempt.
- *"`country_investment_profiles` already has rows we'd waste."* — Salvageable for a future admin UI; we just stop reading from the renderer.
- *"Are we sure no admin uses the DB rows?"* — Verified §1d. If an undiscovered consumer surfaces, restore from `active = false` flag rather than full delete.

## 4. Concrete next steps

1. **Audit consumers.** `grep -rn "country_investment_profiles" app lib scripts` once more pre-merge — confirm no admin/cron/script reads. Document in PR description.
2. **Delete the dynamic route.** Remove `app/foreign-investment/[country]/page.tsx`. Run `npm run type-check && npm run build` — confirm no broken imports.
3. **Sweep links to the dynamic route.** Grep `/foreign-investment/[country]` and any hard-coded slug-builder; redirect targets should already point to standalone slugs.
4. **Add unit test.** `__tests__/app/foreign-investment-routes.test.ts`: assert the 12 expected slugs all resolve and that an un-mapped slug `germany` returns 404.
5. **Migration: deactivate stale rows.** New migration `<ts>_deactivate_legacy_country_investment_profiles.sql`: `UPDATE country_investment_profiles SET active = false WHERE country_code IN (...12 codes...)`. Idempotent.
6. **Land Phase 4 schema migration.** `20260508120000_add_country_eligibility_to_brokers_and_professionals.sql` (separate deliverable, in this RFC pair).
7. **Wire renderer to country_eligibility.** In `CountryHubTemplate` and `/best/[slug]`, filter broker/advisor lists by the visitor's `IntentCountryCode` against `country_eligibility.allowed_countries` / `blocked_countries`.
8. **Update docs.** `docs/architecture/country-mode.md` — note the renderer is config-only; `country_investment_profiles` is preserved-but-deactivated; per-broker eligibility now lives on `brokers.country_eligibility` + `professionals.country_eligibility`.
9. **Update CLAUDE.md "Single sources of truth" table** — country-mode entry already references `lib/country-mode/` + `lib/intent-context.ts`; add `lib/foreign-investment-country-data.ts`.
10. **Post-merge observation window** (Tier B per `docs/audits/MERGE_AUTHORIZATION.md`): 15-minute watch on Vercel logs + Sentry for any 500s on `/foreign-investment/*`.
