# Risk Assessment 2026

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-03
**Next review:** 2027-05-03 (annual; or on material change)
**Maps to SOC 2 TSC:** CC3.1, CC3.2, CC3.3, CC9.1

## Purpose

Identifies risks that could prevent invest.com.au from meeting its commitments to users (financial-advisor matching, broker comparison, accurate factual content) and regulators (AFSL, ASIC, Privacy Act, AUSTRAC where applicable). Required for SOC 2 Type II Common Criteria 3.

## Scope

Operational, security, compliance, financial, and product-quality risks specific to a regulated Australian financial-comparison platform serving consumers + advisors + sponsoring brokers.

Reviewed:
- Annually (this document)
- Within 30 days of any material business change (new vertical, new vendor, new regulatory requirement, breach incident, governance change)
- After every P0 incident (post-mortem feeds back here)

## Risk evaluation method

Each risk is scored on:

- **Likelihood:** Low (< 5% / yr) / Medium (5–25% / yr) / High (> 25% / yr)
- **Impact:** Low (< $10k / minor user impact) / Medium ($10k–$100k / segment of users) / High (> $100k / regulator notification / company-extinction)
- **Residual rating:** Likelihood × Impact, after existing mitigations

Risks rated **High residual** receive named owners and explicit mitigation deadlines. Medium residual is tracked. Low residual is logged for review at next cycle.

## Risk register

### R1 — RLS gap on user-data table leaks PII via anon client

- **Likelihood:** Medium (was High before Streams A/B; now Medium because backfill ~85% complete)
- **Impact:** High (Privacy Act notification, OAIC report, reputation, AFSL review)
- **Existing mitigations:** RLS enforced on most user-data tables; `b-07` migration gate fails CI for new `CREATE TABLE` without `ENABLE ROW LEVEL SECURITY`; ESLint `no-restricted-imports` for `lib/supabase/admin`; quarterly access review per access-control-policy
- **Residual:** Medium → drops to Low when Stream A and remaining B-stream items complete
- **Owner:** Founder + audit-remediation loop
- **Action:** Complete A-05, A-07, B-09 by 2026-06-15

### R2 — Stripe webhook idempotency failure causes double-charge or missed subscription

- **Likelihood:** Low (idempotency table in place; replay-safe handlers tested)
- **Impact:** High (financial loss, user trust, ASIC notification if systemic)
- **Existing mitigations:** `stripe_webhook_events` table with `processing → done` state machine; V-NEW-03 idempotency replay test in CI; signature verification; `lib/stripe/*` is denylist path requiring human review
- **Residual:** Low
- **Owner:** Founder
- **Action:** Run quarterly replay drill (covered by access-control-policy.md drill cadence)

### R3 — AI factual-output makes false financial claim, triggers AFSL violation

- **Likelihood:** Medium (active use of LLMs in chatbot, recommendations, drafts)
- **Impact:** High (AFSL review, ASIC enforcement, brand)
- **Existing mitigations:** V-NEW-02 `filterFactualOutput()` gate; AFSL disclosure copy in `lib/compliance.ts`; per-surface enterprise rubric requires factual-filter on every AI response; AI cost caps + rate limits prevent runaway generation; `<DatedStatBadge>` enforces dated-stat staleness gate
- **Residual:** Low–Medium
- **Owner:** Founder + V-NEW-02 stream owner
- **Action:** Quarterly review of LLM prompts + guardrails; spot-check 20 random AI outputs/quarter

### R4 — Lighthouse Core Web Vitals regression goes undetected

- **Likelihood:** Medium (LH gate just made advisory due to runner noise)
- **Impact:** Low–Medium (SEO loss, user friction, no immediate financial impact)
- **Existing mitigations:** Vercel Speed Insights; advisory LH gate still runs and reports; bundle-size diff gate
- **Residual:** Medium until RUM (real-user monitoring) lands
- **Owner:** Founder
- **Action:** Set up Vercel Speed Insights alerting OR CrUX field metrics within 4 weeks

### R5 — Pen test never run; unknown vulnerabilities in production

- **Likelihood:** Medium (any internet-exposed app has unknown vulns)
- **Impact:** High (data breach, financial loss, regulatory escalation)
- **Existing mitigations:** Stream K security hardening complete (CSP, HSTS, rate limits, CSRF); Dependabot for dep vulns; npm audit in CI; ESLint security rules; CSP violation reporting; admin login backoff
- **Residual:** Medium until pen test completed
- **Owner:** Founder
- **Action:** Book pen test in next 2 weeks; remediation per finding

### R6 — Founder unavailable during P0 incident (solo on-call)

- **Likelihood:** Medium (single point of failure; happens whenever founder sleeps, travels, or is sick)
- **Impact:** High (no human to triage; degrades to Low if Sentry kill switches + auto-revert workflow handle it)
- **Existing mitigations:** Auto-revert workflow on main CI failure; kill switches at `/admin/automation/kill-switch`; feature flags; Sentry alerts; LOOP_PAUSE sentinel; runbooks for self-service recovery
- **Residual:** Medium
- **Owner:** Founder
- **Action:** Maintain a **secondary contact list** (legal + Stripe support + Supabase support); document in `docs/runbooks/manual-ops-during-ai-pause.md`; consider a contracted on-call relationship before launch

### R7 — Privacy Policy / Terms of Service / cookie consent gaps at launch

- **Likelihood:** High (currently unverified)
- **Impact:** High (Privacy Act violation, GDPR-equivalent fine, OAIC complaint)
- **Existing mitigations:** `lib/compliance.ts` SSOT for compliance copy; `app/api/account/export-data` and deletion request flows; OAIC notification template
- **Residual:** High until verified + legal-reviewed
- **Owner:** Founder
- **Action:** Verify Privacy Policy + ToS pages live + AFSL number visible + cookie consent banner deployed before launch

### R8 — Vendor outage cascades (Stripe / Resend / Supabase / Vercel down)

- **Likelihood:** Low (each vendor has SOC 2 + 99.9%+ SLA)
- **Impact:** High while down (no signups, no payments, no email)
- **Existing mitigations:** Stripe webhook idempotency; Resend has retry queue; Supabase has PITR; Vercel auto-rollback; runbooks per vendor recovery (Q-stream items pending)
- **Residual:** Medium until Q-03/04/05/06/07 recovery runbooks complete
- **Owner:** Founder + audit-remediation loop
- **Action:** Complete Q-03..Q-07 in next 4 weeks

### R9 — Service-role client (`lib/supabase/admin.ts`) misused in public route

- **Likelihood:** Low (Stream C complete; ESLint rule enforces)
- **Impact:** High (RLS bypass on PII)
- **Existing mitigations:** ESLint `no-restricted-imports` rule for `lib/**/*.ts`; CLAUDE.md allowed-scope list; quarterly grep audit
- **Residual:** Low
- **Owner:** Founder
- **Action:** None — control is enforced

### R10 — Test coverage gap allows regression in money-handling code

- **Likelihood:** Medium (~14% API-route line coverage; D-11 marked "complete" but tests are shallow per-route happy-path)
- **Impact:** High (financial errors, user trust)
- **Existing mitigations:** Stream R coverage backfill; vitest config thresholds; T-TESTS-03 backfill plan in issue #441
- **Residual:** Medium until R-COVERAGE M2 (80% on money/legal libs) lands
- **Owner:** Audit-remediation loop
- **Action:** R-COVERAGE M2 target in 6–10 weeks

### R11 — Loop runaway burn (e.g., another LH-style spiral)

- **Likelihood:** Low (was Medium before today's interventions)
- **Impact:** Medium (token spend; could be ~$5–10k/month overage)
- **Existing mitigations:** Daily loop-spend tracker (`.github/workflows/loop-spend-tracker.yml`); LOOP_PAUSE sentinel mechanism; Phase 2 stuck-detection guards; 4-cron config (down from 8); auto-prune of stale worktrees
- **Residual:** Low
- **Owner:** Founder
- **Action:** Verify spend tracker fires correctly tomorrow; verify log-rotation fires Sunday

### R12 — SOC 2 readiness slips beyond 6 months, blocking enterprise pipeline

- **Likelihood:** Medium (depends on founder action items + Q-SOC2-* completion + auditor selection)
- **Impact:** Medium (delayed enterprise revenue, no blocker for consumer launch)
- **Existing mitigations:** Q-SOC2-* policy items in queue; foundation policies drafted (Q-SOC2-02/03/04/10); TSC coverage matrix shows path
- **Residual:** Medium
- **Owner:** Founder
- **Action:** Pick SOC 2 vendor in next 2 weeks (Q-SOC2-01)

### R13 — Stream H (1000+ LOC file splits) introduces regression

- **Likelihood:** Low (Stream H not started; gated on test coverage first)
- **Impact:** Medium (silent UX or behaviour regression)
- **Existing mitigations:** Stream H runs **after** Stream D + R route/lib coverage backfill; tests must pass on the big file before split begins
- **Residual:** Low
- **Owner:** Audit-remediation loop
- **Action:** Don't start Stream H until R coverage targets met

### R14 — Foreign-investment + multi-vertical content goes stale

- **Likelihood:** Medium (programmatic SEO at scale = many surfaces × high update frequency)
- **Impact:** Low–Medium (SEO loss, factual incorrectness, AFSL exposure if financial advice content)
- **Existing mitigations:** `<DatedStatBadge>` CI lint enforces stale-data flagging; V-NEW-01 dated-stat staleness gate; quarterly content review (manual)
- **Residual:** Medium
- **Owner:** Founder + content stream owner
- **Action:** Define content review cadence per vertical; automate where possible

### R15 — Solo-founder bus factor

- **Likelihood:** Low (annual basis)
- **Impact:** High (company continuity)
- **Existing mitigations:** All knowledge in repo (`CLAUDE.md`, `COMPANY.md`, `ARCHITECTURE.md`, runbooks, FIN_NOTEBOOK.md); recovery runbooks for Stripe / Resend / Vercel access loss; Supabase managed
- **Residual:** Medium
- **Owner:** Founder
- **Action:** Document a **succession plan** with named contacts (legal, technical, financial) — store outside the repo (e.g., founder's password manager + family member); verify accessible

## Summary

| Residual rating | Count |
|---|---|
| High | 1 (R7 — Privacy Policy / ToS / cookie consent) |
| Medium | 8 |
| Low | 6 |
| **Total tracked** | **15** |

The single High-residual risk (R7) is launch-blocking and must close before launch.

Eight Medium-residual risks have named mitigations in flight. Six Low-residual risks are stable; reviewed annually.

## How this connects

- New risks discovered → added here AND to `docs/audits/REMEDIATION_QUEUE.md` if engineering work is needed
- Risks closed → moved to a "Closed" section at the bottom (preserves audit trail)
- Annual review = re-score every risk + add new ones from past 12 months of incidents/audits

## References

- `docs/audits/codebase-health-2026-04-24.md` — original audit
- `docs/audits/2026-04-26-comprehensive-audit.md` — enterprise audit
- `docs/audits/REMEDIATION_QUEUE.md` — engineering follow-through
- `docs/runbooks/breach-notification.md` — if R1, R5, R7 materialise
- `docs/compliance/incident-response-policy.md` — incident handling
