# Cron-health sweep — 2026-06-05

## 🚨 HEADLINE: the entire cron fleet has been dark for ~13 days

**No scheduled job has run since 2026-05-23 23:05 UTC** (now: 2026-06-05 21:24).
Ground truth from the live `cron_run_log`:

| Metric | Value |
|---|---|
| Last cron run (any job) | **2026-05-23 23:05:47 UTC** |
| Runs in the last 7 days | **0** |
| Runs after 2026-05-23 23:10 | **0** |
| Vercel crons defined in `vercel.json` | **40** |

All 40 scheduled jobs stopped firing on the same day. This is a fleet-wide
outage, not a per-job failure.

## Root cause (near-certain): the Vercel account is blocked

Crons are **Vercel Cron** jobs (`vercel.json` → `/api/cron/dispatch/*` fan-out;
CLAUDE.md: "Vercel cron routes live under `app/api/cron/*`"). There is **no
Supabase pg_cron fallback**. Vercel executes the schedules — and the Vercel
account is **blocked** (the `Vercel — Account is blocked` commit status that has
shown red on every recent PR, linking to
`vercel.com/knowledge/why-is-my-account-deployment-blocked`). A blocked account
runs no crons, which exactly matches the fleet-wide stop.

**This is an infra/billing action, not a code fix:** the account must be
unblocked (founder/billing) before any scheduled job runs again.

## Impact of ~13 days with no crons

Everything time-driven has been silently off. A non-exhaustive read of the 40
schedules:

- **Revenue / finance:** `revenue-reconciliation`, `affiliate-payout-recon`,
  `monthly-affiliate-report`, `month-end-close`, `referral-payouts`,
  `subscription-dunning`, `advisor-dunning`.
- **Lead / SLA:** `enforce-lead-sla`, `lead-sla-check`, `lead-followup-reminders`,
  `confirm-lead-notify`, `auction-close`, `marketplace-stale-briefs`.
- **Lifecycle email (engagement/revenue):** every `*-drip`, `welcome-drip`,
  `winback-drip`, `abandoned-*-drip`, `investor-drip`, all digests/newsletters.
- **Data freshness:** `broker-snapshot`, `check-fees`, `fee-index`,
  `refresh-savings-rates`, `refresh-loan-rates`, `invest-score`,
  `property-suburb-refresh`.
- **Compliance / safety:** `gdpr-retention-purge`, `hard-delete-expired`,
  `redact-deleted-users`, `account-deletion-reminder`, `afsl-expiry-monitor`,
  `complaints-sla`.
- **Monitoring:** `heartbeat`, `slo-monitor`, `synthetic-checks`,
  `cron-health-alert`, `web-vitals-rollup`.

## Why nothing alerted (watchdog blind spot)

The freshness watchdogs — `heartbeat`, `cron-health-alert`, `cron-freshness`,
`slo-monitor`, `synthetic-checks` — are **themselves Vercel crons**. When Vercel
stopped, they stopped too, so the system that would page on a stale fleet went
dark in the same instant. **A watchdog that runs on the thing it watches cannot
report that thing being down.**

## Compounding: 5 crons will still fail once Vercel is restored

Even after unblocking, these query relations that don't exist in prod (see
`docs/audits/SCHEMA-DRIFT-2026-06-05.md`) and will error on first run:

| Cron | Phantom table(s) | Severity |
|---|---|---|
| `ipo-alerts` | `ipo_offers`, `ipo_watchlist`, `ipo_alert_sends` | fully broken (all its tables) |
| `refresh-loan-rates` | `investment_loan_rates` | fully broken (its only table) |
| `rate-alerts` | `investment_loan_rates` | partial |
| `personalized-digest` | `digest_sends` | partial |
| `revenue-reconciliation` | `stripe_payouts` | partial |

## Recommendations

1. **Unblock the Vercel account** (founder/billing) — restores all 40 schedules.
   Until then the background fleet is fully offline.
2. **Add a Vercel-independent watchdog.** A Supabase **pg_cron** job (runs in the
   DB, not on Vercel) that checks `max(started_at)` in `cron_run_log` and alerts
   if it's older than ~2h would have caught this on day one. This is the single
   highest-value prevention — it removes the watchdog blind spot. (Build is
   founder-gated: needs pg_cron enabled + an alert sink.)
3. **Create the 5 phantom tables / gate those crons** before re-enabling, so the
   first post-restore run doesn't error.
4. Consider a `cron_run_log` retention note: it still holds the pre-outage
   history, which is what made this diagnosable.

## Method
Live `cron_run_log` aggregates (counts/timestamps only) + `vercel.json` schedule
parse + cross-ref of each `app/api/cron/*` route's `.from()` targets against the
live schema. No code changed — this is a diagnosis + escalation.

---

## Update 2026-06-11 — fleet STILL dark (19 days); external watchdog shipped

Verified live: `cron_run_log` has **zero rows in the last 48 h across all job
names**; newest run of any cron remains 2026-05-23 06:0x (`check-fees` ok). So
the Netlify cron bridge merged in #1430 (`netlify/functions/cron-tick.mts`,
safe-by-default) has **not been enabled** — the fleet has now been dark 19
days, taking with it drips, alerts, digests, webhook retries, leaderboards,
and the fee-recheck pipeline behind /compare's freshness claims
(DISC-20260610-C is a symptom of this, not a check-fees bug).

**Restoration (founder/ops, ~2 minutes):** in the Netlify site env set
`CRON_BRIDGE_ENABLED=true` and confirm `CRON_SECRET` is set (the bridge sends
it as the Bearer to `/api/cron/dispatch/<group>`). The bridge only fires jobs
due at the current tick — no 19-day backfill flood. Retire when Vercel Cron
is unparked.

**Prevention shipped (this PR):** the recommendation-2 watchdog now exists
without waiting for pg_cron — `GET /api/health/crons` exposes only the newest
run age (service-role read of `cron_run_log`; no job names/stats), and
`.github/workflows/cron-watchdog.yml` probes it from GitHub's scheduler twice
daily, failing red (→ owner email) at >26 h. The watchdog lives OUTSIDE the
platform precisely because every in-platform monitor is itself a cron.
