# Launch Gate 9.5

The objective bar that must be met for the Oct–Dec 2026 production
migration cutover (per `COMPANY.md`). "9.5" is the target
`QUALITY_DASHBOARD.md` score — the migration does not proceed below
this number.

**Status:** RATIFIED 2026-05-03. See `DECISIONS_LOG.md`.

---

## Critical section — open security/auth items (highest priority)

Tracked here at the top so cycle-by-cycle progress is visible. Each
PR cycle updates this section first: marks items green when fixed,
adds new items as Codex review or audit scripts surface them.

| Item | Severity | File | Status |
|---|---|---|---|
| `run-migration` ad-hoc auth + mixed-secret fallback | P1 | `app/api/admin/run-migration/route.ts` | ⚠️ **fixed in code (PR #536, merged `bf966f59`); prod verification blocked.** Production curls returned 404 on all four verification probes (CRON_SECRET GET/POST, INTERNAL_API_KEY GET, no-auth GET) — the route is unreachable, not failing auth. Source-side investigation ruled out routing config, middleware, basePath, and rewrites; root cause is in the deployment layer (Vercel build/bundling/aliasing). See A-95 for diagnosis follow-up. The code-level security improvement stands and is covered by 5/5 unit tests; the **behavioural** verification remains pending until reachability is restored. |
| Route reachability — `/api/admin/run-migration` returned 404 when probed against `invest.com.au` | n/a | verification used wrong hostname | ✅ resolved 2026-05-04: production URL is the Vercel alias `https://invest-com-au.vercel.app`, not the apex `invest.com.au` (apex switchover is deferred pending AFSL license, target ~Oct 2026 cutover per `COMPANY.md`). Re-run probe: `curl -i https://invest-com-au.vercel.app/api/admin/run-migration -H "Authorization: Bearer $CRON_SECRET"` returns 401 without auth, 200 with auth — route is fine, A-90 code fix verifies correctly. A-95 / A-96 closed. |
| Apex domain `invest.com.au` not yet bound to Vercel | deferred-post-launch | DNS | 🟡 intentional — apex stays on prior host until AFSL license is granted. At license-grant time: add `invest.com.au` and `www.invest.com.au` in Vercel dashboard, update registrar A/AAAA + CNAME records, wait for DNS propagation, swap canonical URLs in code (sitemap, OG, email links, SEO helpers in `lib/seo.ts`). Tracked as part of the Oct–Dec 2026 cutover window. |
| `marketplace/notify` accepts service-role key as bearer | P0 | `app/api/marketplace/notify/route.ts:33` | ✅ closed 2026-05-07 by PR #545 (A-91+A-92). |
| `marketplace/campaigns` UI sends literal `"browser-admin"` as `x-internal-key` | P1 | `app/admin/marketplace/campaigns/page.tsx:131` | ✅ closed 2026-05-07 by PR #545. |
| Open-coded `Bearer ${CRON_SECRET}` checks across `app/api/admin/*` (drift from `requireCronAuth`) | P2 | 6+ files | ✅ closed 2026-05-07 by PR #548 (A-93). |
| `quotes/[slug]/review`, `analytics-dashboard`, `verify-professional` open-coded auth | P2 | 3 files | ✅ closed 2026-05-07 by PR #550 (A-94). |
| `data_export_requests` table missing in live (A-MISSING-TABLE-2) | P1 | `supabase/migrations/20260427_wave_security_observability.sql:144-173` | ✅ closed 2026-05-08 — applied via Supabase MCP; repo migration `20260713_a_missing_table_2_data_export_requests_repair.sql` checked in for parity. |
| **`best_for_scenarios` 20 slugs missing in live (G-04 finding M2)** | P2 | `supabase/migrations/20260426_wave_launch_readiness.sql` lines 188-378 | ✅ closed 2026-05-08 — applied via Supabase MCP after translating `'{"key": true}'` JSONB-object syntax to `ARRAY['key']::text[]` (the actual live column type). Repo file: `20260714_g04_m2_best_for_scenarios_repair.sql`. Root cause of original miss documented in same file. |
| **`20260411_features_11_12_14_15_16_18.sql` entire migration unapplied (G-04 finding M6)** | P1 | 7 tables + 17 column ALTERs | ✅ closed 2026-05-08 — re-applied via Supabase MCP. All 7 tables created, all column ALTERs landed. 11 prod code paths unblocked. Repo file: `20260715_g04_m6_features_11_18_repair.sql`. |

Re-checked every cycle. Items move to ✅ when the fix lands on `main`.
New items append below; do not delete fixed items — they're audit
trail for the launch-gate review.

---

## Gating criteria

### Quality

- [ ] `QUALITY_DASHBOARD.md` overall score ≥ 9.5 / 10.
- [ ] Per-surface rubric in `ENTERPRISE_STANDARD.md` met for every
      surface kind (no surface below 9.0).
- [ ] Coverage thresholds in `vitest.config.mts` ratcheted to current
      levels (no slack for regression).

### Security & data

- [ ] Zero P0 / P1 items open in `REMEDIATION_QUEUE.md` Streams A
      (RLS), B (auth), C (admin/service-role).
- [ ] All user-data tables have RLS enabled with explicit policies.
- [ ] RLS isolation gate green in CI on the cutover commit.
- [ ] `lib/supabase/admin.ts` call sites all justified per the allowed
      scope in `CLAUDE.md`.

### Reliability

- [ ] All cron routes wrap work in `requireCronAuth` + heartbeat
      logger.
- [ ] All webhook handlers idempotent (Stripe idempotency gate green).
- [ ] Sentry release health ≥ 99.5% over the 7 days preceding cutover.

### Compliance

- [ ] AFSL / GDPR / disclosure copy sourced from `lib/compliance.ts`
      everywhere (no hardcoded duplicates per
      `audit:duplicate-functions`).
- [ ] SOC 2 Q-SOC2-01..11 closed (currently in flight).
- [ ] All migrations forward-only with rollback headers.

### Operational

- [ ] All five validation commands (lint, type-check, test,
      audit:console-calls, audit:duplicate-functions) green on `main`.
- [ ] Bundle size within budget per `.quality-targets.yml`.
- [ ] `docs/runbooks/` cover every known incident class.

---

## What this gate is *not*

- Not a one-time checklist — re-evaluated weekly via the dashboard.
- Not a substitute for the per-PR merge policy
  (`MERGE_AUTHORIZATION.md`).
- Not a freeze — feature work continues; the gate determines cutover
  readiness, not main-branch hygiene.

---

## Re-evaluation

Weekly cadence by default — `QUALITY_DASHBOARD.md` is refreshed and
this gate is re-checked. Per-PR re-evaluation is not required; the
existing tier policy in `MERGE_AUTHORIZATION.md` covers per-PR risk.
