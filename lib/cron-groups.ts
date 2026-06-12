/**
 * Cron dispatcher groups.
 *
 * Vercel's per-project cron limit is 40. We have 62 individual handlers, so
 * vercel.json triggers a dispatcher route (/api/cron/dispatch/[group]) once
 * per unique cron schedule, and the dispatcher fans out to every handler that
 * shares that schedule.
 *
 * Each group key maps directly to a cron schedule via vercel.json:
 *   - hourly-N        : minute N of every hour (e.g. hourly-0 = "0 * * * *")
 *   - daily-H         : every day at hour H (e.g. daily-4 = "0 4 * * *")
 *   - daily-H-M       : every day at H:M (e.g. daily-9-30 = "30 9 * * *")
 *   - weekly-<day>-H  : every week on <day> at hour H
 *   - monthly-D-H     : every month on day D at hour H
 *   - every-Nm        : every N minutes (step form in the minute field)
 *   - every-Nh        : every N hours (step form in the hour field)
 *
 * The handler paths below are called internally via fetch() so each handler
 * keeps its own runtime directive (edge/nodejs), maxDuration, and existing
 * CRON_SECRET auth check — no refactoring required. To revert to direct
 * per-handler cron entries, copy the arrays below back into vercel.json.
 */
export const CRON_GROUPS: Record<string, readonly string[]> = {
  "hourly-0": ["/api/cron/auto-resolve-disputes", "/api/cron/cron-health-alert", "/api/cron/hub-silence-check", "/api/cron/booking-reminders"],
  "hourly-5": ["/api/cron/broker-snapshot"],
  "hourly-15": ["/api/cron/automation-verdict-rollup", "/api/cron/quote-expiry-reminders", "/api/cron/brief-sla-sweep", "/api/cron/lead-sequence-engine"],
  "hourly-20": ["/api/cron/cron-freshness"],
  "hourly-30": ["/api/cron/embeddings-refresh", "/api/cron/slo-monitor"],

  "every-15m": [
    "/api/cron/job-queue-worker",
    "/api/cron/synthetic-checks",
    "/api/cron/confirm-lead-notify",
    "/api/cron/lead-sla-check",
    "/api/cron/editorial-auto-publish",
    "/api/cron/geocode-listings",
    "/api/cron/standing-orders-sweep",
  ],
  "every-30m": ["/api/cron/heartbeat", "/api/cron/retry-webhooks", "/api/cron/retry-outbound-webhooks", "/api/cron/retry-consumer-webhooks", "/api/cron/auction-close"],
  // every-6h removed: its only member, /api/admin/run-migration, is now
  // admin-session-only (audit §5 #12) and runs on demand, not on a schedule.

  "daily-0": ["/api/cron/auto-publish"],
  "daily-1": [
    "/api/cron/cleanup",
    "/api/cron/sponsored-placement-apply",
    "/api/cron/sponsored-renewal-reminder",
  ],
  "daily-1-30": ["/api/cron/warehouse-rollup"],
  "daily-2": [
    "/api/cron/lead-quality-weights",
    "/api/cron/low-balance-alerts",
    "/api/cron/refresh-revenue-view",
    "/api/cron/gdpr-retention-purge",
    "/api/cron/data-export-monitor",
    "/api/cron/process-data-exports",
    "/api/cron/account-deletion-reminder",
    "/api/cron/redact-deleted-users",
    "/api/cron/hard-delete-expired",
  ],
  "daily-3": [
    "/api/cron/referral-payouts",
    "/api/cron/data-integrity-audit",
    "/api/cron/observability-retention",
    "/api/cron/prune-rate-history",
    "/api/cron/advisor-credit-expiry",
    "/api/cron/advisor-auto-topup",
    "/api/cron/annual-mot",
    "/api/cron/recompute-trust-scores",
    "/api/cron/feature-flag-expiry",
  ],
  "daily-4": [
    "/api/cron/email-bounce-sweep",
    "/api/cron/marketplace-stats",
    "/api/cron/verify-review-clients",
    "/api/cron/ab-auto-promote",
    "/api/cron/revenue-reconciliation",
    "/api/cron/broker-review-invites",
    "/api/cron/quote-review-requests",
  ],
  "daily-5": [
    "/api/cron/expire-deals",
    "/api/cron/advisor-quality",
    "/api/cron/review-sentiment-refresh",
    "/api/cron/versus-editorial-backfill",
  ],
  "daily-6": ["/api/cron/check-fees", "/api/cron/tmd-audit", "/api/cron/refresh-loan-rates", "/api/cron/refresh-savings-rates", "/api/cron/snapshot-health-scores", "/api/cron/invest-score", "/api/cron/fee-index"],
  "daily-7": [
    "/api/cron/portfolio-alerts",
    "/api/cron/price-drop-alerts",
    "/api/cron/rate-alerts",
    "/api/cron/rate-change-digest",
    "/api/cron/comeback-rate-email",
    "/api/cron/td-maturity-reminders",
    "/api/cron/ipo-alerts",
    "/api/cron/advisor-welcome-sequence",
  ],
  "daily-8": [
    "/api/cron/complaints-sla",
    "/api/cron/dated-stats-check",
    "/api/cron/abandoned-shortlist-drip",
    "/api/cron/streak-at-risk",
    "/api/cron/market-event-reminders",
    "/api/cron/award-badges",
    "/api/cron/refresh-leaderboard",
  ],
  "daily-9": [
    "/api/cron/investor-drip",
    "/api/cron/advisor-nudge",
    "/api/cron/subscription-dunning",
    "/api/cron/marketplace-stale-briefs",
    "/api/cron/lead-followup-reminders",
    "/api/cron/office-hours-reminders",
    "/api/cron/challenge-daily-nudge",
  ],
  "daily-9-30": ["/api/cron/enforce-lead-sla"],

  "daily-10-30": [
    "/api/cron/marketplace-outcome-flywheel",
    "/api/cron/engagement-checkins",
  ],
  "daily-10": [
    "/api/cron/advisor-profile-gate-drip",
    "/api/cron/welcome-drip",
    "/api/cron/advisor-onboarding",
    "/api/cron/abandoned-quiz-drip",
    "/api/cron/hub-subscriber-drip",
  ],
  "daily-11": [
    "/api/cron/advisor-dunning",
    "/api/cron/post-enquiry-drip",
    "/api/cron/switching-review-reminders",
  ],
  "daily-12": ["/api/cron/abandoned-form-drip", "/api/cron/exit-intent-nurture"],
  "daily-15": ["/api/cron/web-vitals-rollup"],
  "daily-16": ["/api/cron/attribution-rollup"],
  "daily-21": [
    "/api/cron/personalized-morning-brief",
    "/api/cron/seasonal-emails",
  ],
  "daily-23": [
    "/api/cron/quiz-follow-up",
    "/api/cron/plan-resume-digest",
    "/api/cron/saved-search-alerts",
    "/api/cron/pro-digest",
    "/api/cron/tax-nurture",
  ],

  "weekly-fri-7": [
    "/api/cron/decisions-digest",
  ],
  "weekly-sun-0": ["/api/cron/rotate-featured-advisors", "/api/cron/intent-cohort-rollup"],
  "weekly-mon-3": [
    "/api/cron/afsl-expiry-monitor",
    "/api/cron/content-staleness",
  ],
  "weekly-mon-7": ["/api/cron/check-affiliate-links"],
  "weekly-mon-8": [
    "/api/cron/weekly-newsletter",
    "/api/cron/weekly-rate-update",
    "/api/cron/personalized-digest",
    "/api/cron/firm-performance-digest",
    "/api/cron/premium-digest",
    "/api/cron/demand-alerts-digest",
  ],
  "weekly-mon-9": ["/api/cron/fee-digest", "/api/cron/content-freshness", "/api/cron/stale-fee-editorial", "/api/cron/check-secret-rotation", "/api/cron/country-rule-alerts-digest", "/api/cron/watchlist-alerts", "/api/cron/life-event-wizard-nudge", "/api/cron/advisor-match-scores", "/api/cron/cpd-reminder"],
  "weekly-mon-11": ["/api/cron/advisor-dormant-nudge", "/api/cron/advisor-winback"],

  "monthly-1-3": ["/api/cron/property-suburb-refresh", "/api/cron/reset-api-monthly-usage"],
  "monthly-1-6": ["/api/cron/monthly-affiliate-report", "/api/cron/affiliate-payout-recon", "/api/cron/cpd-year-renewal"],
  "monthly-1-8": ["/api/cron/portfolio-monitor"],
  "monthly-1-9": [
    "/api/cron/monthly-advisor-reports",
    "/api/cron/annual-review-reminder",
    "/api/cron/review-social-loop",
    "/api/cron/monthly-review-invites",
  ],
  "monthly-1-10": ["/api/cron/winback-drip"],
  "monthly-2-3": ["/api/cron/month-end-close"],
  "monthly-15-9": ["/api/cron/user-health-score-email"],
  "quarterly-1-3": ["/api/cron/quarterly-anonymity-audit"],
};
