# Launch readiness — master checklist

**Single page that answers "are we ready to launch yet?"** Reviewed at every launch-go decision. Each line is either green (done, with proof linked) or red (action owner + ETA).

The launch is gated on **every section being green**. If a section flips red between checks, launch is paused until it's resolved.

Companion docs (don't duplicate — link):
- Per-incident runbooks: `docs/runbooks/`
- Launch-day timeline: `docs/runbooks/launch-day.md`
- Launch-rollback procedure: `docs/runbooks/launch-rollback.md`
- Steady-state ops plan: `docs/ops/launch-ops-plan.md`
- Severity matrix: `docs/ops/severity-matrix.md`
- Notification guide: `docs/ops/notification-guide.md`
- Architecture: `ARCHITECTURE.md`
- Per-surface enterprise rubric: `docs/audits/ENTERPRISE_STANDARD.md`
- Audit remediation queue: `docs/audits/REMEDIATION_QUEUE.md`

---

## 1. Engineering foundation

The bottom-floor table-stakes items. Most are done; the remaining ~15% is in the audit-remediation loop's queue.

- [ ] **RLS on every user-data table.** Reference: Stream B done (`docs/audits/REMEDIATION_QUEUE.md` In-flight table). Stream A backfill ~85%; finishes in ~1 week of loop work.
- [ ] **No `service-role` outside allowed scope.** Reference: Stream C complete (CLAUDE.md "Two Supabase clients" allowed-scope list). ESLint rule `no-restricted-imports` enforces this on `lib/*`.
- [ ] **Migrations forward-only + idempotent + rollback header.** Reference: Stream G batches 1–5 done; G-03 batches 6–10 still pending (~6 batches loop work).
- [ ] **API request bodies Zod-validated.** Reference: Stream E batches 1–3 done; ~2 batches remain.
- [ ] **No `console.*` in app code.** Reference: Stream F-05 done (PR #294, #301). ESLint rule enforces.
- [ ] **`lib/*` SSOT consolidations.** Reference: Stream F (formatDate, formatCurrency, slugify, console→logger, compliance copy) done; F-07/F-08 pending.
- [ ] **Test coverage:** ~70.94% lines, 79% branches/functions. R-COVERAGE stream targets: 80% on money/legal libs, 70% on user-data/money API routes. Pending.
- [ ] **CI gates active:** RLS migration gate, types-drift gate, route-test floor, Zod-validation lint, dated-stat enforcement. All shipped in Stream I.
- [ ] **No `any` / strict TS / `noUncheckedIndexedAccess`.** Reference: `tsconfig.json` (already strict). Pre-push runs `tsc --noEmit`.

## 2. Operational readiness

- [ ] **Health endpoint** at `app/api/health/route.ts`. Used by external uptime monitor.
- [ ] **External uptime monitor** configured. (Owner: founder. Confirm UptimeRobot / similar is pointed at health endpoint and pages on-call.)
- [ ] **Sentry integration** active in `instrumentation.ts` + `sentry.{server,edge,client}.config.ts`. Alert rules in Sentry UI: >1% error rate → Slack, >5% → page.
- [ ] **Feature flags** table + `lib/feature-flags.ts` (`isFlagEnabled(name, ctx)`). Rollout-pct + allow/denylist supported.
- [ ] **Automation kill switches** at `/admin/automation/kill-switch` (table `automation_kill_switches`). 18+ cron jobs each have a kill flag.
- [ ] **Cron heartbeat logging** to `cron_run_log`. Stale-cron check surfaced via health endpoint.
- [ ] **Stripe webhook idempotency** via `stripe_webhook_events` (status: processing/done) + V-NEW-03 replay test.
- [ ] **Resend webhook + email deliverability** runbook in place. SPF/DKIM/DMARC records — confirm all three published.
- [ ] **Severity matrix** posted at `docs/ops/severity-matrix.md`. P0–P3 thresholds clear; ack/resolve targets agreed.
- [ ] **Runbooks present** for: Stripe webhook stuck, Resend rate-limited, email deliverability, cron stuck, cron silence alert, database rollback, breach notification, launch-day, launch-rollback, manual-ops-during-AI-pause.
- [ ] **Founder rotation / on-call**: solo founder = always on-call. PagerDuty (or equivalent) configured to phone for P0 (>5% error rate).

## 3. Security hardening

- [ ] **MFA on admin routes** via cookie + `ADMIN_MFA_COOKIE_SECRET` env var (V-NEW-07b). Reference: `proxy.ts` middleware.
- [ ] **CSP** with nonce, no `unsafe-inline` (Stream K-04 done). `proxy.ts` stamps the nonce.
- [ ] **HSTS preload** active. Reference: `next.config.ts` headers.
- [ ] **Rate limiting** on every auth + write API route (`lib/rate-limit.ts`). Audited by `npm run audit:rate-limits` (pre-push hook).
- [ ] **Bot/scraper protection**: widget CORS defense in K-01.
- [ ] **OTP / password challenge** on sensitive ops (B-09 listings, admin login backoff K-03).
- [ ] **AI prompt-injection defense** (CC-stream rubric requires factual-filter + system-prompt isolation; V-NEW-02 enforces filter).
- [ ] **No secrets in git history.** Confirmed by `npm run audit:secrets-no-git-leak` (lint-staged blocks commits with `.env` patterns).
- [ ] **Dependabot** active for npm + GitHub Actions. Vitest / coverage-v8 grouped (per `.github/dependabot.yml`).
- [ ] **Penetration test** completed on staging. **Outstanding** — not yet scheduled.
- [ ] **Vulnerability scan** on prod build (Snyk or equivalent). **Outstanding**.

## 4. Compliance — AFSL / ASIC / Privacy Act / AUSTRAC

- [ ] **AFSL disclosure copy** on every advisor-related surface. Reference: `lib/compliance.ts` SSOT (Stream F-06 done).
- [ ] **General-advice warning** on every quiz / matching / calculator surface. Reference: `<DatedStatBadge>` + V-NEW-01 enforcement.
- [ ] **AFSL number visible** in footer + on AI-generated outputs (V-NEW-02 factual-filter).
- [ ] **Privacy Policy** published, version-stamped, GDPR-equivalent rights enumerated.
- [ ] **Terms of Service** published, version-stamped.
- [ ] **Cookie consent** banner active. (Owner: founder + legal review.)
- [ ] **Data export request flow** at `app/api/account/export-data/` (Stream D-stream tested).
- [ ] **Data deletion request flow** at `app/api/account/deletion-request/`. Audit trail in `account_deletion_requests` table.
- [ ] **Breach notification procedure** in `docs/runbooks/breach-notification.md`. OAIC notification template ready.
- [ ] **AUSTRAC obligations**: confirm what Threshold Transaction Reports / SMRs apply (likely none for matching-only, but check if escrow / direct-payment features land).
- [ ] **Legal sign-off** on launch comms (homepage, advisor pitch, email templates). **Outstanding** — schedule with lawyer.

## 5. SOC 2 prep — Stream Q

This is the **long pole** for enterprise sales. Currently 0% started.

- [ ] **Type II readiness assessment** with auditor (Vanta / Drata / similar). 6–12 month observation window.
- [ ] **Trust Services Criteria coverage**: Security (CC), Availability (A), Processing Integrity (PI), Confidentiality (C), Privacy (P).
- [ ] **Access control policy** documented + enforced. RBAC, MFA on admin, audit logs (`admin_action_log` already exists).
- [ ] **Change management policy**: PR review, CI gates, merge authorization tiers (`docs/audits/MERGE_AUTHORIZATION.md`). Mostly already in place.
- [ ] **Vulnerability management**: Dependabot, Snyk, quarterly review cadence.
- [ ] **Backup + recovery procedures**: Supabase point-in-time-recovery, restore drill quarterly. **Owner: founder, scheduled?**
- [ ] **Incident response procedures**: runbooks + post-mortem template + RCA storage.
- [ ] **Vendor management**: Stripe, Resend, Supabase, Sentry, Vercel, Anthropic — all SOC 2 Type II themselves. Document the trust chain.
- [ ] **Risk assessment** documented annually.
- [ ] **Penetration test** annual (overlap with section 3).

Tracking: open queue items in Stream Q (currently empty — to be seeded).

## 6. Performance + scale

- [ ] **Lighthouse CWV** advisory gate active (PR #420). Field metrics from real-user data planned but not in place.
- [ ] **Vercel Speed Insights** active (per-route p75 LCP / CLS / TBT).
- [ ] **Bundle size delta** check on PR (existing `bundle-size.yml` workflow).
- [ ] **CDN / edge caching** strategy verified — ISR `revalidate` on content pages, `Cache-Control` on API responses where appropriate.
- [ ] **Database query plan review** for top 10 hottest queries. Indexes in place per `supabase/migrations/`.
- [ ] **Soak / load test** — simulate launch-day 10× peak traffic. **Outstanding**.

## 7. Post-launch monitoring (auto-loop owns much of this)

- [ ] **Daily loop spend tracker** active (`.github/workflows/loop-spend-tracker.yml` — landed today).
- [ ] **LOOP_PAUSE sentinel** mechanism in place (`docs/ops/notification-guide.md` — landed today).
- [ ] **Weekly iteration-log rotation** active (`.github/workflows/rotate-iteration-log.yml` — landed today).
- [ ] **Worktree auto-prune** every 6h (`.github/workflows/cleanup-stale-worktrees.yml` — landed today).
- [ ] **Auto-merge label classifier** with deletion + LOC guards (landed today).
- [ ] **Stuck-detection** in Phase 2 of `/audit-remediation-iteration` (landed today).
- [ ] **Founder-only [ACTION REQUIRED] notification stream**: configured per `docs/ops/notification-guide.md`.

---

## How to use this checklist

1. Print or open it before any launch-go decision.
2. Walk every line. If it's not green, the fix-it-or-defer call is the founder's.
3. Sections **1, 2, 3, 4** are launch-blockers. Sections **5, 6, 7** are launch-week-following or already-active.
4. After launch, this same checklist is the steady-state quality gate. Re-walk monthly during the launch quarter.

## What needs founder action right now

- **Pen test booking** (security)
- **SOC 2 readiness vendor** decision (Vanta / Drata / similar)
- **Legal review** of launch copy + Privacy Policy + ToS
- **Soak test** schedule
- **`I-NEW-06`** — set Supabase GH Actions secrets so weekly snapshot populates from live data
- **`L-01`** — set `SENTRY_AUTH_TOKEN` for source-map upload

Everything else is in the loop's queue.
