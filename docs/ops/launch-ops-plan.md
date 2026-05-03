# Launch-Ops plan

Companion to `docs/runbooks/launch-day.md` (timeline) and `docs/runbooks/launch-rollback.md` (kill it). This document covers the **steady-state repair system** that runs through the launch window: intake, detection, triage, hotfix, comms.

Scope: launch week and the four weeks after. After that, fold the parts that earned their keep into the regular ops rhythm.

---

## 1. Inventory snapshot

Already in the repo (do not rebuild):

- Health endpoint: `app/api/health/route.ts` (DB ping, cron heartbeat, env check) — used by external uptime monitor per `launch-day.md`.
- Sentry: `instrumentation.ts` + `sentry.{server,edge,client}.config.ts`. Alert rules live in Sentry UI per `launch-day.md` (>1% → Slack, >5% → page).
- Feature flags: `feature_flags` table + `lib/feature-flags.ts` (`isFlagEnabled(name, ctx)`, 30s cache, rollout_pct + allow/denylist).
- Automation kill switches: `automation_kill_switches` table + `/admin/automation/kill-switch` UI + `lib/admin/classifier-config.ts`.
- Operational tables already present: `health_pings`, `cron_run_log`, `api_request_log`, `stripe_webhook_events`, `form_events`, `exit_intent_events`, `admin_login_attempts`, `admin_action_log`, `csp_violations`.
- Stripe webhook with idempotency: `app/api/stripe/webhook/route.ts` + `stripe_webhook_events` (status: processing/done).
- Resend webhook: `app/api/webhooks/resend/route.ts`. Email helper: `lib/resend.ts`.
- Runbooks: `stripe-webhook-stuck`, `resend-rate-limited`, `email-deliverability`, `cron-stuck`, `cron-silence-alert`, `database-rollback`, `breach-notification`, `launch-day`, `launch-rollback`.
- Admin gate: `proxy.ts` (auth + ADMIN_EMAILS allowlist + MFA cookie). 60+ admin pages.
- Merge policy: `docs/audits/MERGE_AUTHORIZATION.md` (Tier A–E).

Missing (this plan adds):

- User-facing bug intake (form, table, API, alert).
- Synthetic checks for the critical user flows (homepage probe ≠ flow probe).
- Severity matrix with response expectations.
- Launch-hotfix PR template + labels.
- Kill-switch gates at each high-risk write site (the table exists, the call sites don't all check it).
- Single launch overview admin page.
- Canned support responses.

---

## 2. Decision matrix

| # | Area | Decision | Rationale | Cost |
|---|---|---|---|---|
| 1 | Bug intake | **Build minimal**: 1 table, 1 POST route, 1 floating button, 1 admin list. No screenshots in v1 (`mailto:` fallback for users who want to attach). | html2canvas adds ~50KB and breaks on cross-origin images. Defer until we see demand. | ~1 day |
| 2 | Bug alerts | **Reuse Resend**, send to `finn@invest.com.au` only. No Slack webhook v1. | Founder is solo at launch; one channel beats two. | trivial |
| 3 | Health checks (infra) | **Reuse** existing `/api/health` + external uptime monitor (BetterStack/UptimeRobot per launch-day.md). | Already built, already covered by runbook. | nil |
| 4 | Health checks (user flows) | **Build one synthetic cron** at 5-min cadence that probes quiz / advisor enquiry / listing enquiry / Stripe webhook receipt with a bot user, writes to `synthetic_check_runs`. | Per-flow cron entries fragment alerting. One cron, one table, one alert rule. Need a `SYNTHETIC_BOT_USER_ID` allowlist so the probe doesn't notify real advisors. | ~1 day |
| 5 | Severity model | **Doc only** — `docs/ops/severity-matrix.md`. Use existing GitHub labels (P0/P1/P2/P3). | The decision is a definition, not a system. | ~1 hr |
| 6 | Hotfix process | **Reuse Tier A** from `MERGE_AUTHORIZATION.md` + add `launch-hotfix` label and a PR template that enforces "one bug, no features, rollback in description". | The merge policy already exists; we're constraining its use during launch. | ~1 hr |
| 7 | Rollback | **Reuse** `launch-rollback.md` (Vercel instant rollback by deployment ID). Reference, don't duplicate. | Already written and tested. | nil |
| 8 | Kill switches | **Reuse** `feature_flags` + `isFlagEnabled()`. **Add** gate calls at six high-risk sites (one PR each). Default-on; flip to off via the existing admin UI. | The table and helper exist. The call sites are inconsistently wired. | 6× tiny PRs |
| 9 | Launch dashboard | **Build one SSR admin page** `/admin/launch` reading from existing tables. `revalidate = 30`. No realtime. | All the data is already in tables; this is purely a SELECT-and-render page. | ~½ day |
| 10 | Canned responses | **Doc only** — `docs/ops/launch-canned-responses.md`. | Templates change with voice; not code. | ~1 hr |
| 11 | Status page | **Skip rebuild** — `launch-day.md` says it's already published and linked from the footer. | Already done. | nil |
| 12 | Slack/SMS escalation | **Defer** until launch+7d. If founder gets paged 0–2 times in week 1, email is enough. | Avoid premature ops infra. | nil |

---

## 3. Severity matrix (extract — full doc in PR #1)

Response expectations are calendar time from detection, not business hours.

| Level | Definition | Response | Examples |
|---|---|---|---|
| **P0** | Site down, payment broken, lead flow dropping data, security/PII incident | Acknowledge ≤ 15 min · Mitigate ≤ 60 min · Public comm if user-facing | Homepage 5xx, Stripe webhook erroring on every event, advisor enquiries failing to insert, leaked secret, RLS bypass |
| **P1** | Major feature broken for many users, no data loss, workaround exists | Acknowledge ≤ 1 hr · Fix ≤ 24 hr | `/best/[slug]` page returning 500 for one category, quiz step 3 broken, sponsored placements not loading, email send failing for one provider |
| **P2** | Minor feature broken, visible but non-blocking | Fix ≤ 1 week | Star ratings render wrong on one card type, ISR stale on one page, broken external link, JSON-LD validation warning |
| **P3** | Cosmetic, edge case, content fix | Backlog | Typo, mobile spacing nit, low-traffic 404 |

Decision rule: if you can't decide between two levels, pick the higher one for the first 90 minutes. Downgrade once the blast radius is known.

---

## 4. Kill-switch inventory

Each row gets one PR (Tier B per `MERGE_AUTHORIZATION.md`). Pattern: at the top of the write handler, `if (!(await isFlagEnabled('<flag>', ctx))) return Response.json({ error: 'temporarily_unavailable' }, { status: 503 })`. Default state: enabled.

| Flag name | Gates | Why it's high-risk | Toggle reason |
|---|---|---|---|
| `advisor_enquiry_intake` | `app/api/advisor/enquiry/*` POST | Lead-flow regression = lost revenue + advisor trust | Notification storm, RLS bug, advisor rate-limit hit |
| `listing_enquiry_intake` | `app/api/listings/*/enquiry` POST | Same as above for listings vertical | Same |
| `stripe_checkout` | Stripe checkout creation route | Payment errors are P0; flag lets us pause new charges without taking site down | Webhook backlog, dispute spike, pricing bug |
| `sponsored_boosting` | `boostFeaturedPartner()` call sites in `lib/sponsorship.ts` consumers | Compliance risk if sponsored content shows incorrectly | Disclosure bug, RLS leak |
| `ai_generation` | All AI write endpoints / background jobs | Runaway cost, hallucinated compliance copy | Cost cap, model regression — see `docs/ops/ai-cost-caps.md` |
| `email_drip_send` | Drip campaign sender (cron) | Mass-send incident is hard to recall | Bounce >5%, suppression list issue, content bug |

Verify each flag exists in the `feature_flags` table seed (or seed it in the migration). Audit trail: `admin_action_log` already records flag toggles via the admin UI.

---

## 5. Implementation checklist (ordered, smallest first)

Each item = one PR. Stop and ship between items. Do not bundle.

### Phase A — docs and config (no code risk)

- [ ] **PR 1** · `docs/ops/severity-matrix.md` — full version of section 3 above with operational examples drawn from existing runbooks. Tier A.
- [ ] **PR 2** · `docs/ops/launch-canned-responses.md` — three templates: bug-report ack, outage notice, fixed-now. Tier A.
- [ ] **PR 3** · `.github/PULL_REQUEST_TEMPLATE/launch-hotfix.md` + label set (`launch-hotfix`, `P0`, `P1`, `P2`, `P3`) + a one-paragraph addition to `CONTRIBUTING.md` linking the template. Tier A.

### Phase B — bug intake (the largest net-new piece, still small)

- [ ] **PR 4** · Migration `supabase/migrations/<date>_bug_reports.sql`: one table (`id`, `created_at`, `page_url`, `route`, `user_message`, `email`, `user_agent`, `viewport`, `user_id` nullable, `severity_guess`, `status` enum `new|triaged|fixed|wont_fix`, `triaged_by`, `triaged_at`). RLS: deny-all anon SELECT, INSERT via service role only (route uses `lib/supabase/admin.ts`). Tier C (new schema).
- [ ] **PR 5** · `app/api/bug-report/route.ts` POST + Zod schema via `withValidatedBody`. On insert, send a Resend email to `finn@invest.com.au` with the row contents. Rate-limit by IP via `lib/rate-limit.ts` (5/min). Tier B.
- [ ] **PR 6** · `components/ReportProblemButton.tsx` (floating bottom-right, single icon, opens a modal). Capture `window.location.href`, `navigator.userAgent`, viewport, current route. Email field optional. Mount in root layout behind a `report_button` feature flag (default on). Tier B.
- [ ] **PR 7** · `app/admin/bug-reports/page.tsx` — paginated list, filter by status, mark triaged/fixed inline. Reuses existing admin auth via `proxy.ts`. Tier B.

### Phase C — kill-switch wiring (six tiny PRs, parallelisable)

Each PR is < 20 lines: one `isFlagEnabled` check + one early return + one test. Seed the flag in the migration if missing.

- [ ] **PR 8** · `advisor_enquiry_intake` gate.
- [ ] **PR 9** · `listing_enquiry_intake` gate.
- [ ] **PR 10** · `stripe_checkout` gate.
- [ ] **PR 11** · `sponsored_boosting` gate.
- [ ] **PR 12** · `ai_generation` gate (verify against `docs/ops/ai-cost-caps.md` first; this flag may already exist).
- [ ] **PR 13** · `email_drip_send` gate (cron-side check at the top of the drip sender).

### Phase D — observability you don't have yet

- [ ] **PR 14** · Migration: `synthetic_check_runs` table (`flow`, `started_at`, `latency_ms`, `ok`, `error`). RLS service-role only. Tier C.
- [ ] **PR 15** · `app/api/cron/synthetic-checks/route.ts` running every 5 min via `vercel.json`. Probes: homepage 200, sitemap.xml parses, robots.txt 200, quiz POST with bot user, advisor enquiry POST with bot user (gated by `SYNTHETIC_BOT_USER_ID`), listing enquiry POST with bot user, `/api/health` returns ok, last `stripe_webhook_events` row < 30 min old, last successful `email_log` (or Resend webhook event) < 1 hr old. Alert: 2 consecutive failures of any check → email founder. Wraps body via `requireCronAuth`. Tier C.
- [ ] **PR 16** · Sentry alert rule additions (config-as-code if available, otherwise documented in `docs/ops/sentry-alerts.md`): rule per high-risk endpoint group (`/api/advisor/*`, `/api/stripe/*`, `/api/listings/*/enquiry`). Tier A if doc-only.

### Phase E — the dashboard

- [ ] **PR 17** · `app/admin/launch/page.tsx`. Server component, `revalidate = 30`. Eight tiles in a grid, each one count + sparkline (or just count v1):
  - Quiz completions today (`form_events` where `event = 'quiz_complete'`)
  - Lead submissions today (`form_events` where `event = 'lead_submit'`)
  - Listing enquiries today
  - Advisor enquiries today
  - Failed API calls last hour (`api_request_log` where status >= 500)
  - Failed emails last hour (Resend webhook deliveries with bounced/complained)
  - Latest deploy (Vercel API or `process.env.VERCEL_GIT_COMMIT_SHA` + commit time)
  - Open bug reports (count from PR 4 table where status = 'new')
  - Open synthetic-check failures (latest row per flow where ok = false)
  Add to the admin nav. Tier B.

### Phase F — close-out (post-launch, week 2+)

- [ ] **PR 18** · Retro doc capturing what fired, what didn't, which flags were flipped, which canned responses were used. Tier A.
- [ ] **PR 19** · Decide whether to keep the synthetic cron as a permanent fixture or scale it down. Defer until 4 weeks of data exist.

---

## 6. Operating rhythm during launch week

- **Every morning (founder, 15 min):** open `/admin/launch`, scan Sentry, scan bug-reports queue, triage P-levels, update status page if anything changed.
- **Anytime a P0/P1 fires:** follow the matching runbook in `docs/runbooks/`. Hotfix PR uses the launch-hotfix template. If the runbook doesn't exist, write a stub before you fix the issue (so the next person has it).
- **End of week:** update this plan with the canned responses that actually got used, runbooks that needed editing, and false-positive alerts to tune.

---

## 7. What this plan deliberately does NOT include

- A status page rebuild (already done per `launch-day.md`).
- A second incident-tracking system (GitHub Issues + the `bug_reports` table is enough; don't introduce PagerDuty / Linear / Statuspage workflows mid-launch).
- A Slack escalation pipeline (defer to launch+7d if email volume justifies it).
- Auto-rollback on alert. Humans decide rollback during launch — see `launch-rollback.md`.
- Customer-facing changelog. The status page covers public comms.

If any of these become necessary mid-launch, that's a signal to extend the plan, not to improvise.

---

## 8. Cross-references

- Timeline: `docs/runbooks/launch-day.md`
- Rollback: `docs/runbooks/launch-rollback.md`
- Specific incident playbooks: `docs/runbooks/{stripe-webhook-stuck,resend-rate-limited,email-deliverability,cron-stuck,cron-silence-alert,breach-notification,database-rollback}.md`
- Merge policy: `docs/audits/MERGE_AUTHORIZATION.md`
- AI cost caps: `docs/ops/ai-cost-caps.md`
- Architecture (auth, RLS, request lifecycle): `ARCHITECTURE.md`
- Compliance constraints: `COMPANY.md`
