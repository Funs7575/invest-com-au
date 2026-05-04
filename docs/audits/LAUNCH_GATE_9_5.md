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
| Route reachability — `/api/admin/run-migration` returns 404 in prod despite source presence | **P0** | DNS / Vercel domain binding | 🔴 **root cause identified**: apex domain `invest.com.au` is **not bound** to the Vercel project (project's `domains` array contains only the auto-generated `*.vercel.app` aliases). `invest.com.au` resolves to a separate nginx/cPanel host (`x-httpd-modphp: 1`) that returns generic 404s for every non-root path. `/api/admin/run-migration` returns **401** correctly when called via `https://invest-com-au.vercel.app` — the route is fine; the **entire production app is unreachable at the canonical domain**. Filed as A-96 (P0 launch-blocker); A-95 superseded. |
| Production domain binding — `invest.com.au` not bound to Vercel project | **P0** | DNS / Vercel project domains | 🔴 open — filed as A-96. Launch-blocker: every page and API route on the canonical domain currently 404s. Until DNS + Vercel binding is fixed, no end-user can reach the app. |
| `marketplace/notify` accepts service-role key as bearer | P0 | `app/api/marketplace/notify/route.ts:33` | 🔴 open — filed as `A-91` in queue. Service-role-as-auth-token is a critical anti-pattern (see `CLAUDE.md` admin-client allowed-scope). |
| `marketplace/campaigns` UI sends literal `"browser-admin"` as `x-internal-key` | P1 | `app/admin/marketplace/campaigns/page.tsx:131` | 🔴 open — filed as `A-92`. Caller is broken (env vars never equal that literal) AND attempts client-side auth bypass. |
| Open-coded `Bearer ${CRON_SECRET}` checks across `app/api/admin/*` (drift from `requireCronAuth`) | P2 | 6+ files | 🟡 open — filed as `A-93` in queue. Per-file PRs to migrate. |
| `quotes/[slug]/review`, `analytics-dashboard`, `verify-professional` open-coded auth | P2 | 3 files | 🟡 open — filed as `A-94`. |

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
