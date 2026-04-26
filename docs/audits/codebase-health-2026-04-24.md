# Codebase Health Snapshot — 2026-04-24

Pre-Phase-3 audit. Read-only analysis; no fixes applied in this PR.

Branch audited: `claude/codebase-health-audit-02o2v` (parent: `main` @ `3a0ae45`).

- 1,703 TS/TSX files · 359k LOC
- 294 API routes · 194 components · 115 migrations · 210 test files
- Coverage floors (vitest.config.mts): `lines 42 · functions 63 · branches 72 · statements 42`

---

## Headline numbers

| Estimated tech debt | ~530 engineer-hours (≈13 eng-weeks) |
| --- | --- |
| **Critical issues (P0)** | **5** |
| **Recommendation** | **Pause Phase 3 for a 2-week stabilisation sprint.** |

Phase 3 will add new tables, admin screens, and revenue surfaces. Shipping on top of 231 drifted tables, 11 RLS gaps, and 81% untested API routes will compound debt faster than we can retire it.

---

## Top 5 critical issues

1. **DB schema drift — 231 tables in live that aren't in `supabase/migrations/`.**
   Extracted 355 tables from `lib/database.types.ts` (regenerated from live); only ~124 are traceable to a `CREATE TABLE` in a migration file (~62 of the unaccounted are PostGIS internals — still ~231 legitimate app tables unaccounted for). This breaks the "forward-only migrations" invariant in CLAUDE.md: new environments can't be rebuilt from source; rollback is undefined; any dev working off migrations sees a stale schema.

2. **RLS missing on 11 migrations — including PII tables (`email_otps`, `leads`).**
   `20260316_email_otps.sql` and `20260316_create_leads_table.sql` create user-data tables with no `ENABLE ROW LEVEL SECURITY` and no policies. If these are reachable through any non-service-role client, it's a compliance breach. Needs immediate verification of compensating controls; RLS must be the primary defence per CLAUDE.md.

3. **admin.ts (service-role, RLS-bypassing) used in 140+ sites outside allowed scopes.**
   CLAUDE.md scopes `lib/supabase/admin.ts` to `app/api/admin/**`, `app/api/cron/**`, and webhooks. It's imported from `app/api/advisor-auth/*`, `app/api/advisor-apply/*`, `app/api/affiliate/*`, `app/account/notifications/page.tsx`, `components/ArticleBrokerTable.tsx`, and many `lib/` modules. Either the code is bypassing RLS in user-facing paths (security erosion) or CLAUDE.md is stale — either way the discipline needs a reset before Phase 3 ships more service-role reliance.

4. **API test coverage: 237 of 294 routes (81%) have no tests.**
   Untested high-risk routes include `/api/submit-lead`, `/api/advisor-lead`, `/api/quiz-lead`, `/api/advisor-apply`, `/api/stripe/refund-subscription`, `/api/stripe/cancel-subscription`, `/api/stripe/create-portal`, and 43 of 44 `/api/admin/*` routes. Only 17 of 73 cron routes have tests. Lead capture and payment changes carry the highest regression cost — shipping Phase 3 on these foundations means any refactor breaks silently.

5. **Input validation fragmented — only 2 of 294 routes use Zod.**
   226 routes accept `await req.json()` with no runtime validation. 28 use ad-hoc `typeof` guards. Auth + rate limits are a partial compensating control, but validation discipline is absent at the framework layer. Combined with #4, this means a malformed body can shape a DB row before any test catches it.

---

## 1. Dead code

### 1.1 Unimported components — 2

- `components/RouteErrorBoundary.tsx` (66 LOC, modified 2026-04-23)
- `components/RouteLoadingSkeleton.tsx` (24 LOC, modified 2026-04-23)

Both superseded by Next.js 16 built-ins (`error.tsx`, `loading.tsx`). Safe to delete.

### 1.2 API routes with no callers — inconclusive

Static search found ~135 routes with no in-repo `fetch('/api/...')` caller, but the signal is noisy:
- ~50 are cron routes dispatched via `vercel.json` → `app/api/cron/_dispatch/*` (legitimate).
- ~18 are admin routes guarded by `proxy.ts` (legitimate, called via browser navigation + server actions, not `fetch`).
- Remainder includes webhooks and public endpoints called by external clients.

**Action:** do not act on this list without cross-referencing production request logs / PostHog route hits over 30 days. Flagged as "needs runtime data" rather than dead.

### 1.3 Migration-dropped tables — 0

No `DROP TABLE` statements in any migration. No paired orphans.

### 1.4 "Orphaned" migrations — 0

Three one-liner migrations exist (`20260310_advisor_applications_photo_url.sql`, `20260316_add_advisor_nudge_tracking.sql`, `20260316_add_email_capture_context.sql`) but each adds a column that's referenced in the types file — they're minimal, not orphaned.

### 1.5 Tables with 0 rows / 0 reads — not available

Requires live DB access. Rerun with a production read replica to produce this list.

---

## 2. Duplicate logic

### 2.1 Duplicate functions

| Function | Canonical | Local redefinitions |
| --- | --- | --- |
| `formatCurrency` | `lib/utils.ts` | ~13 calculator clients (`MortgageCalculatorClient.tsx`, `RetirementCalculatorClient.tsx`, `SavingsCalculatorClient.tsx`, `SMSFCalculatorClient.tsx`, `SuperContributionsClient.tsx`, etc.) + `app/api/cron/weekly-rate-update/route.ts` |
| `formatDate` | _(none — add to `lib/utils.ts`)_ | 8 files incl. `app/admin/financial-periods/FinancialPeriodsClient.tsx`, `app/whats-new/page.tsx`, `components/AuthorByline.tsx` |
| `slugify` | `lib/utils.ts` | 5 files incl. `app/api/advisor-articles/route.ts`, `app/api/advisor-signup/route.ts`, `app/admin/regulatory-alerts/page.tsx`, `app/admin/team-members/page.tsx` |

### 2.2 SSOT violations

- **JSON-LD hardcoded outside `lib/schema-markup.ts`:** 42 files with inline `"@context": "https://schema.org"`. Hot spots: `app/super-contributions-calculator/page.tsx` (14 blocks), `app/compound-interest-calculator/page.tsx` (15 blocks), `components/VerticalPillarPage.tsx` (3). Schema.org helpers already exist in `lib/schema-markup.ts`; these pages missed them.
- **`console.*` instead of `lib/logger.ts`:** 12 actionable files. Top offender: `app/advisor-portal/page.tsx` (3). `lib/logger.ts` internally and `e2e/*.spec.ts` are acceptable.
- **Compliance copy (AFSL/"general advice") hardcoded:** 4 components (`BrokerCard.tsx`, `full-service-brokers/FullServiceBrokerCard.tsx`, `VerifiedBadge.tsx`, `AdminHelpPanel.tsx`). `Footer.tsx` and `CompactDisclosure.tsx` already do it right.

### 2.3 API routes that could consolidate

- **`/api/advisor-auth/*` (12 routes)** — each reimplements session/token extraction. Extract `requireAdvisorAuth()` helper.
- **`/api/admin/*` (44 routes)** — repeated auth-plus-log boilerplate. Wrap via shared handler.
- **`/api/cron/*` (73 routes)** — audit that all call `requireCronAuth` first.

### 2.4 Near-duplicate UI

7 card components with similar JSX shells (`BrokerCard`, `ListingCard`, `InvestListingCard`, `DealCard`, `FullServiceBrokerCard`, `EtfComparisonCard`, `AsxTickerCard`). Extract a shared `components/ui/Card` base.

---

## 3. Architectural smells

### 3.1 Circular imports — 0

Clean dependency graph. No barrel files to hide cycles behind.

### 3.2 Files >500 lines — 15 splitting candidates

Generated (`lib/database.types.ts`, 13,148 LOC) and pure data (`lib/best-broker-categories.ts`, `lib/how-to-guides.ts`, `lib/email-templates.ts`, `lib/invest-categories.ts`, `lib/types.ts`, `lib/glossary.ts`) excluded.

| # | File | Lines |
| --- | --- | --- |
| 1 | `app/advisor-portal/page.tsx` | 2,761 |
| 2 | `app/find-advisor/page.tsx` | 1,552 |
| 3 | `app/advisor/[slug]/AdvisorProfileClient.tsx` | 1,357 |
| 4 | `app/advisors/AdvisorsClient.tsx` | 1,243 |
| 5 | `app/api/stripe/webhook/route.ts` | 1,197 |
| 6 | `app/broker/[slug]/BrokerReviewClient.tsx` | 1,194 |
| 7 | `app/admin/marketplace/intelligence/page.tsx` | 1,190 |
| 8 | `lib/advisor-verification.ts` | 1,075 |
| 9 | `app/admin/advisors/page.tsx` | 1,065 |
| 10 | `app/broker-portal/campaigns/new/page.tsx` | 1,060 |
| 11 | `app/admin/marketplace/funnel/page.tsx` | 1,046 |
| 12 | `app/admin/compliance/page.tsx` | 1,039 |
| 13 | `components/layout/Navigation.tsx` | 1,010 |
| 14 | `app/compare/CompareClient.tsx` | 1,001 |
| 15 | `app/broker-portal/analytics/page.tsx` | 1,000 |

`stripe/webhook/route.ts` and `advisor-verification.ts` are the highest-leverage splits — both mix dispatch with business logic.

### 3.3 API routes without body validation

- Total: 294
- Use Zod: 2
- Manual type guards: 28
- No validation: **226 (77%)**

### 3.4 `any` type — 6 total

Essentially a non-issue. 3 are false positives in FAQ/guide string content; 2 are necessary generics in `lib/cache.ts`; 1 is `Record<string, any>` in an admin form (`app/admin/marketplace/sponsor-billing/page.tsx`). Strict mode is holding.

### 3.5 Escape hatches

- `@ts-ignore` / `@ts-nocheck`: **0**
- `@ts-expect-error`: **7** — all in test files, intentional.
- `eslint-disable`: **33** across 20+ files; top: `VerticalPillarPage.tsx` (2), `BrokerCard.tsx` (2), `app/advisor-portal/page.tsx` (2).

### 3.6 admin.ts misuse — 140+ sites (see Top 5 #3)

---

## 4. Test coverage gaps

### 4.1 Critical paths

| Path | Status |
| --- | --- |
| `lib/stripe.ts` | ✓ |
| `lib/compliance.ts` | ✓ |
| `lib/rate-limit.ts` / `rate-limiter.ts` / `rate-limit-db.ts` | ✓ |
| `app/api/auth/signout/route.ts` | **✗** |
| `/api/submit-lead` | **✗** |
| `/api/advisor-lead` | **✗** |
| `/api/quiz-lead` | **✗** |
| `/api/advisor-apply` | **✗** (invite sub-route has 1 test) |
| `/api/stripe/refund-subscription` | **✗** |
| `/api/stripe/cancel-subscription` | **✗** |
| `/api/stripe/create-portal` | **✗** |
| `/api/stripe/create-contract` | **✗** |

Library-level critical paths are well-covered; the gap is entirely at the route layer.

### 4.2 API routes with no tests

- **237 of 294 (81%)** untested.
- Only 1 admin test file for 44 admin routes.
- Only 17 cron tests for 73 cron routes.

### 4.3 Complex untested `lib/` files

Files >150 LOC with no matching `__tests__/lib/<name>.test.ts`:

- `lib/advisor-lead-dispute-resolver.ts` — 480 LOC, high business-logic density.
- `lib/fi-data-server.ts` — 397 LOC, server data layer.
- `lib/cached-data.ts` — 333 LOC, caching primitives.

Type-only files (`lib/types.ts`) excluded.

---

## 5. Migration hygiene

### 5.1 Drift — 231 suspected (see Top 5 #1)

### 5.2 Non-idempotent migrations — 10

Will fail on re-run because they lack `IF NOT EXISTS`:

- `001_initial.sql` (foundational — likely acceptable)
- `003_broker_portal_features.sql`
- `004_sponsor_invoices.sql`
- `20260305_add_quiz_property_robo_weights.sql`
- `20260310_advisor_offers.sql`
- `20260310_content_structure.sql`
- `20260314_advisor_application_fields.sql`
- `20260316_lead_confirm_flow.sql`
- `20260326_lead_review_request.sql`
- `20260329_broker_platform_type.sql`
- `20260413_stockbroker_firms.sql`

### 5.3 Missing RLS — 11 (see Top 5 #2)

`email_otps` and `leads` are the critical ones; the rest (`sponsor_invoices`, `investment_listings`, `listing_claims`, revenue/wave tables, etc.) are medium-risk and should be reviewed individually.

### 5.4 Missing rollback header — 111

3 have no header comments at all (`20260316_add_weekly_rate_drip_log.sql`, `20260316_add_advisor_nudge_tracking.sql`, `20260316_add_lead_outcome_tracking.sql`); the rest have partial headers without explicit reverse SQL. Increases incident-response time per `docs/runbooks/database-rollback.md`.

### 5.5 Partial-failure markers — 8

- TODOs / FIXMEs: `20260522_rls_cosmetic_cleanup.sql`, `20260513_fix_public_read_leaks.sql`.
- Missing trailing semicolon on final statement: `20260316_email_otps.sql`, `20260426_wave_launch_readiness.sql`, `20260512_agent_infrastructure.sql`, `20260310_fix_advisor_photos.sql`, `20260310_admin_login_attempts.sql`, `20260411_features_11_12_14_15_16_18.sql`. Worth re-verifying these applied cleanly in prod.

---

## Tech-debt hour estimate

Rough engineering estimates for remediation:

| Category | Hours | Notes |
| --- | --- | --- |
| Dead code removal (2 components + route audit) | 9 |  |
| Duplicate logic consolidation | 46 | JSON-LD migration is the bulk (~12h) |
| File splitting (15 files >1000 LOC) | 45 | ~3h each, average |
| Zod validation rollout (226 routes) | 60 | ~15 min per route |
| admin.ts scope reset (audit + refactor/doc) | 20 |  |
| API route tests (237 routes, basic integration) | 250 | ~1h each — largest bucket |
| Complex lib tests (3 files) | 12 |  |
| Migration drift backfill | 40 | Generate migrations for 231 tables |
| RLS gap remediation (11 migrations) | 20 | CRITICAL path — likely higher |
| Migration idempotency rewrites (10) | 5 |  |
| Rollback headers (111) | 20 |  |
| Partial-failure re-verification (8) | 3 |  |
| **Total** | **~530** | ≈13 engineer-weeks |

Not included: unknown-unknowns from the 135 suspected-dead routes (needs runtime data first), and DB-level dead tables (needs live access).

---

## Recommendation — pause to refactor

Three of the P0s directly block safe Phase 3 work:

1. **Schema drift** — Phase 3 ships new tables. If drift isn't reconciled first, every new migration widens the gap between `supabase/migrations/` and production. Dev → prod parity is already broken.
2. **RLS on `leads` / `email_otps`** — these tables store lead submissions and OTPs. A compliance finding here would block the Oct-Dec 2026 migration window (per COMPANY.md). Non-negotiable before Phase 3 ships more lead-capture surface.
3. **Lead-capture / Stripe test coverage** — 0% on the revenue-critical routes. Any Phase 3 refactor that touches these silently regresses the moneymaker.

**Proposed 2-week stabilisation sprint (prioritised, not exhaustive):**

- Week 1 (ship-blockers, ~60h): RLS remediation on 11 tables · drift reconciliation for user-data tables (`advisor_*`, `leads`, `email_otps` families) · integration tests for `/api/submit-lead`, `/api/quiz-lead`, `/api/advisor-apply`, `/api/stripe/*`.
- Week 2 (hygiene, ~60h): admin.ts scope reset (refactor user-facing routes off service-role, or update CLAUDE.md if intentional) · Zod rollout on top-20 highest-traffic routes · delete 2 dead components · consolidate `formatCurrency`/`formatDate`/`slugify`.

Everything else on the list (file splits, JSON-LD SSOT migration, rollback headers, card dedup) can be absorbed as opportunistic cleanup during Phase 3 feature work.

**Continue building** only on the subset of Phase 3 that doesn't touch lead capture, Stripe, user-data tables, or admin routes — i.e., pure content/SEO features are still safe to ship.

---

_Produced by four parallel read-only audits; no files modified outside this report._
