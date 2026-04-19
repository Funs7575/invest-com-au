/**
 * Cron dispatcher groups.
 *
 * Vercel's per-project cron limit is 40. We have 62 individual handlers, so
 * vercel.json triggers a dispatcher route (/api/cron/_dispatch/[group]) once
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
  "hourly-0": ["/api/cron/auto-resolve-disputes", "/api/cron/cron-health-alert"],
  "hourly-5": ["/api/cron/broker-snapshot"],
  "hourly-15": ["/api/cron/automation-verdict-rollup"],
  "hourly-20": ["/api/cron/cron-freshness"],
  "hourly-30": ["/api/cron/embeddings-refresh"],

  "every-5m": ["/api/cron/heartbeat", "/api/cron/job-queue-worker"],
  "every-10m": ["/api/cron/confirm-lead-notify"],
  "every-15m": ["/api/cron/retry-webhooks", "/api/cron/slo-monitor"],
  "every-6h": ["/api/admin/run-migration"],

  "daily-0": ["/api/cron/auto-publish"],
  "daily-1": ["/api/cron/cleanup"],
  "daily-1-30": ["/api/cron/warehouse-rollup"],
  "daily-2": [
    "/api/cron/lead-quality-weights",
    "/api/cron/low-balance-alerts",
    "/api/cron/refresh-revenue-view",
    "/api/cron/gdpr-retention-purge",
  ],
  "daily-3": [
    "/api/cron/referral-payouts",
    "/api/cron/data-integrity-audit",
    "/api/cron/observability-retention",
  ],
  "daily-4": [
    "/api/cron/email-bounce-sweep",
    "/api/cron/marketplace-stats",
    "/api/cron/verify-review-clients",
    "/api/cron/ab-auto-promote",
    "/api/cron/revenue-reconciliation",
    "/api/cron/broker-review-invites",
  ],
  "daily-5": [
    "/api/cron/expire-deals",
    "/api/cron/advisor-quality",
    "/api/cron/review-sentiment-refresh",
    "/api/cron/versus-editorial-backfill",
  ],
  "daily-6": ["/api/cron/check-fees", "/api/cron/tmd-audit"],
  "daily-7": [
    "/api/cron/portfolio-alerts",
    "/api/cron/price-drop-alerts",
  ],
  "daily-8": ["/api/cron/complaints-sla"],
  "daily-9": [
    "/api/cron/investor-drip",
    "/api/cron/advisor-nudge",
    "/api/cron/subscription-dunning",
  ],
  "daily-9-30": ["/api/cron/enforce-lead-sla"],
  "daily-10": [
    "/api/cron/advisor-profile-gate-drip",
    "/api/cron/welcome-drip",
    "/api/cron/advisor-onboarding",
    "/api/cron/abandoned-quiz-drip",
  ],
  "daily-11": [
    "/api/cron/advisor-dunning",
    "/api/cron/post-enquiry-drip",
  ],
  "daily-12": ["/api/cron/abandoned-form-drip"],
  "daily-15": ["/api/cron/web-vitals-rollup"],
  "daily-16": ["/api/cron/attribution-rollup"],
  "daily-23": ["/api/cron/quiz-follow-up"],

  "weekly-sun-0": ["/api/cron/rotate-featured-advisors"],
  "weekly-mon-3": [
    "/api/cron/afsl-expiry-monitor",
    "/api/cron/content-staleness",
  ],
  "weekly-mon-7": ["/api/cron/check-affiliate-links"],
  "weekly-mon-8": [
    "/api/cron/weekly-newsletter",
    "/api/cron/weekly-rate-update",
    "/api/cron/personalized-digest",
  ],
  "weekly-mon-9": ["/api/cron/fee-digest", "/api/cron/content-freshness"],
  "weekly-mon-11": ["/api/cron/advisor-dormant-nudge"],

  "monthly-1-3": ["/api/cron/property-suburb-refresh"],
  "monthly-1-6": ["/api/cron/monthly-affiliate-report"],
  "monthly-1-8": ["/api/cron/portfolio-monitor"],
  "monthly-1-9": [
    "/api/cron/monthly-advisor-reports",
    "/api/cron/annual-review-reminder",
  ],
  "monthly-1-10": ["/api/cron/winback-drip"],
  "monthly-2-3": ["/api/cron/month-end-close"],
};
