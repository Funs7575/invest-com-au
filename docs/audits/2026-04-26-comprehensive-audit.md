# Comprehensive Enterprise-Readiness Audit — 2026-04-26

Read-only forensic audit of the invest-com-au repository, Supabase project, and live preview, conducted ahead of the Oct–Dec 2026 ACL/launch window. No code modified.

- **Repo audited:** `Funs7575/invest-com-au` @ `main` (4574d8f1)
- **Supabase project:** `guggzyqceattncjwvgyc` (eu-west-1, Postgres 17.6)
- **Live preview:** https://invest-com-au.vercel.app
- **Stripe:** 12 products / 12 prices live (test mode), 0 active subs (pre-launch)
- **Companion doc:** `docs/audits/codebase-health-2026-04-24.md` (the prior 04-24 audit)
- **Companion queue:** `docs/audits/REMEDIATION_QUEUE.md` (streams A–S, J–S source from this doc)

This audit explicitly extends — **does not replace** — the 04-24 codebase-health audit. Where the 04-24 audit's findings are still load-bearing, this report says "see 04-24 §X" rather than restating. New material is in §3 (deps), §4 (DB hardening), §5 (API surface incl. Stripe webhook gaps), §6 (UI/UX), §7 (security depth), §8 (SEO depth), §9 (observability — including a fresh **P0 cron silence** finding), §10 (n8n agents), §11 (Stripe revenue map), §12 (enterprise gaps).

---

## Executive summary

| Severity | Count | Total effort |
|---|---:|---:|
| P0 (ship-blocker / compliance / live regression) | **8** | ~36 h |
| P1 (high-risk, must-do pre-launch) | **41** | ~248 h |
| P2 (quality / hardening) | **39** | ~196 h |
| P3 (cosmetic / opportunistic) | **22** | ~38 h |
| **Total new (this audit)** | **110** | **~518 h** |
| Carried from 04-24 audit (open) | ~105 items | ~395 h (was 530, ~135 done) |
| **Combined open backlog** | **~215** | **~913 h ≈ 23 eng-weeks** |

### What's already strong (don't forget to keep these)

- **0 raw `<img>` tags** — every image goes through `next/image`. Self-hosted Inter via `next/font/local`. (§6)
- **100% rate-limit coverage** — `node scripts/rate-limit-coverage.mjs` reports 90 enforced + 204 explicitly exempted of 294 routes. (§7)
- **All four webhook endpoints verify signatures** before any DB write — Stripe, Stripe-marketplace, Resend (Svix HMAC), broker-signup (timing-safe Bearer). Webhook idempotency table `stripe_webhook_events` correctly written. (§5, §7)
- **GDPR / AU Privacy Act surface area exists**: `/api/account/export-data`, `/api/account/delete`, `/api/privacy/correct`, `/api/privacy/request`, plus `app/privacy/data-rights/`. (§12)
- **14 runbooks (1,255 LOC)** including launch-day, launch-rollback, secret-rotation, breach-notification, database-rollback, stripe-webhook-stuck, cron-stuck, advisor-kyc-stuck, month-end-close-failed. (§12)
- **57 loading.tsx + 67 error.tsx + 10 not-found.tsx** boundaries on user-facing routes. (§6)
- **Strict TS + `noUncheckedIndexedAccess` ENABLED** (per CLAUDE.md and `tsconfig.json`); only 6 `any` uses repo-wide; 0 `@ts-nocheck`/`@ts-ignore`. (04-24 §3.4–3.5)
- **Sentry server config does request-id correlation + PII scrubbing + vertical tagging** in `beforeSend`. Conditional on `NEXT_PUBLIC_SENTRY_DSN`. (§9)
- **Supabase PITR enabled** (Pro tier; verified via Supabase MCP — no security advisor finding for backup posture). (§12)

### Top 8 P0 findings — the 4-month plan opens with these

| # | Finding | §  | Effort |
|---|---|---|---:|
| **P0-1** | **Cron silence**: `cron_run_log` last entry `2026-04-16 22:30 UTC`; **0 runs in last 7d**. DB time is `2026-04-26 15:54 UTC` — silent for ≈10 days despite Vercel cron schedule unchanged. Either `wrapCronHandler` regression, dispatcher not invoked, or Vercel quota / project change. Affects every automated job: dunning, GDPR retention, fee snapshots, broker-snapshot, slo-monitor, observability-retention. | §9.1 | 4 h diagnose |
| **P0-2** | **Stored XSS in newsletter**: `app/newsletter/[edition]/page.tsx:183` renders DB-stored `editionData.html_content` via `dangerouslySetInnerHTML` with **no sanitiser**. Currently admin-only writer, but a compromised admin or a future advertiser-submission feature becomes stored XSS hitting every newsletter reader. | §7.7 | 4 h |
| **P0-3** | **PostHog mirror empty**: `posthog_events_mirror` has 0 rows despite PR #211 wiring. Edge function deployed correctly; either `POSTHOG_WEBHOOK_SECRET` missing in env, PostHog destination not pointed at the edge function, or no production traffic firing events yet. Funnel data is invisible. | §9.2 | 2 h |
| **P0-4** | **Articles in sitemap not filtered by `status='published'`**: `app/sitemap.ts:151` — drafts and archived articles can leak into Google. Brokers/professionals/scenarios all filter; articles do not. | §8.1 | 0.5 h |
| **P0-5** | **All 266 articles have `cover_image_url = NULL`** — 0/266 OG image coverage. `/api/og` fallback works, but social cards are generic gradient art. P0 because every share to LinkedIn/Twitter post-launch will look unfinished. | §8.6 | 6 h |
| **P0-6** | **No `app/opengraph-image.tsx`** site-wide default — pages without explicit OG (most static pages, glossary, suburbs) fall back to favicon-tier social cards. | §8.6 | 2 h |
| **P0-7** | **`/api/widget/route.ts:161` ships `Access-Control-Allow-Origin: *`** — confirmed at line 161. Acceptable for embed widget but combine with referer allowlist + signed token to prevent unattributed scraping. **Existing K-01 in queue.** | §7.2 | 2 h |
| **P0-8** | **57 tables have RLS enabled but ZERO policies** — Supabase advisor confirms. Default-deny semantics work fine for service-role callers, but any non-service-role read silently returns empty. Hidden landmine for the Phase 3 admin UIs being built off these tables. List: `admin_action_log`, `feature_flags`, `slo_definitions`, `cron_run_log`, `revenue_attribution_daily`, `user_bookmarks`, `user_notifications`, `article_comments`, `article_reactions`, etc. | §4.4 | 16 h |

### The 12 quality metrics — current + projected

The improvement plan tracks these 12 metrics on a dashboard. Each finding below maps to one or more.

| Metric | Today | After P0 sprint | After 4-month plan | Notes |
|---|---:|---:|---:|---|
| **M01** Test coverage (lines / branches / functions) | 42 / 72 / 63 | unchanged | 60 / 80 / 75 | Floors in `vitest.config.mts` |
| **M02** API routes with tests | 57 / 294 (19%) | +9 (66 / 294) | 200 / 294 (68%) | D-stream + R |
| **M03** API routes with Zod input validation | 9 / 294 (3%) | unchanged | 100 / 294 (34%) | E-stream |
| **M04** RLS policies — tables with policies | 178 / 234 (76%) | 234 / 234 (100%) | 100% | B + O streams + 57 deny-all |
| **M05** Migration drift (live tables not in `supabase/migrations/`) | ~231 | ~231 | 0 | A-stream |
| **M06** Stripe webhook event coverage | 8 / 14 expected | 8 / 14 | 14 / 14 | J-stream |
| **M07** Supabase advisor findings (security ERR/WARN) | 261 (2 ERR + 259 WARN) | 20 | 0 critical | pg_graphql + RLS no-policy |
| **M08** Supabase advisor findings (perf) | 417 | 380 | <80 | 286 unused indexes |
| **M09** Cron success rate (7d) | **n/a** — silence | back to 100% | 99.5% with alerting | P0-1 |
| **M10** PostHog → mirror events / day | 0 | 1k+ | 10k+ | P0-3 |
| **M11** Lighthouse perf (top 5 pages, mobile) | unmeasured | unchanged | ≥85 each | N + UI/UX (§6) |
| **M12** OG image coverage | 0 / 266 articles | 266 / 266 | 100% | P0-5/6 |

---

## 1. Codebase health

### 1.1 LOC by category (TS/TSX, excluding generated + node_modules)

| Path | LOC | Files |
|---|---:|---:|
| `app/` | 237,729 | ~1,050 |
| `lib/` | 53,248 | ~370 |
| `__tests__/` | 34,672 | 207 |
| `components/` | 31,435 | ~280 |
| **Total TS/TSX** | **~359,453** | **1,703** |

Generated/data carve-outs:
- `lib/database.types.ts` — 13,148 LOC (generated; excluded from "split candidates").
- Pure-data libs (`best-broker-categories`, `how-to-guides`, `email-templates`, `invest-categories`, `glossary`) — 7,367 LOC across 5 files; long for a reason.

### 1.2 Top-edited files in last 90 days (heat map, top 25)

| Edits | File | Note |
|---:|---|---|
| 179 | `app/page.tsx` | Hot — homepage churn |
| 89 | `app/sitemap.ts` | Verticals + new content shapes |
| 88 | `app/compare/CompareClient.tsx` | Compare table refactors |
| 83 | `components/Header.tsx` | Nav iteration |
| 73 | `app/quiz/page.tsx` | Quiz flow tweaks |
| 70 | `app/broker/[slug]/BrokerReviewClient.tsx` | Broker page churn |
| 63 | `lib/types.ts` | Type extensions |
| 61 | `components/Footer.tsx` | Footer iteration |
| 59 | `components/HomepageComparisonTable.tsx` | A/B-driven changes |
| 53 | `app/calculators/CalculatorsClient.tsx` | |
| 53 | `app/article/[slug]/page.tsx` | Schema + ISR |
| 45 | `app/versus/VersusClient.tsx` | |
| 44 | `app/advisor/[slug]/AdvisorProfileClient.tsx` | |
| 43 | `app/broker/[slug]/page.tsx` | |
| 43 | `app/best/[slug]/page.tsx` | |
| 42 | `app/advisors/AdvisorsClient.tsx` | |
| 41 | `vercel.json` | Cron iteration |
| 41 | `app/layout.tsx` | Provider chain |

**Risk:** the homepage has changed 179 times in 90 days with no visual-regression coverage. **F-1.2.1 P1 — add Playwright visual snapshots for `/`, `/compare`, `/quiz` (4 h).** Maps to M11.

### 1.3 Files >500 LOC (split candidates) and >1,000 LOC (urgent)

20 candidates >1,000 LOC after excluding generated + pure data. Headline list (full list in 04-24 §3.2):

| LOC | File | Action |
|---:|---|---|
| 2,761 | `app/advisor-portal/page.tsx` | **F-1.3.1 P1** — split per-tab (16 h, see §6.9 of UI/UX agent) |
| 1,552 | `app/find-advisor/page.tsx` | **P1** — split filters/results (8 h) |
| 1,357 | `app/advisor/[slug]/AdvisorProfileClient.tsx` | **P1** — extract review/booking sub-trees (8 h) |
| 1,243 | `app/advisors/AdvisorsClient.tsx` | **P1** — extract `AdvisorCard` (4 h) |
| 1,197 | `app/api/stripe/webhook/route.ts` | **P0** — handler-registry split (J-01 in queue, 12 h) |
| 1,194 | `app/broker/[slug]/BrokerReviewClient.tsx` | **P1** — Q&A + methodology split (8 h) |
| 1,075 | `lib/advisor-verification.ts` | **P1** — extract verification stages (8 h) |
| 1,001 | `app/compare/CompareClient.tsx` | **P1** — server/client boundary lift (8 h) |
| 1,010 | `components/layout/Navigation.tsx` | **P2** — Desktop/Mobile sub-components (4 h) |

### 1.4 Dead code

- **2 dead components flagged by 04-24 audit are FALSE POSITIVES** (`RouteErrorBoundary.tsx`, `RouteLoadingSkeleton.tsx`) — re-exported by 14 `app/*/loading.tsx` and `error.tsx` files. Already marked F-01 false-positive in queue. Keep.
- **API routes with no in-repo caller**: ~135 noted in 04-24; needs PostHog runtime data to safely act. **F-1.4.1 P2 — once posthog mirror is populating (P0-3), join `analytics_events` ∪ posthog mirror against the route list and produce a deletion candidate list (4 h).**
- No `DROP TABLE` statements in any migration ⇒ no orphan migration pairs.

### 1.5 Duplicate logic

- See 04-24 §2.1: `formatCurrency` re-implemented in 13 calculator clients; `formatDate` in 8 files; `slugify` in 5. Total consolidation effort ~6 h (F-stream).
- **JSON-LD inline `"@context"`: prior audit said 42; this audit found 145** — the larger gap is because there are TWO JSON-LD libraries (`lib/seo.ts` with 12 inline builders, `lib/json-ld.ts` with 5, `lib/schema-markup.ts` with the rest). **F-1.5.1 P1 — consolidate to one library + builders, codemod top 30 callers (12–16 h).** Maps to M07.

### 1.6 Circular imports

`madge` not run (sandbox). Prior audit: 0 cycles. No change in dependency-graph shape since (no new barrel files).

### 1.7 `any` type / escape hatches

- `: any` / `as any` / `<any>`: 33 occurrences, 6 of those substantive (rest in test files). Strict mode is holding.
- `@ts-ignore` / `@ts-nocheck`: 0.
- `@ts-expect-error`: 7, all in test files.
- `eslint-disable`: 33 across 20+ files.

### 1.8 TODO / FIXME / HACK count

33 occurrences across the repo. Top files:

| Count | File |
|---:|---|
| 8 | `app/etfs/sectors/page.tsx` |
| 3 | `lib/validate-phone.ts` |
| 3 | `app/advisor-portal/page.tsx` |
| 2 | `app/api/complaints/intake/route.ts` |
| 2 | `app/advisor-apply/page.tsx` |

Healthy. **F-1.8.1 P3 — convert each TODO into a queue item or delete (1 h).**

---

## 2. Test coverage gaps

### 2.1 Coverage floors today (`vitest.config.mts`)

`lines 42 · functions 63 · branches 72 · statements 42`. M01 baseline.

### 2.2 Test inventory

| Dir | Files |
|---|---:|
| `__tests__/lib/` | 152 |
| `__tests__/api/` | 37 |
| `__tests__/components/` | 12 |
| `__tests__/integration/` | 8 |
| `__tests__/api/admin/` | 1 |
| **Total** | **207 vitest** |
| `e2e/*.spec.ts` | 4 (smoke / a11y / critical-flows / wave-12) |

### 2.3 Critical-path API route coverage

237 of 294 routes (81%) untested. The high-risk untested set (D-01..D-09 in queue) has not yet shipped — those PRs are still pending.

| Path | Tests | Severity |
|---|---|---|
| `/api/stripe/webhook` | partial | **P0** (D-stream + J-stream) |
| `/api/stripe/refund-subscription` | none | **P1** |
| `/api/stripe/cancel-subscription` | none | **P1** |
| `/api/stripe/create-portal` | none | **P1** |
| `/api/stripe/create-contract` | none | **P1** |
| `/api/submit-lead` | none | **P0** |
| `/api/quiz-lead` | none | **P0** |
| `/api/advisor-lead` | none | **P0** |
| `/api/advisor-apply` (root) | none (sub-route `invite` has 1) | **P0** |
| `/api/auth/signout` | none | **P1** |

**F-2.3.1 P0 — Ship D-01..D-09 (9 integration tests) before any further Phase 3 writes touch these routes.** ~9 h. Maps to M02.

### 2.4 lib/ coverage gaps (>150 LOC, no `__tests__/lib/<x>.test.ts`)

| File | LOC | Note |
|---|---:|---|
| `lib/advisor-lead-dispute-resolver.ts` | 480 | High business-logic density — money-affecting |
| `lib/fi-data-server.ts` | 397 | Server data layer |
| `lib/cached-data.ts` | 333 | Caching primitives |
| `lib/marketplace/wallet.ts` | (verify) | Used by webhooks |
| `lib/marketplace/auto-bid.ts` | (verify) | Bid algorithm |

**F-2.4.1 P1 — R-stream tests for these 5 files (10 h).** Maps to M01 / M02.

### 2.5 Flaky tests

`docs/flaky-test-triage.md` exists; not re-evaluated this audit. **F-2.5.1 P3 — re-baseline using last 30 CI runs (2 h).**

---

## 3. Dependency hygiene

### 3.1 `npm outdated` (12 packages)

All deps satisfy `package.json` ranges; the "latest" column reveals available majors:

| Package | Current floor | Latest | Notes |
|---|---|---|---|
| `@sentry/nextjs` | 9.47.1 | **10.50.0** | Major bump — Next.js 16 peer-dep was the historical block; verify 10.x supports it. **F-3.1.1 P2 — 4 h.** |
| `stripe` | 17.7.0 | **22.1.0** | 5 majors behind. API version + types changed; webhook events are largely stable. **F-3.1.2 P1 — 6 h** (P-stream). |
| `posthog-js` | 1.371.3 | 1.372.1 | Minor — auto OK |
| `posthog-node` | 5.30.1 | 5.30.4 | Minor |
| `@supabase/supabase-js` | 2.104.0 | 2.104.1 | Patch |
| `@supabase/ssr` | 0.10.2 | 0.10.2 | up-to-date (stuck on satisfied range) |
| `@anthropic-ai/sdk` | 0.90.0 | 0.91.1 | Minor |
| `next` | 16.2.4 | 16.2.4 | up-to-date |
| `react` / `react-dom` | 19.2.5 | 19.2.5 | up-to-date |

**P0/P1 majors: only Stripe (5 majors behind, current 17 → 22). Sentry one major behind (9 → 10). Both are in the queue's P-stream.**

### 3.2 `npm audit` — 5 advisories, all moderate

| Pkg | CVE / Title | Score | Path |
|---|---|---|---|
| `postcss` <8.5.10 | XSS via unescaped `</style>` in stringify | 6.1 | `next` → `postcss` |
| `uuid` <14 | Missing buffer bounds check in v3/v5/v6 (we use v4) | 0 | `@sentry/webpack-plugin` → `uuid` |
| `@sentry/webpack-plugin` | transitive via uuid | mod | `@sentry/nextjs` |
| `@sentry/nextjs` | transitive via webpack-plugin | mod | direct |
| `next` | transitive via postcss | mod | direct |

**Practical risk: low** — postcss XSS only matters if we generate untrusted CSS strings (we don't); uuid issue is in v3/v5/v6, we use v4. Both close once Sentry → 10 lands. **F-3.2.1 P2 — 0 h direct (clears with F-3.1.1).**

### 3.3 Bundle size (top 10 by size — heuristic)

`scripts/bundle-size-summary.mjs` exists; not run on this sandbox. Headlines from `next.config.ts` `optimizePackageImports`: `@sentry/nextjs`, `@supabase/supabase-js`, `@supabase/ssr` already barrel-rewritten — confirmed >100 KB historical client savings.

**F-3.3.1 P2 — Run `npm run analyze` on a 4-CPU host, attach the report to a tracking issue, identify next 3 trim targets (3 h).**

### 3.4 Duplicate / unused deps

Not measured this audit. **F-3.4.1 P3 — `npx depcheck` + manual triage (2 h).**

---

## 4. Database health

Live counts (Supabase MCP, 2026-04-26 15:54 UTC):

| Metric | Value |
|---|---:|
| Tables | **242** (235 base + 7 views/matview/special) |
| Functions | **872** (user reported 899 — 27 fewer; PostGIS heavy) |
| Indexes | **780** |
| Policies coverage | 178 / 234 RLS-on tables have ≥1 policy (76%) |
| Materialized views | 1 |

### 4.1 Tables — usage profile

The 235-base-table list spans 242 in the `public.tables` snapshot (incl. `spatial_ref_sys` — RLS-off intentionally per PostGIS). Headline counts:

| Bucket | Count | Notes |
|---|---:|---|
| Tables with rows | ~80 | High-row: `spatial_ref_sys` (8500), `broker_price_snapshots` (3672), `allocation_decisions` (3085), `analytics_events` (1166), `cron_run_log` (1173), `articles` (266), `glossary_terms` (203), `professionals` (167), `advisor_verification_log` (155), `affiliate_clicks` (147) |
| Zero-row tables | **155+** | Many are launch-staging (not yet exercised): `subscriptions`, `course_purchases`, `course_progress`, `consultations`, `lead_disputes`, `webhook_delivery_queue`, `professional_reviews`, `auth_attempts`, `tos_acceptances`, `health_pings`, `data_integrity_issues`, `revenue_attribution_daily`, `posthog_events_mirror` (P0-3), `stripe_webhook_events` (no real charges yet) |
| Critical zero-row | 5 | `posthog_events_mirror` (P0-3), `cron_run_log` last-7d=0 (P0-1), `stripe_webhook_events`, `auth_attempts`, `tos_acceptances` |

**F-4.1.1 P2 — once cron + posthog are alive, run `pg_stat_user_tables.last_analyze` + `seq_scan` to identify truly unused tables for retirement (4 h).**

### 4.2 Functions — 872 in public

The dominant share is PostGIS / pgvector (`_st_*`, `geometry_*`, `geography_*`, `array_to_*`, etc.). Estimated ~150 application functions written by us (e.g., `auto_bill_lead`, `cleanup_expired_data`, `cleanup_rate_limits`, `generate_advisor_article_slug`, `generate_invoice_number`, `advisor_fee_stats`).

**Migrations contain only 6 `CREATE FUNCTION` statements** — the other ~144 functions are drift (or live in extensions). **F-4.2.1 P2 — 04-26 audit: app-functions vs migration drift list (4 h).** Maps to M05.

### 4.3 Migration drift

- 110 migration files; 56 contain `CREATE TABLE` for 177 distinct CREATE TABLE statements.
- Live has 235 base tables ⇒ drift ≈ 235 − (177 − ~50 PostGIS internals counted twice) ≈ **210–230 drifted tables**, matching 04-24 audit.
- **A-stream is the canonical remediation path.** No new finding.

### 4.4 RLS coverage — Supabase advisors

**Security advisors: 318 findings (2 ERROR, 259 WARN, 57 INFO).**

| Lint | Count | Severity |
|---|---:|---|
| `pg_graphql_anon_table_exposed` | 241 | WARN — anon role can SELECT through GraphQL endpoint we don't use |
| `rls_enabled_no_policy` | 57 | INFO — see F-4.4.1 below |
| `rls_policy_always_true` | 9 | WARN — `USING (true)` on tables that should be scoped (e.g., `articles`, `brokers`, `versus_editorials` — public-read is intended; verify each isn't a PII table) |
| `function_search_path_mutable` | 4 | WARN — search_path injection vector |
| `extension_in_public` | 2 | WARN — should live in dedicated schema |
| `rls_disabled_in_public` | 1 | ERROR — `spatial_ref_sys` (PostGIS, intentional) |
| `security_definer_view` | 1 | WARN |
| `materialized_view_in_api` | 1 | WARN |
| `public_bucket_allows_listing` | 1 | WARN — verify storage bucket scope |
| `auth_leaked_password_protection` | 1 | WARN — enable HaveIBeenPwned integration |

**F-4.4.1 P0-8 — 57 tables with RLS enabled but zero policies** (queue O-stream). Default-deny works for service-role callers but breaks any non-service-role read. Notable PII / mutating tables in this set:

`admin_action_log`, `admin_mfa_enrollments`, `advisor_kyc_documents`, `article_comments`, `article_reactions`, `attribution_touches`, `automation_kill_switches`, `churn_surveys`, `complaints_register`, `cron_run_log`, `data_integrity_issues`, `email_suppression_list`, `feature_flags`, `financial_audit_log`, `financial_periods`, `fraud_signals`, `lead_quality_weights`, `login_attempts`, `nps_responses`, `privacy_data_requests`, `referral_rewards`, `revenue_attribution_daily`, `revenue_reconciliation_runs`, `slo_definitions`, `slo_incidents`, `user_bookmarks`, `user_notifications`, `user_quiz_history`, `web_vitals_samples`.

The `user_*` and `article_comments`/`article_reactions` tables explicitly need `auth.uid()` policies — these are the user-data class. Triage cluster of ~16 tables in O-01..O-04. **16 h.** Maps to M04, M07.

**F-4.4.2 P1 — Revoke `pg_graphql` anon access** (queue K already references; security agent found 0 hits in code for `/graphql/v1`). 1-line migration: `REVOKE USAGE ON SCHEMA graphql FROM anon, authenticated;`. Closes 241 advisor findings in one shot. **1 h.** Maps to M07.

### 4.5 Performance advisors — 417 findings

| Lint | Count | Action |
|---|---:|---|
| `unused_index` | 286 | F-4.5.1 P2 — script-driven `DROP INDEX` migration, 8 h. Maps to M08. |
| `multiple_permissive_policies` | 102 | F-4.5.2 P2 — consolidate per-table; same migration as O-stream RLS work, 6 h. |
| `auth_rls_initplan` | 24 | F-4.5.3 P1 — wrap `auth.uid()` in `(SELECT auth.uid())` subqueries to avoid per-row planning, 4 h. |
| `unindexed_foreign_keys` | 4 | **F-4.5.4 P2 — add 4 indexes**: `affiliate_payout_variance.report_id`, `broker_review_invites.user_review_id`, `international_leads.professional_lead_id`, `sponsored_placement_bookings.broker_id`. 1 h. |
| `no_primary_key` | 1 | F-4.5.5 P2 — identify + add PK, 1 h. |

### 4.6 N+1 query candidates

Not statically detected this audit. **F-4.6.1 P3 — once observability is alive (M09/M10), enable `pg_stat_statements`, capture top-50 queries by total time, audit for N+1 (4 h).**

---

## 5. API surface quality

### 5.1 Route catalog

294 API routes total. Distribution:

| Family | Routes |
|---|---:|
| `app/api/cron/*` (incl. dispatcher) | 73 |
| `app/api/admin/*` | 44 |
| `app/api/advisor-*` | ~30 |
| `app/api/account/*` | ~12 |
| `app/api/stripe/*` | ~10 |
| `app/api/webhooks/*` + marketplace webhook | 4 |
| Public `/api/v1/*` | ~5 |
| Other (lead capture, calculators, search, etc.) | ~115 |

### 5.2 Auth coverage

190 / 294 (65%) of route files mention `auth`, `requireCronAuth`, `requireAdmin`, `requireAdvisorAuth`, or read cookies. Remainder is intentionally public (lead capture, calculators, public health, OG image). 04-24 audit confirmed admin / advisor / cron paths uniformly guarded. No new finding.

### 5.3 Input validation (Zod)

9 routes use `z.object` / `safeParse` / `.parse(`. Up from 2 in 04-24 audit (queue E-01 not yet shipped). 226 still on raw `await req.json()`. **No change to 04-24 finding.** Maps to M03.

### 5.4 Stripe webhook event coverage

`grep -E "case '[a-z_.]+'" app/api/stripe/webhook/route.ts` — 8 events handled:

```
charge.dispute.created
charge.refunded
checkout.session.completed
customer.subscription.created
customer.subscription.deleted
customer.subscription.updated
invoice.paid
invoice.payment_failed
```

**Note for queue:** items J-02 (`charge.dispute.created`), J-04 (`invoice.payment_failed`), J-07 (`charge.refunded`) are now **FALSE POSITIVES** — already handled. Update queue status. Real residual missing events:

| Event | Severity | Impact | Effort |
|---|---|---|---:|
| `customer.subscription.trial_will_end` | **P1** (J-03) | retention revenue loss | 2 h |
| `invoice.payment_action_required` | **P1** (J-05) | AU/EU 3DS / SCA flow | 2 h |
| `payment_intent.payment_failed` | **P2** (J-06) | covers one-time payments | 2 h |
| `payout.failed` | **P2** (J-08) | bank info wrong → manual response | 1 h |
| `radar.early_fraud_warning.created` | **P2** (J-09) | proactive refund | 2 h |
| `customer.subscription.paused` | **P2** (J-10) | suppress further dunning | 2 h |

**Expected total: 14 events handled (up from 8). Maps to M06.** Plus J-01 handler-registry split (12 h, P0 if stripe webhook test coverage is shipped first).

### 5.5 Webhook signature verification — 4/4 endpoints PASS

| Route | Method | Verifier | Idempotency |
|---|---|---|---|
| `app/api/stripe/webhook/route.ts:219` | Stripe | `stripe.webhooks.constructEvent` | ✓ `stripe_webhook_events` table |
| `app/api/marketplace/webhook/route.ts:14–31` | Stripe (marketplace key fallback) | same | ✓ shared table |
| `app/api/webhooks/resend/route.ts:38–42` | Resend | Svix HMAC-SHA256 (`lib/resend-webhook-verify.ts`) | n/a (idempotent on email_id) |
| `app/api/webhooks/broker-signup/route.ts` | Affiliate postback | `crypto.timingSafeEqual(Bearer)` | n/a (idempotent on click_id) |

No findings. **(Existing F-7.4 PASS in security agent report.)**

### 5.6 Cron endpoints status

73 cron routes, 39 dispatcher schedule entries (consolidated for Vercel's 40-cron cap). All 39 fan out via `app/api/cron/_dispatch/[group]/route.ts`. Last 14d cron success per `cron_run_log` (when running):

```
2026-04-16: 495 ok, 0 errored
2026-04-15: 496 ok, 0 errored
2026-04-14: 182 ok, 0 errored
< 2026-04-16 22:30 UTC: cron_run_log SILENT (P0-1)
```

**P0-1 root cause hypothesis** — top 3 likely:

1. **Vercel project change** — cron schedule paused, project moved, or hit a Vercel cron-quota throttle. Check Vercel dashboard for paused crons or build failures since 2026-04-16.
2. **`wrapCronHandler` regression** — recent commit refactored cron observability. Last touched per `git log lib/cron-run-log.ts`: 2026-04-19 (commit `c7167b24`, after the silence began). Spot-check whether the file currently inserts on entry.
3. **Auth header regression** — `proxy.ts` cron Bearer check fails silently → 401 → no log row. Verify `CRON_SECRET` is set in Vercel.

**F-5.6.1 P0 — Diagnose + restore cron logging (4 h).** Maps to M09. Until P0-1 is resolved, EVERY cron-driven safety net is invisible.

### 5.7 Routes returning 500s / latency >5s p95

Vercel logs not pulled this pass (Vercel MCP not loaded). **F-5.7.1 P2 — pull Vercel runtime logs for last 7d, summarize 5xx rate per route family, attach to dashboard (3 h).** Maps to M11.

---

## 6. UI / UX deep-dive

(Full 13-finding agent report kept for reference; condensed table below. See also full text in conversation transcript.)

### Headline — already strong

- **0 raw `<img>` tags** repo-wide. Every image goes through `next/image`.
- Self-hosted Inter (5 weights) via `next/font/local` with system-font fallback.
- `<SpeedInsights/>` and `<WebVitals/>` mounted in `app/layout.tsx`.
- `PostHogProvider` is dynamically imported, `capture_pageview: false`, `disable_session_recording: true`, `person_profiles: 'identified_only'` — privacy-conscious + lazy.
- `<div onClick>` antipattern: 0 instances.
- 67 `error.tsx` boundaries.

### Headline gaps

| ID | Finding | Sev | h |
|---|---|---|---:|
| 6-A | `<Image>` `priority` missing on advisor profile hero + top 3 advisor cards (LCP element) | P1 | 2 |
| 6-B | No `AdvisorCard` component — inlined in 1,243-LOC `AdvisorsClient.tsx` | P1 | 4 |
| 6-C | 5 exit-intent variants (`ExitIntentModal`, `ExitIntentPopup`, `ExitIntentCapture`, `ExitIntentBrokerMatch`, `NewsletterExitIntentModal`) — consolidate | P1 | 6 |
| 6-D | No skip-link in `LayoutShell` | P1 | 1 |
| 6-E | `app/advisor-portal/page.tsx` (2,761 LOC) loads ~90 KB JS for any tab — split per-tab | P1 | 16 |
| 6-F | Top 5 client files >1k LOC (compare/advisor/broker/find-advisor/advisors) | P1 | 40 |
| 6-G | `<Button>` primitive used 3× vs `<button>` raw 1,243× | P1 | 12 |
| 6-H | 0 images use `placeholder="blur"` | P2 | 4 |
| 6-I | `BrokerCard` + `FullServiceBrokerCard` ⇒ shared `DirectoryCard` | P2 | 8 |
| 6-J | 2,299 Tailwind arbitrary `[…rem]` / `[…px]` values; need `2xs`/`3xs` tokens + codemod | P2 | 4 |
| 6-K | ~6 high-traffic pages missing `loading.tsx` skeletons | P2 | 6 |
| 6-L | `Header.tsx` 643 LOC — split Desktop/Mobile | P2 | 4 |
| 6-M | PostHog autocapture allowlist — drop button/anchor noise | P3 | 2 |

**P1 total 81 h · P2 26 h · P3 2 h ⇒ 109 h.** Maps to M11.

### Lighthouse top 8

Not run on sandbox. **F-6.0 P1 — run Lighthouse mobile (`/`, `/compare`, `/quiz`, `/advisors/financial-planners`, `/broker/interactive-brokers`, `/article/{popular}`, `/advisor/{active}`, `/advertise/packages`) on a clean machine; attach to dashboard (3 h).** Establishes M11 baseline.

---

## 7. Security audit

(Security agent found 23 detailed findings — 1 P0, 7 P1, 11 P2, 4 P3, ~46 h total. Full text in transcript.)

### Headline gates that already PASS

- Service-role key has **zero** client-bundle leak (verified by grep + agent inspection).
- All 4 webhook routes verify signatures before any DB write (§5.5).
- Stripe webhook idempotency via `stripe_webhook_events` is correctly used (insert + check + mark processed).
- Rate-limit coverage 100% per `scripts/rate-limit-coverage.mjs`.
- Admin login route has IP+email lockout, MFA, timing-safe email allowlist, IP hashing.
- `proxy.ts` ships HSTS preload, frame-ancestors none, nonce-based CSP `script-src` with `'strict-dynamic'`, Permissions-Policy locked down.
- All `supabase.rpc(...)` calls use named-parameter objects — no SQL injection vector.
- `<div onClick>` antipattern: 0.
- `crypto.timingSafeEqual` used in broker-signup webhook auth.

### Headline gaps (security agent findings)

| ID | Finding | Sev | h |
|---|---|---|---:|
| 7-A | **Stored XSS in newsletter** — `app/newsletter/[edition]/page.tsx:183` raw `dangerouslySetInnerHTML` of DB `html_content` | **P0** | 4 |
| 7-B | Markdown body on `/expert/[slug]:143` allows `javascript:` URLs through `lib/sanitize-html.ts` regex | P1 | 3 |
| 7-C | `lib/sanitize-html.ts` is regex-based — replace with `isomorphic-dompurify` | P1 | 4 |
| 7-D | `/api/widget` `Access-Control-Allow-Origin: *` (queue K-01) | P0 | 2 |
| 7-E | `lib/api-auth.ts:187` `API_CORS_HEADERS` exports wildcard CORS reused on `/api/v1/*` (5 routes incl. `/api/v1/api-keys`) | P1 | 3 |
| 7-F | CSP `script-src` ships `https:` fallback (broad allowlist for legacy browsers) | P2 | 2 |
| 7-G | X-Frame-Options drift `SAMEORIGIN` (proxy.ts) vs `DENY` (next.config.ts) — `frame-ancestors 'none'` already supersedes both; consolidate | P2 | 1 |
| 7-H | `/api/verify-otp/verify:15` — 10 attempts / 5 min / IP, no per-email lockout, no exponential backoff | P2 | 2 |
| 7-I | `/api/verify-otp/send:15` — no per-email cap (rotation IP attacker can spam victim) | P2 | 1 |
| 7-J | `IP_HASH_SALT` defaults to a hardcoded literal — make required | P2 | 0.5 |
| 7-K | Cookie-authed mutating routes (`/api/account/*`, `/api/admin/feature-flags`, `/api/admin/competitors`, etc.) lack Origin/Referer / CSRF-token check | P1 | 4 |
| 7-L | Admin audit log inconsistent across ~24 admin POST/DELETE routes; two table names (`admin_action_log` vs `admin_audit_log`) — consolidate + helper | P1 | 8 |
| 7-M | **241 `pg_graphql_anon_table_exposed` findings — repo doesn't use `/graphql/v1`; one-line revoke fixes all** | P1 | 1 |
| 7-N | `STRIPE_WEBHOOK_SECRET!` non-null assertion in marketplace webhook | P3 | 0.5 |
| 7-O | Newsletter sanitiser SVG/style XSS | P3 | 0.5 |

**Maps to M07 (security advisors), M11 (CSP CORS belt-and-braces), and M03 (CSRF helper as a Zod-helper sibling).**

---

## 8. SEO + structured data

(Full SEO agent report in transcript. 12 findings, 0 P0 from agent + 3 P0 lifted to top by master-audit prioritisation.)

### Headline summary

| ID | Finding | Sev | h |
|---|---|---|---:|
| 8-A | `app/sitemap.ts:151` — articles not filtered by `status='published'` (drafts can leak) | **P0** | 0.5 |
| 8-B | All 266 articles have `cover_image_url = NULL` | **P0** | 6 (backfill) |
| 8-C | No `app/opengraph-image.tsx` site-wide default | **P0** | 2 |
| 8-D | `metadataBase` in `app/layout.tsx`: not verified — relative canonicals could resolve to vercel.app | P1 | 1 |
| 8-E | 145 files with inline `"@context": "https://schema.org"` (vs prior audit's 42) — 2 parallel JSON-LD libs (`lib/seo.ts` + `lib/json-ld.ts`) | P1 | 12–16 |
| 8-F | Advisor `/advisor/[slug]/page.tsx` `ProfessionalService` schema lacks `areaServed` + `serviceType`; solo advisors get only `Person` (no business entity) | P1 | 3 |
| 8-G | `lib/schema-markup.ts:advisorJsonLd` exists but unused (page.tsx duplicates inline) | P2 | 2 |
| 8-H | 43/266 (16%) articles missing `meta_title`/`meta_description` (energy-sector batch); runtime fallback exists but isn't optimised copy | P2 | 3 |
| 8-I | In-body internal link density 0–5/1000 words (target ~10) — keyword dictionary is 64 entries, expand to ~150 + second-occurrence pass | P2 | 6 |
| 8-J | `public/robots.txt` and `app/robots.ts` both exist with hardcoded prod URL drift | P2 | 0.5 |
| 8-K | `staticPages` array in sitemap has 5 duplicate entries | P3 | 0.5 |
| 8-L | `/versus` hub page lacks `ItemList` schema for popular pairs | P3 | 1 |

**P0 19h · P1 ≈21h · P2 ≈12h · P3 ≈2h. Total ~54 h.** Maps to M12 + M07/M11.

### Domain-migration prep — risk: LOW

- Only 1 hardcoded `invest-com-au.vercel.app` reference (admin diagnostic page; non-user-facing).
- Sitemap, robots, `lib/seo.ts` all env-driven (`NEXT_PUBLIC_SITE_URL`).
- 291 files import `absoluteUrl` or `SITE_URL`.
- **Migration-day checklist** (move into queue M-stream):
  1. Set `NEXT_PUBLIC_SITE_URL=https://invest.com.au` on Vercel prod env.
  2. Verify `metadataBase` set in `app/layout.tsx` (8-D).
  3. Delete `public/robots.txt` (8-J).
  4. Confirm Sentry DSN env var carries over.
  5. Confirm `STRIPE_WEBHOOK_SECRET` and Stripe webhook URL repointed.
  6. Confirm Resend webhook URL repointed.
  7. Confirm PostHog destination (P0-3) repointed.

---

## 9. Analytics / observability

### 9.1 Cron health — **P0-1 cron silence** {#9-1}

`SELECT max(started_at), count(*) FILTER (WHERE started_at > now()-'7 days')` on `cron_run_log`:

| Metric | Value |
|---|---|
| Database now | 2026-04-26 15:54 UTC |
| Last cron run | **2026-04-16 22:30 UTC** |
| Runs in 24h | **0** |
| Runs in 48h | **0** |
| Runs in 7d | **0** |
| All-time runs (status='ok') | 1,173 |
| All-time runs (status≠'ok') | 0 |

The `cron_run_log` table has been silent for ~10 days while `vercel.json` declares 39 active cron schedules and `proxy.ts` enforces `CRON_SECRET`. Most likely explanations (in priority order to investigate):

1. **Vercel cron schedule disabled or quota-throttled.** Check `https://vercel.com/finns-projects-2deaa68c/invest-com-au/crons` — are the 39 entries showing recent runs? Any "Disabled by quota" or "Failed schedule" badges?
2. **Auth header regression in `proxy.ts` since 2026-04-16.** Crons would 401 silently. Check Vercel logs filtered to `/api/cron/_dispatch/*` for 401s.
3. **`wrapCronHandler` insert regression** — recent commit `c7167b24` (2026-04-19) touched cron-related code. Read `lib/cron-run-log.ts` — does the inserter still use `createAdminClient()`? Did `RLS` recently get added to `cron_run_log` (it has `rls_on=true, policies=0` per advisor) blocking the insert?
4. **Vercel Pro tier downgrade / billing pause.**

**This is the single most-urgent operational gap.** Every safety net relies on cron — dunning, GDPR retention, fee-snapshots, broker-snapshot, slo-monitor, observability-retention, abandoned-quiz-drip, stripe-retry-webhooks, etc. **F-9.1.1 P0 — diagnose + restore + write a heartbeat alert (Sentry "no cron in 1 hour" rule), 4 h.** Maps to M09.

### 9.2 PostHog mirror — **P0-3** {#9-2}

`posthog_events_mirror` has **0 rows** despite PR #211 wiring. The Edge Function `supabase/functions/posthog-webhook-ingest/index.ts` is correctly written (HMAC + upsert). Three things to verify in order:

1. `POSTHOG_WEBHOOK_SECRET` env var set in Vercel + matching value set in PostHog destination's `X-PostHog-Webhook-Secret` header.
2. PostHog destination URL points at the Supabase Edge Function (`https://guggzyqceattncjwvgyc.supabase.co/functions/v1/posthog-webhook-ingest`).
3. PostHog event volume — pre-launch low traffic may simply have no events to ingest yet.

**F-9.2.1 P0 — verify all 3 + test-fire one event from PostHog UI; expect a row in mirror within seconds, 2 h.** Maps to M10.

### 9.3 Sentry

- Server config: `sentry.server.config.ts` — proper request-id correlation in `beforeSend`, PII scrubbing for `password|token|secret|api_key|card|cvv|tfn`, vertical tagging from URL. `tracesSampleRate=0.1` in prod.
- Client config: `sentry.client.config.ts` — replay 1% session / 100% on error. `ignoreErrors` filters ResizeObserver noise + chunk-load errors.
- `next.config.ts` — `withSentryConfig` wraps **only when `SENTRY_AUTH_TOKEN` is set**; otherwise falls through to plain Next config (avoids upload-step build failure on local).
- **DSN in env**: not verified live this audit. **F-9.3.1 P1 — confirm `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` set in Vercel prod, 0.5 h.**
- `sentry.edge.config.ts` exists (3 lines) — sparse but acceptable.

### 9.4 Vercel Speed Insights / Web Vitals

`<SpeedInsights/>` mounted in `app/layout.tsx:157`. `<WebVitals/>` component also mounted (line 155). `web_vitals_samples` and `web_vitals_daily_rollup` tables exist; row counts not yet meaningful (0 — likely waiting on real prod traffic). **F-9.4.1 P2 — confirm web-vitals events flowing on preview branch (1 h).** Maps to M11.

### 9.5 Google Analytics + Facebook Pixel

`<GoogleAnalytics />` mounted in layout. Env vars `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_GA_MEASUREMENT_ID` per `.env.local.example`. **F-9.5.1 P3 — verify GA4 events post-launch with real cookie consent (1 h).**

### 9.6 SLOs

`slo_definitions` has 10 rows already configured (per CLAUDE.md SLO seed expectation). `slo_incidents` 0. Schema includes `name/service/metric/target/comparator/window_minutes`. Wired to a `slo-monitor` cron (last ran 2026-04-16, see P0-1).

**F-9.6.1 P1 — review the 10 SLO rows post-cron-restore; ensure thresholds are realistic + alert sink is configured (Slack/PagerDuty). 4 h.** Queue L-stream.

---

## 10. Agent system (n8n)

`infra/n8n/` contains 6 workflow JSONs (matches user statement of 6 dormant; 6 PRs #203-209 — note: PR #210 was data aggregator, PR #211 PostHog wiring, so workflow PRs were #203-#209 minus 1 = 6 distinct workflows).

| Workflow | Active | ErrorWorkflow | alwaysOutputData | Hardcoded keys | Runbook |
|---|---|---|---|---:|---|
| `overseer_hourly` | ❌ | **❌** | 2/7 | 4 | docs/ops/n8n-phase1-overseer.md |
| `cto_daily` | ❌ | ✅ | 2/10 | 2 | docs/ops/n8n-phase2-cto.md |
| `editorial_publish_gate` | ❌ | ✅ | 1/12 | 2 | docs/ops/n8n-phase2-editorial-publish-gate.md |
| `analytics_daily` | ❌ | ✅ | 1/5 | 0 | docs/ops/n8n-phase2-analytics.md |
| `lead_nurture_hourly` | ❌ | ✅ | 1/8 | 4 | docs/ops/n8n-phase2-lead-nurture.md |
| `advisor_onboarding` | ❌ | ✅ | 1/13 | 2 | docs/ops/n8n-phase2-advisor-onboarding.md |

### Findings

| ID | Finding | Sev | h |
|---|---|---|---:|
| 10-A | **All 6 workflows currently `active: false`** — pre-launch state. Each has a runbook. Activation gating is a launch checklist item. | P3 | docs only |
| 10-B | `overseer_hourly` lacks `errorWorkflow` setting (others have it). | P1 | 0.5 |
| 10-C | **5/6 workflows ship with hardcoded keys / tokens in node expressions** — pattern matched `sk_`, `whsec_`, `eyJ` (JWT shape). Each token value should be a credential reference, not a literal in the JSON. **Especially relevant once they're activated** — committing `whsec_*` or `sk_test_*` to git is a credential-leak vector. | **P1** | 4 |
| 10-D | `alwaysOutputData: true` set on only 8 of 55 nodes total. Per CLAUDE.md and the queue defaults, every Read/HTTP node should have it so a quiet response doesn't break downstream branches. | P2 | 3 |
| 10-E | All 6 workflows have a runbook in `docs/ops/`. ✓ | PASS | — |
| 10-F | Runbook coverage for activation **launch checklist** — each runbook should include the "to activate" checklist item explicitly (auth, secret, n8n cron, error workflow link, expected throughput). | P2 | 2 |
| 10-G | No `infra/n8n/error_workflow.json` master committed — workflows reference it but the file isn't here. **F-10.7 P1 — commit the canonical error workflow + verify all 5 reference the same id (1 h).** | P1 | 1 |

**Maps to M07 (secrets) + M09 (workflow observability — share cron-stuck dashboard).**

---

## 11. Stripe revenue infrastructure

### 11.1 Products (12 live, AUD)

| Product | Price | Type | Stripe ID |
|---|---:|---|---|
| Investing Course — Pro | $99 AUD | one_time | prod_UCtYltWiPEtYSt / price_…HRsv |
| Investing Course — Standard | $49 AUD | one_time | prod_UCtY1CgZgvHizY / price_…tw7C |
| Invest.com.au Pro — Yearly | $89 AUD | recurring/year | prod_UCtY6IKLxYHoCv / price_…Y7ox |
| Invest.com.au Pro — Monthly | $9 AUD | recurring/month | prod_UCtYfW8uHKtfKD / price_…L4Do |
| Expert Article — Premium (1,500+ words) | $499 AUD | one_time | prod_UCAXEyFI4b3xDO / price_…thrT |
| Expert Article — Basic (500 words) | $199 AUD | one_time | prod_UCAXmEI2uCwiJm / price_…C8lg |
| Featured Listing — Basic ($99/mo) | $99 AUD | recurring/month | prod_UCAWvNsThEL7wx / price_…oeNp |
| Featured Listing — Standard ($149/mo) | $149 AUD | recurring/month | prod_UCAWtghTEvougF / price_…CrLw |
| Featured Listing — Premium ($199/mo) | $199 AUD | recurring/month | prod_UCAWTY5FFuoRNT / price_…suPn |
| Premium Lead Pack — 35 Leads | $999 AUD | one_time | prod_UCAWkvWIi6CIMc / price_…YoYy |
| Growth Lead Pack — 15 Leads | $499 AUD | one_time | prod_UCAWJIG14dZaev / price_…DFh5 |
| Starter Lead Pack — 5 Leads | $199 AUD | one_time | prod_UCAWa432ez7Sw8 / price_…T2FJ |

### 11.2 Product → feature mapping

All 12 products map to a code path:

| Product | Code path |
|---|---|
| Pro Monthly / Yearly | `app/api/stripe/create-checkout/*` → `subscriptions` table → Pro feature gating (advanced filters, alerts, watchlists, ad-free) |
| Investing Course Standard / Pro | `app/api/stripe/course/*` → `course_purchases` |
| Expert Article Basic / Premium | `app/api/stripe/expert-article/*` → `content_products` (1 row already) |
| Featured Listing Basic / Standard / Premium | `app/api/stripe/featured-checkout/*` → `featured_plans` (3/5 rows linked, see 11.3) |
| Lead Packs (5/15/35) | `app/api/stripe/lead-pack/*` → `advisor_credit_topups` → wallet credit |

**No orphan products and no orphan features.** ✓

### 11.3 `featured_plans` table — 3/5 stripe_price_id (queue J-11)

```
id 1: Featured Advisor          $149/mo  ← stripe_price_id present
id 2: Featured Premium          $199/mo  ← stripe_price_id present
id 3: Featured Basic            $99/mo   ← stripe_price_id present
id 4: International Premium     $1,999/mo ← NULL (no Stripe product)
id 5: International Standard    $999/mo   ← NULL (no Stripe product)
```

**F-11.3.1 P1 (queue J-11) — Decide: (a) create Stripe products for the 2 international tiers, OR (b) deactivate them in `featured_plans` (set `active=false`) until international launch (Phase 4). Either way, eliminate the NULL stripe_price_id state. 1 h or 2 h.**

### 11.4 Lead pricing matrix (`lead_pricing` table)

Has **22 advisor types with full pricing** (price_cents, min, max, free_trial_leads, featured_monthly_cents). Sample headlines:

- Mortgage broker / buyers_agent / energy_consultant: $75 base
- Mining_lawyer: $200 base (premium)
- International_buyer: $150 (P1 specialty)
- Debt_counsellor: $29 (social-tier)

**Coverage matches user's stated 22 advisor types. ✓** No new finding.

### 11.5 Webhook event handling — see §5.4

Already-handled 8 + 6 missing. Queue J-stream coordinates rollout.

### 11.6 Webhook idempotency

`stripe_webhook_events` correctly used:
- INSERT on event arrival (`event_id`, status='processing').
- Skip-on-duplicate (PostgreSQL unique constraint).
- UPDATE to `status='processed'` after success (or `failed` on error).

Currently 0 rows because the test-mode webhook doesn't fire in production yet. **F-11.6.1 P2 — fire a test event from Stripe CLI on preview deploy; verify a row lands. (1 h).** Maps to M06.

### 11.7 Stripe SDK version

Currently 17.7.0 vs latest 22.1.0. **F-11.7.1 P1 — bump to 22.x in queue P-stream (6 h).** API version + types changes; webhook events stable.

---

## 12. Enterprise-grade gaps

### 12.1 Backup / DR

- **Supabase PITR enabled** — verified (Pro tier). No advisor finding for backup posture.
- **Restore drill** documented in `docs/runbooks/launch-day.md` (T-7 day item: "restore the latest Supabase PITR snapshot to a throwaway project and verify queries return data").
- **F-12.1.1 P1 — actually run the restore drill once before launch; document timing and any gotchas (4 h).** Queue Q-stream.

### 12.2 Secret rotation

- `docs/runbooks/secret-rotation.md` exists (124 LOC) with cadence table and per-secret procedures (CRON_SECRET 90d, INTERNAL_API_KEY 90d, REVALIDATE_SECRET 90d, SUPABASE_SERVICE_ROLE_KEY 180d, RESEND_API_KEY 180d, STRIPE_SECRET_KEY annually, IP_HASH_SALT never).
- **F-12.2.1 P2 — complete an end-to-end rotation drill on `CRON_SECRET` before launch; surface timing, downstream breakage, calendar reminders (3 h).** Queue Q.

### 12.3 Onboarding runbook for new dev

- `README.md` (88 LOC), `CONTRIBUTING.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `COMPANY.md` — strong foundation.
- **F-12.3.1 P2 — explicit "first day" runbook**: clone, install Node 20+, copy `.env.local.example`, get keys list (with Slack channel to ask), run `npm run dev`, expected output, common gotchas (`.npmrc` legacy-peer-deps, husky `prepare`, sandbox tsc OOM). 3 h. Queue S-stream.

### 12.4 Architecture diagram + data-flow diagram

- `ARCHITECTURE.md` has an ASCII diagram of the request lifecycle. Sufficient for now.
- **No formal data-flow diagram** for the lead funnel (visitor → quiz → email_captures → leads → professional_leads → wallet → advisor_billing → finance_transactions). **F-12.4.1 P2 — Mermaid diagram in `docs/architecture/data-flow-leads.mmd` + matching `.png`. 4 h.** Queue S-stream.

### 12.5 Incident-response playbook

- 14 runbooks in `docs/runbooks/` (1,255 LOC). Covers: launch-day, launch-rollback, secret-rotation, breach-notification, database-rollback, advisor-kyc-stuck, cron-stuck, stripe-webhook-stuck, month-end-close-failed, notification-inbox-empty, resend-rate-limited, tmd-coverage-gap, commodity-news-brief-stuck-draft.
- **Headline gaps**:
  - No "PostHog mirror empty" runbook — would help with P0-3.
  - No "Sentry DSN dropped" / "alert flood" runbook.
  - **F-12.5.1 P2 — author 3 missing runbooks: posthog-mirror-empty, sentry-alert-flood, account-recovery (lost-MFA admin). 4 h.** Queue Q.

### 12.6 SOC 2 readiness gaps

This audit is not a SOC 2 audit, but the headline pre-reqs:

| Trust principle | Status | Action |
|---|---|---|
| **Security** — RLS, encryption at rest (Supabase), TLS, MFA, audit log | partial — see §7 audit-log gap (P1, 7-L) | F-12.6.1 P1 — close 7-L audit-log helper (8 h) |
| **Availability** — uptime, monitoring, runbooks, capacity | runbooks ✓, P0-1 cron silence breaks "monitoring" | F-9.1.1 (P0) |
| **Processing integrity** — webhook idempotency, financial reconciliation | ✓ stripe_webhook_events; finance_transactions exists | F-12.6.2 P2 — month-end-close drill (3 h) |
| **Confidentiality** — service-role isolation, secret rotation | partial — see 04-24 admin.ts scope reset (140+ sites) | C-stream in queue |
| **Privacy** — GDPR / AU Privacy Act endpoints | ✓ data-export, deletion, correction, preference UI | F-12.6.3 P2 — privacy policy text matches code (1 h) |

**F-12.6 P2 — engage SOC 2 readiness assessment 60d before commercial customers, scope ~Stage 1 only (external cost, ~$5k AUD).**

### 12.7 GDPR / AU Privacy Act endpoints

Already strong:

- `/api/account/export-data` — data portability (rate-limited 1/24h)
- `/api/account/delete` — right to erasure (POST = request, DELETE = execute)
- `/api/privacy/correct` — rectification
- `/api/privacy/request` — general request
- `app/privacy/data-rights/` — UI
- `data_export_requests`, `account_deletion_requests`, `privacy_data_requests`, `tos_acceptances` tables exist
- `cron-gdpr-retention-purge` cron exists (currently silenced by P0-1)

**F-12.7.1 P1 — once P0-1 resolved, verify retention-purge cron actually deletes per `retention_rules` (5 rows). 2 h.**

---

## Severity-mapped action register

(Roll-up of all findings P0/P1 by section. Full P2/P3 list omitted for brevity — see per-section tables.)

### P0 (8 items, ~36 h)

| ID | Section | Finding | Maps to |
|---|---|---|---|
| P0-1 | §9.1 | Cron silence — diagnose + restore | M09 |
| P0-2 | §7.7 | Stored XSS in newsletter renderer | M07 |
| P0-3 | §9.2 | PostHog mirror empty | M10 |
| P0-4 | §8.1 | Sitemap leaks article drafts | M12, M11 |
| P0-5 | §8.6 | 0/266 article cover images | M12 |
| P0-6 | §8.6 | Missing site-wide OG default | M12 |
| P0-7 | §7.2 | `/api/widget` wildcard CORS | M07, M11 |
| P0-8 | §4.4 | 57 RLS-no-policy tables | M04, M07 |

### P1 (41 items, ~248 h)

(Selection of top 20 by leverage; full list mappable via per-section tables.)

| Section | Finding |
|---|---|
| §1.5 | 145 inline JSON-LD files — consolidate (12–16 h) |
| §1.3 | `app/advisor-portal/page.tsx` 2,761 LOC split (16 h) |
| §1.3 | Top 5 client files >1k LOC split (40 h) |
| §2.3 | D-stream 9 critical-path API tests (9 h) |
| §3.1 | Sentry 9 → 10 (4 h) |
| §3.1 | Stripe 17 → 22 (6 h) |
| §4.4 | Revoke `pg_graphql` anon — kills 241 advisor findings (1 h) |
| §4.5 | Wrap `auth.uid()` in subquery for RLS perf (4 h) |
| §5.4 | J-03/05 trial_will_end + payment_action_required (4 h) |
| §5.6 | Cron heartbeat alert (1 h) |
| §6 | Skip-link + advisor profile priority + AdvisorCard extract (7 h) |
| §6 | Button primitive adoption (12 h) |
| §6 | 5 exit-intent variants → one (6 h) |
| §7.7 | DOMPurify replacement of regex sanitiser (4 h) |
| §7.10 | Audit-log helper + backfill 24 admin routes (8 h) |
| §7.8 | Origin-check helper for cookie-authed mutators (4 h) |
| §7.2 | `/api/v1/*` CORS allowlist (3 h) |
| §8.4 | `metadataBase` verification (1 h) |
| §8.9 | Advisor `FinancialService` schema fields + solo-advisor case (3 h) |
| §10 | n8n workflow secrets externalisation (4 h) |
| §10 | Master error-workflow JSON committed (1 h) |
| §11.3 | featured_plans 3/5 → 5/5 decision (1–2 h) |
| §12.6 | 7-L audit-log helper (8 h) |

### P2 (39 items, ~196 h)

Highlights:
- 286 unused indexes drop (8 h)
- 102 multiple-permissive policies consolidate (6 h)
- 4 unindexed FKs (1 h)
- Bundle-size analyzer baseline (3 h)
- Sentry env vars verify (0.5 h)
- Lighthouse baseline 8 pages (3 h)
- Article cover backfill (6 h)
- 16% missing meta_title (3 h)
- DR drill (4 h)
- Secret rotation drill (3 h)
- 4 missing runbooks (4 h)
- Mermaid data-flow (4 h)

### P3 (22 items, ~38 h)

Mostly cosmetic — sitemap dedup, versus-hub ItemList, PostHog autocapture allowlist, depcheck, GA4 verify, etc.

---

## 4-month plan — proposed sprint order

**Constraint:** ACL is the launch trigger. ~16 weeks of runway. Two-week sprints, 30 h/week effective remediation budget = ~480 h capacity. Backlog is ~915 h (215 items 04-24+04-26 combined). **Cannot ship 100% — must prioritise revenue gates, compliance gates, observability gates first; cosmetic last.**

### Sprint 1 (weeks 1-2) — "Wake the system up"

Theme: get observability + safety nets back to green so all later work has a feedback loop.

- **P0-1** Cron silence diagnose + restore + heartbeat alert (4 h + 1 h)
- **P0-3** PostHog mirror verify env + destination (2 h)
- **P0-2** Stored XSS newsletter sanitiser fix (4 h)
- **P0-7** `/api/widget` CORS K-01 (2 h)
- **P0-8** RLS-no-policy critical 16 user-data tables (16 h)
- F-9.6.1 SLO review + alert sink (4 h)
- F-9.3.1 Sentry env vars verify (0.5 h)
- F-9.4.1 Web Vitals events flowing on preview (1 h)
- F-12.5.1 posthog-mirror-empty runbook (1 h)
- D-01..D-09 critical-path tests (9 h, ship in parallel)

**Total ≈ 44 h. Ships 9 P0 + 1 P1 + 4 P2.** Maps to M01/M02/M04/M07/M09/M10.

### Sprint 2 (weeks 3-4) — "Close the SEO + revenue gate"

- **P0-4** Sitemap article-status filter (0.5 h)
- **P0-5** Article cover-image backfill — script + reviewer (6 h)
- **P0-6** Site-wide OG default + Twitter image (2 h)
- F-8.4 metadataBase verify (1 h)
- F-8.6 advisor FinancialService + solo case (3 h)
- F-11.3 featured_plans cleanup decision + execute (2 h)
- J-03 + J-05 trial-will-end + payment-action-required handlers (4 h)
- J-01 Stripe webhook handler-registry split (12 h, requires D-stream Stripe tests)
- F-7.10 audit-log helper + backfill (8 h)

**Total ≈ 39 h.** Maps to M06/M07/M11/M12.

### Sprint 3 (weeks 5-6) — "Database hardening"

- F-4.4.2 revoke pg_graphql anon (1 h, kills 241 advisor findings)
- F-4.5.3 wrap auth.uid() in subqueries (4 h, kills 24 perf findings)
- F-4.5.4 add 4 FK indexes (1 h)
- O-stream: remaining ~40 RLS-no-policy tables (12 h)
- A-stream chunk 1: drift backfill for user-data tables (12 h)
- F-3.1.1 Sentry 9 → 10 (4 h)
- F-3.1.2 Stripe 17 → 22 (6 h)

**Total ≈ 40 h.** Maps to M04/M05/M07/M08.

### Sprint 4 (weeks 7-8) — "n8n + agent activation"

- 10-G master error workflow file (1 h)
- 10-C externalise hardcoded keys in 5 workflows (4 h)
- 10-B add errorWorkflow to overseer_hourly (0.5 h)
- 10-D alwaysOutputData on Read nodes (3 h)
- 10-F runbook activation checklists (2 h)
- Activate workflows one-by-one with kill-switch ready (8 h ops time)
- F-1.5.1 JSON-LD consolidation pass 1 (8 h, top 30 callers)
- E-stream Zod for top 20 routes (16 h)

**Total ≈ 42 h.** Maps to M03/M07.

### Sprint 5 (weeks 9-10) — "UI/UX leverage"

- 6-D skip-link (1 h)
- 6-A advisor profile priority + 6-B AdvisorCard (6 h)
- 6-C exit-intent consolidate (6 h)
- 6-G Button primitive adoption pass 1 (6 h)
- 6-H blur placeholders (4 h)
- 6-J Tailwind tokens + codemod (4 h)
- 6-K loading.tsx skeletons (6 h)
- F-1.2.1 Playwright visual snapshots (4 h)
- Lighthouse baseline + iterate top 5 (8 h)

**Total ≈ 45 h.** Maps to M11.

### Sprint 6 (weeks 11-12) — "Big files split + tests"

- 6-E advisor-portal split (16 h)
- 6-F top 5 client splits — start with `compare/CompareClient.tsx` and `find-advisor/page.tsx` (16 h, partial)
- D-11 backfill ~20 more route tests (20 h)

**Total ≈ 52 h.** Maps to M01/M02/M11.

### Sprint 7 (weeks 13-14) — "DR + SOC 2 readiness + remaining J/K"

- F-12.1.1 PITR restore drill (4 h)
- F-12.2.1 secret rotation drill (3 h)
- F-12.5.1 missing runbooks (4 h)
- F-12.4.1 Mermaid data-flow diagram (4 h)
- F-12.3.1 onboarding day-1 runbook (3 h)
- J-06/08/09/10 remaining Stripe webhook events (7 h)
- 7-K Origin-check helper + backfill cookie-authed mutators (4 h)
- 7-H/I OTP per-email lockout (3 h)
- 7-J `IP_HASH_SALT` make required (0.5 h)

**Total ≈ 33 h.** Maps to M06/M07.

### Sprint 8 (weeks 15-16) — "Domain migration drill + cleanup + go-live"

- F-8.10 domain-migration drill on staging (4 h, queue M-stream)
- F-2.4.1 R-stream lib coverage (10 h)
- F-7.7.3 DOMPurify replacement (4 h)
- F-1.5.1 JSON-LD consolidation pass 2 + finish (8 h)
- 6-F top 5 client splits — finish (16 h)
- Final pre-launch checklist walkthrough per `launch-day.md` (8 h)

**Total ≈ 50 h.** Cushion for any P0 that surfaces.

---

## What NOT to fix in 4 months (deferred to post-launch)

- F-stream cosmetic SSOT violations beyond the JSON-LD consolidation (formatCurrency / formatDate dedup) — opportunistic during feature work.
- A-stream complete drift backfill (only chunk 1 in plan; drift for content/ops tables can be backfilled post-launch).
- E-stream tail Zod rollout (top 20 only; remaining 200+ routes post-launch).
- D-11 full route test backfill beyond ~30 routes — diminishing returns.
- 6-F top 5 client splits beyond first 2 — opportunistic during feature work.
- SOC 2 Stage 1 — book provider engagement at month +3 post-launch.
- 286 unused indexes — keep but stop adding new ones; mass-drop post-launch with metrics validation.

---

## How to use this audit

1. **Read the §0 executive summary + §0 P0 table — those eight items are the first sprint.**
2. **Open the GitHub tracking issue** (link from this doc; see "Tracking" footer below).
3. **Each finding has an ID** (e.g. `F-7.7.1`, `7-A`, `P0-1`) — use these in commit messages and PR titles so the dashboard can map ship → metric improvement automatically.
4. **The 04-24 audit (`codebase-health-2026-04-24.md`) and `REMEDIATION_QUEUE.md` are still authoritative for streams A-S.** This audit's J-S references map directly into that queue. Update queue items J-02, J-04, J-07 to **false-positive** based on §5.4.
5. **Re-baseline the metrics dashboard** with the §0 M01-M12 table values; ratchet via PR.

---

## Tracking

- **GitHub issue:** [#221 — 4-month enterprise-grade improvement plan](https://github.com/Funs7575/invest-com-au/issues/221).
- **Audit doc:** `docs/audits/2026-04-26-comprehensive-audit.md` (this file).
- **Remediation queue:** `docs/audits/REMEDIATION_QUEUE.md` (streams J–S draw from this doc; update queue when any finding ID lands).
- **Slash command:** `/audit-remediation-iteration` consumes the queue per `REMEDIATION_DEFAULTS.md`.

## Sprint 1 close-out — running log

Updated in-place as items ship; full close-out summary written when the sprint completes.

| Date | Item | Status | PR / commit | Metric impact |
|---|---|---|---|---|
| 2026-04-26 | **J-11** featured_plans + listing_plans stripe_price_id wires (26 wires total) | DONE by founder (Stripe MCP) | — | M06 unaffected; revenue surface complete |
| 2026-04-26 | **F-4.4.2** pg_graphql revoke anon | PR opened | [#223](https://github.com/Funs7575/invest-com-au/pull/223) | M07: 261 → ~20 (kills 241 advisor findings) |
| 2026-04-26 | **J-02 / J-04 / J-07** | FALSE POSITIVE — already handled | queue updated | (no work) |

— end —
