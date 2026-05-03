# Launch Gate 9.5

The objective bar that must be met for the Oct–Dec 2026 production
migration cutover (per `COMPANY.md`). "9.5" is the target
`QUALITY_DASHBOARD.md` score — the migration does not proceed below
this number.

**Status:** DRAFT — criteria require founder ratification before this
gate is treated as binding. See `DECISIONS_LOG.md` entry 2026-05-03 for
context.

---

## Gating criteria (proposed — TBD ratify)

These are derived from existing repo docs and current dashboard rows.
Founder must confirm or override each before this file is authoritative.

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

## Open questions for founder

1. Confirm the 9.5 score floor or set a different number.
2. Confirm per-surface 9.0 floor or relax for low-traffic surfaces.
3. Confirm "zero P0/P1" or allow named exceptions with sunset dates.
4. Define what triggers a re-evaluation (weekly cadence? PR-level?).

Until these are answered, this file is informational, not binding.
