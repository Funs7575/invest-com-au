# Schema-drift probe — code references vs live DB (2026-06-05)

Bot-driven API & schema-drift sweep. Method: extract every `.from("<table>")`
literal in `app/` + `lib/` (406 distinct), diff against the live project's
`information_schema.tables` (the actual relations). **31 relations are referenced
in code but do not exist in production.** This is the systemic version of the
`versus_votes` bug (found by the AI-journey run) — code shipped against tables
that were never created or never applied.

> NB: the repo's `npm run audit:unapplied-migrations` compares migration files
> against the `schema_migrations` *ledger*, so it lists migrations whose tables
> already exist (ledger drift). This probe compares against the **actual tables**,
> so it catches the relations that genuinely 500 at runtime.

## Class B — migration EXISTS but table is ABSENT in prod (unapplied)

These two migration files are committed but their tables aren't in the live DB.
Root cause (confirmed 2026-06-07): the auto-apply workflow `supabase-migrate.yml`
has **never executed a single apply**. Its `SUPABASE_PROJECT_REF` and
`SUPABASE_DB_PASSWORD` secrets were never configured (only `SUPABASE_ACCESS_TOKEN`
was), so the secret-precheck green-skipped every run — the job reported success
while applying nothing. Every migration that *is* in prod got there via a manual /
out-of-band apply; these two simply never were. (The workflow now fails loudly on
missing secrets so this can't recur — see docs/runbooks/MIGRATION_DEPLOY_BACKLOG.md.)
The features are dead in prod.

| Migration file | Tables missing in prod | Feature broken |
|---|---|---|
| `20260729_sp02_startup_portal_schema.sql` | `startup_profiles`, `startup_rounds`, `startup_sessions`, `startup_data_room_files`, `startup_data_room_access`, `startup_investor_inquiries`, `esic_verifications`, `wholesale_investor_certifications` | Startup portal (`/admin/startups`, `/invest/startups/*`), wholesale-cert (`/account/wholesale-cert`, `/api/wholesale-investor-cert/*`) |
| `20260520_dd03_session_booking_payments.sql` | `booking_payments` | Session-booking Stripe handler (`lib/stripe-webhook/handlers/checkout-session-completed.ts`) |

**Fix:** re-apply these migrations to prod (manual `workflow_dispatch` of
Supabase migrate, or diagnose why they error). **Needs founder awareness** — it's
a multi-table prod schema change; confirm the migrations apply cleanly against
current prod before triggering. NOT auto-applied here.

## Class A — NO migration anywhere (code references a table that was never defined)

The `versus_votes` class. ~21 relations. Highest-impact confirmed first:

| Table | Referenced by | Reachable | Impact |
|---|---|---|---|
| `weights` | `app/api/wealth-stack/route.ts` | anon POST | **wealth-stack ("Revenue #1") POST 500s on every build** — the route reads `from("weights").select("broker_slug, weights")`; prod has `quiz_weights` (flat cols), not `weights` (jsonb). Needs product call: create+seed `weights`, or repoint to `quiz_weights`. |
| `broker_campaigns` | `app/api/admin/revenue-summary/route.ts`, `app/admin/revenue` | admin | revenue dashboard — **regression fixed in this PR** (route no longer 500s on it; shows 0 campaigns). Still needs the table created or repointed to `campaigns`. |
| `investment_loan_rates` | `/api/admin/loan-rates`, `/api/cron/refresh-loan-rates`, `/api/cron/rate-alerts`, `/pro/insights` | admin + cron | loan-rate refresh + alerts cron likely erroring |
| `ipo_offers`, `ipo_watchlist`, `ipo_alert_sends` | `/api/ipo-offers`, `/api/cron/ipo-alerts`, `/invest/ipo-calendar` | anon + cron | IPO calendar + alerts |
| `course_enrollments` | `/api/courses/enroll`, `/api/courses/[slug]/complete`, `/my-learning`, `/academy/[slug]` | user | course enrolment flow |
| `referrals` | `/api/referrals` | user | referral feature |
| `user_profiles` | `app/account/dashboard/page.tsx` | user | dashboard (prod table is `profiles` — likely wrong name) |
| `pro_subscribers` | `app/admin/analytics/AdminAnalyticsClient.tsx` | admin | analytics widget |
| `professional_views` | `/api/advisor-auth/firm/analytics` | advisor | firm analytics |
| `sponsorship_orders` | (grep) | — | triage |
| `stripe_payouts` | (grep) | — | triage |
| `digest_sends`, `push_send_log` | (grep) | cron | triage |
| `incentive_reviews` | (grep) | — | triage |
| `advisor_cohort_metrics`, `advisor_search_alerts` | (grep) | — | triage |
| `api_consumer_webhooks`, `api_key_subscriptions`, `consumer_webhook_deliveries` | (grep) | — | API/webhook feature — triage |

(`public` from the diff is a false positive — `.from("public")`-style parse, not a table.)

## Fixed in this PR
- `/api/admin/revenue-summary` made resilient to the missing `broker_campaigns`
  relation (was a #1410 regression: one missing optional table 500'd the whole
  admin revenue dashboard). Now logs + shows 0 active campaigns.

## Recommended sequencing
1. **Class B re-apply** (founder-gated) — unblocks 9 tables / 3 features at once via 2 existing migrations.
2. **`weights` / wealth-stack** — product call (create+seed vs repoint to `quiz_weights`); it's the named revenue feature and 500s today.
3. **Cron-backed Class A** (`investment_loan_rates`, `ipo_*`, `*_sends`) — these silently fail on schedule; create tables or gate the crons.
4. **Prevention:** add a CI gate that diffs `.from()` literals against committed migrations' `CREATE TABLE`s (extends the existing types-drift gate to cover *all* `.from()` targets, not just typed tables), so code can't reference an undefined relation again.
