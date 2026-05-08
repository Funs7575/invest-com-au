# DB schema drift reconciliation list (A-01)

Generated 2026-04-30. Source of truth for Stream A backfill ordering (issue #214).

## Summary

- Tables in types (`Database['public']['Tables']` in `lib/database.types.ts`): **236**
- Tables in migrations (`CREATE TABLE` across `supabase/migrations/*.sql`): **178**
- Common to both (sanity-check): **145**
- **Drifted (in types, not in migrations): 91** — types declare a table the migration history does not create. These are the tables Stream A must backfill (or formally retire from types).
- **Stale (in migrations, not in types): 33** — migration creates the table but it is missing from regenerated types. Most are app-used today, indicating type regeneration has lagged. Fix: regenerate `lib/database.types.ts` after Stream A is done.

The drift count (91) is the headline number: it is the population of tables whose absence in the migration tree means a fresh Supabase environment built only from `supabase/migrations/*.sql` would not match what the app's TypeScript expects. That is the actual remediation surface for Stream A.

## Drift — in types, not in migrations

Classified by ownership. "App refs" is `grep -rE "from\('<table>'\)" app/ lib/` — a quick proxy for whether the app actually reads/writes the table today.

### app — application-owned tables that need a backfill migration

These are the priority items. Each one is a real table the app depends on whose `CREATE TABLE` lives only in production (or in some out-of-tree script) and not in the forward-only migration history.

| Table | App refs | Why it matters | Stream A item |
| --- | ---: | --- | --- |
| `admin_audit_log` | 75 | `app/admin/audit-log/page.tsx`, marketplace admin pages, admin AI chat — append-only audit trail used everywhere admin actions log a row. | A-04 (admin/audit family) |
| `advisor_applications` | 25 | `app/admin/advisors/page.tsx` reads pending advisor signups; `app/api/admin/advisor-applications/route.ts` writes them. Compliance-relevant. | A-03 (advisor family) |
| `advisor_articles` | 42 | `app/sitemap.ts`, `app/advisor/[slug]/page.tsx`, advisor portal — published advisor content. | A-03 (advisor family) |
| `advisor_auth_tokens` | 4 | Advisor magic-link / session bootstrap (`app/api/admin/advisor-applications/route.ts`). | A-03 (advisor family) |
| `advisor_billing` | 18 | `app/admin/advisors/page.tsx` — advisor invoice/credit ledger. | A-03 (advisor family) |
| `advisor_bookings` | 5 | `app/admin/advisor-performance/page.tsx` — booking reservations. | A-03 (advisor family) |
| `advisor_booking_slots` | 1 | `app/api/advisor-booking/route.ts` — bookable calendar slots. | A-03 (advisor family) |
| `advisor_metrics_daily` | 0 | Type-only today; FK target referenced from other tables. Verify whether prod has rows; if so, backfill, else retire. | A-03 (advisor family) |
| `advisor_sessions` | 25 | `app/advisor-portal/health/page.tsx` and many advisor-auth call sites — login session table. | A-03 (advisor family) |
| `advisor_specialties` | 0 | Type-only; advisor specialty lookup. Likely retired in favour of a column on `professionals`/advisor profile. Verify before backfilling. | A-03 (advisor family) — verify retirement |
| `advisor_verification_log` | 8 | `app/admin/advisors/page.tsx` — KYC/AFSL verification trail. Compliance-relevant. | A-03 (advisor family) |
| `affiliate_payout_reports` | 1 | `app/api/cron/affiliate-payout-recon/route.ts` — affiliate revenue reconciliation. | A-05 (affiliate / finance) |
| `affiliate_payout_variance` | 2 | Same cron — variance between expected and reported affiliate payouts. | A-05 (affiliate / finance) |
| `allocation_decisions` | 4 | `app/admin/marketplace/decisions/page.tsx` — lead allocation outcomes. | A-06 (marketplace) |
| `article_moderation_log` | 0 | Type-only; appears superseded by `advisor_article_moderation_log` (which IS in migrations). Almost certainly **retired**. | A-99 (retire from types) |
| `au_postcodes` | 2 | Postcode lookup used by `app/api/admin/advisor-applications/route.ts`. Reference data. | A-07 (reference data) |
| `bd_pipeline` | 4 | `app/api/admin/bd-pipeline/route.ts` — internal sales pipeline. | A-08 (CRM / BD) |
| `broker_accounts` | 58 | `app/admin/marketplace/*` heavy use — broker self-service accounts (separate from `brokers` directory listing). Marketplace-critical. | A-06 (marketplace) |
| `broker_activity_log` | 2 | `app/admin/marketplace/intelligence/page.tsx` — broker action log. | A-06 (marketplace) |
| `broker_answers` | 5 | `app/admin/questions/page.tsx` — broker Q&A answers. | A-06 (marketplace) |
| `broker_data_changes` | 16 | `app/admin/automation/broker-changes/page.tsx` — change-detection queue from feed parsers. | A-06 (marketplace) |
| `broker_health_scores` | 5 | `app/admin/health-scores/page.tsx` — broker quality score over time. | A-06 (marketplace) |
| `broker_outreach_log` | 2 | `app/admin/broker-outreach/page.tsx` — sales outreach log. | A-08 (CRM / BD) |
| `broker_packages` | 5 | `app/admin/marketplace/packages/page.tsx` — paid-tier packages purchased by brokers. | A-06 (marketplace) |
| `broker_questions` | 12 | `app/admin/moderation/page.tsx` — broker-submitted questions awaiting answer. | A-06 (marketplace) |
| `broker_review_invites` | 7 | `app/api/broker-review-invite/route.ts` — review-request emails. | A-06 (marketplace) |
| `broker_review_stats` | 2 | `app/broker/[slug]/page.tsx` — aggregated review counts. Possible materialized view. | A-06 (marketplace) — verify view vs table |
| `broker_transfer_guides` | 9 | `app/sitemap.ts`, `app/transfer/[slug]/page.tsx` — content tables for "switch from X to Y" pages. | A-09 (content tables) |
| `broker_wallets` | 24 | `app/admin/marketplace/page.tsx` — broker prepaid balance ledger. Money-handling. | A-06 (marketplace) |
| `campaigns` | 49 | Marketplace ad campaigns — admin pages, broker portal, marketplace funnel. | A-06 (marketplace) |
| `campaign_daily_stats` | 13 | Daily roll-up for campaigns. | A-06 (marketplace) |
| `campaign_events` | 14 | Per-event log feeding campaign stats. | A-06 (marketplace) |
| `campaign_templates` | 4 | `app/broker-portal/campaigns/[id]/edit/page.tsx` — template starter for campaigns. | A-06 (marketplace) |
| `competitor_watch` | 3 | `app/api/admin/competitors/route.ts` — competitor monitoring records. | A-08 (CRM / BD) |
| `consultations` | 8 | `app/admin/consultations/page.tsx` — paid consultation entities. | A-10 (consultations / courses) |
| `consultation_bookings` | 6 | Booking events for consultations. | A-10 (consultations / courses) |
| `content_calendar` | 20 | `app/admin/content-calendar/page.tsx` — editorial calendar. | A-09 (content tables) |
| `content_products` | 0 | Type-only; likely retired or never shipped. Verify. | A-99 (retire from types) |
| `conversion_events` | 7 | `app/api/marketplace/postback/route.ts` — affiliate postback / conversion stream. | A-05 (affiliate / finance) |
| `country_investment_profiles` | 0 | Reader retired in Country Mode Phase 4 (RFC 2026-05-08). Rows for the 12 IntentCountryCode hubs deactivated; table preserved for a possible future admin/CMS surface. | A-09 (content tables) — preserved, no live reads |
| `courses` | 9 | `app/admin/courses/page.tsx` — paid course catalog. | A-10 (consultations / courses) |
| `course_lessons` | 6 | Per-course lesson rows. | A-10 (consultations / courses) |
| `course_progress` | 2 | `app/api/course/progress/route.ts` — user progress through lessons. User-data → RLS required. | A-10 (consultations / courses) |
| `course_purchases` | 8 | `app/api/course/purchase/route.ts` — purchase ledger. User-data + finance → RLS required. | A-10 (consultations / courses) |
| `course_revenue` | 3 | Roll-up for finance reporting. | A-10 (consultations / courses) |
| `credit_packs` | 0 | Referenced by `app/api/advisor-auth/topup/route.ts` (1 hit, not via `from()`). Stripe-priced credit-pack catalog. | A-05 (affiliate / finance) |
| `cron_health_alerts` | 4 | `app/api/cron/cron-health-alert/route.ts` — heartbeat alert ledger. | A-11 (ops / observability) |
| `data_license_subscribers` | 0 | Type-only; potentially scaffolded for unreleased data-licensing product. Verify. | A-99 (retire from types) |
| `featured_plans` | 0 | Type-only; likely superseded by `sponsored_placement_*` (which are also in drift). Verify retirement. | A-99 (retire from types) |
| `fee_auto_rules` | 4 | `app/admin/fee-queue/page.tsx` — automated fee-update rules. | A-09 (content tables) |
| `fee_profiles` | 2 | `app/api/fee-profile/route.ts` — broker fee schedules. | A-09 (content tables) |
| `fee_update_queue` | 12 | `app/admin/page.tsx` — pending fee changes awaiting review. | A-09 (content tables) |
| `finance_transactions` | 6 | `app/admin/finance/page.tsx` — internal finance ledger. | A-05 (affiliate / finance) |
| `foreign_investment_flags` | 0 | Type-only; despite a migration named `20260322_foreign_investment_flags.sql` existing, that migration creates `foreign_investment_dta` instead. Renamed table — types are pre-rename. | A-99 (regenerate types post-A-stream) |
| `foreign_investment_rates` | 3 | `app/api/foreign-investment/rates/route.ts`. Same family as above; verify whether prod table is named `foreign_investment_rates` or was folded into `foreign_investment_dta`. | A-09 (content tables) — verify |
| `international_leads` | 0 | An FK index exists for it (`20260426_add_missing_fk_indexes.sql`) but no `CREATE TABLE`. **Highly suspicious** — index migration assumes a table that the migration tree never creates. | A-02 (lead family) — high priority |
| `investor_drip_log` | 5 | `app/admin/email-performance/page.tsx` — email drip send log. | A-12 (email / lifecycle) |
| `investor_journey_touchpoints` | 0 | Type-only; attribution touchpoint table. Possibly superseded by `attribution_touches` (which is in migrations). | A-99 (retire from types) |
| `lead_disputes` | 26 | `app/admin/automation/disputes/page.tsx`, advisor pages, AI chat — lead dispute resolution. | A-02 (lead family) |
| `lead_pricing` | 5 | `app/admin/pricing/page.tsx` — current per-vertical lead pricing. | A-02 (lead family) |
| `lead_pricing_log` | 4 | History of pricing changes. | A-02 (lead family) |
| `legal_documents` | 4 | `app/admin/legal/page.tsx` — versioned legal text store. Compliance-relevant. | A-09 (content tables) |
| `marketplace_invoices` | 9 | `app/admin/marketplace/reconciliation/page.tsx` — broker billing invoices. Money-handling. | A-06 (marketplace) |
| `marketplace_placements` | 11 | `app/admin/analytics/AdminAnalyticsClient.tsx` — paid placement records. | A-06 (marketplace) |
| `notification_preferences` | 3 | `app/api/cron/personalized-digest/route.ts` — per-user notification settings. User-data → RLS required. | A-12 (email / lifecycle) |
| `portfolio_alerts` | 3 | `app/api/cron/portfolio-alerts/route.ts` — user-configured price/portfolio alerts. User-data → RLS. | A-13 (portfolio) |
| `portfolio_calculations` | 0 | Type-only; possibly cached calc results. Verify if used. | A-13 (portfolio) — verify |
| `portfolio_fee_snapshots` | 1 | `app/api/cron/portfolio-monitor/route.ts` — periodic snapshot of fees applied to a portfolio. | A-13 (portfolio) |
| `portfolio_holdings` | 0 | Type-only; child of `user_portfolios`. Verify whether holdings are stored as JSONB on the portfolio row instead. | A-13 (portfolio) — verify |
| `posthog_events_mirror` | 0 | Referenced only by `scripts/collect-quality-metrics.ts` (no `from()` in `app/`/`lib/`). Type-only mirror table for PostHog data. | A-11 (ops / observability) |
| `pro_deals` | 7 | `app/admin/pro-deals/page.tsx`, `app/pro/deals/ProDealsClient.tsx` — Pro-tier exclusive deals. | A-14 (Pro tier) |
| `pro_deal_redemptions` | 1 | Per-user redemption ledger. User-data → RLS. | A-14 (Pro tier) |
| `profiles` | 13 | `app/api/course/purchase/route.ts`, `app/api/cron/subscription-dunning/route.ts` — user profile mirror table (likely Supabase auth profile pattern). User-data → RLS. | A-02 (lead family / user data) |
| `quiz_leads` | 17 | `app/admin/data-health/page.tsx` — quiz funnel lead capture. User-data → RLS. | A-02 (lead family) |
| `rate_limits` | 5 | `app/api/cron/cleanup/route.ts` — DB-backed rate limiting (`lib/rate-limit.ts`). | A-11 (ops / observability) |
| `regulatory_alerts` | 10 | `app/sitemap.ts`, alert pages — regulatory news / RG-update alerts. | A-09 (content tables) |
| `sentiment_signals` | 0 | Type-only; sentiment-analysis output. Verify if shipped. | A-99 (retire from types) |
| `shared_shortlists` | 7 | `app/admin/analytics/AdminAnalyticsClient.tsx` — user-shared shortlist links. User-data → RLS. | A-02 (lead family / user data) |
| `sponsored_placement_bookings` | 11 | `app/admin/sponsored-queue/page.tsx` — booked sponsorship slots. | A-06 (marketplace) |
| `sponsored_placement_pricing` | 2 | `app/advertise/featured-placement/page.tsx` — sponsorship rate card. | A-06 (marketplace) |
| `subscriptions` | 27 | `app/admin/pro-subscribers/page.tsx`, dunning cron, AI chat — Stripe-backed user subscriptions. User-data + finance → RLS. | A-05 (affiliate / finance) |
| `switch_stories` | 14 | `app/admin/page.tsx` — broker-switch testimonials. | A-09 (content tables) |
| `team_members` | 14 | `app/sitemap.ts`, marketing pages — `/team` content data. | A-09 (content tables) |
| `trading_performance_daily` | 0 | Type-only; daily trading roll-up. Almost certainly retired (no app refs anywhere). | A-99 (retire from types) |
| `trading_positions` | 0 | Type-only; broker-trading product, never shipped. | A-99 (retire from types) |
| `trading_signals` | 0 | Type-only; same family as above. | A-99 (retire from types) |
| `user_portfolios` | 7 | `app/api/cron/portfolio-alerts/route.ts` — user portfolio root row. User-data → RLS. | A-13 (portfolio) |
| `user_reviews` | 26 | `app/admin/page.tsx`, moderation pages, broker pages — user-submitted broker reviews. User-data → RLS. | A-02 (lead family / user data) |
| `wallet_transactions` | 14 | `app/admin/marketplace/*` — ledger entries for `broker_wallets`. Money-handling. | A-06 (marketplace) |
| `webhook_delivery_queue` | 5 | `app/api/cron/retry-webhooks/route.ts` — outbound webhook retry queue. | A-11 (ops / observability) |

### Supabase-internal

(none surfaced — `auth.*`, `storage.*` etc. are not in the public types output here.)

### PostGIS

| Table | Notes |
| --- | --- |
| `spatial_ref_sys` | Created automatically by `CREATE EXTENSION postgis;`. **Do not** write a backfill migration for it — it is owned by the extension. Either filter it out of types regen or accept it as a noisy entry. Action: document in Stream A as "out of scope; comes from extension". |

### retired

Tables that appear in types but have zero `from('<table>')` references in `app/` and `lib/` and look like dead code. The Stream A action for these is **not** a backfill — it is regeneration of `lib/database.types.ts` (and possibly a one-off `DROP TABLE IF EXISTS` migration if prod still carries them). They are listed here separately so Stream A can split "build" from "tear-down" work.

| Table | Reason for retirement guess |
| --- | --- |
| `article_moderation_log` | Superseded by `advisor_article_moderation_log` (in migrations). |
| `content_products` | Never shipped. |
| `data_license_subscribers` | Never shipped. |
| `featured_plans` | Superseded by `sponsored_placement_*`. |
| `foreign_investment_flags` | Renamed to `foreign_investment_dta` per migration `20260322_foreign_investment_flags.sql`. |
| `investor_journey_touchpoints` | Superseded by `attribution_touches`. |
| `sentiment_signals` | Never shipped. |
| `trading_performance_daily` | Trading product never shipped. |
| `trading_positions` | Trading product never shipped. |
| `trading_signals` | Trading product never shipped. |

`portfolio_calculations` and `portfolio_holdings` are borderline — currently zero `from()` refs but plausibly held back behind an unfinished feature. **Verify against the live DB before retiring.**

## Stale — in migrations, not in types

These tables have `CREATE TABLE` migrations but are absent from `Database['public']['Tables']`. The dominant cause is **type regeneration lag** (i.e. the migration shipped after the last `npx supabase gen types typescript` run). The fix is a single types regeneration after Stream A lands; per-table backfill is not required.

| Table | App refs | Created in | Likely cause |
| --- | ---: | --- | --- |
| `advisor_tiers` | 0 | `20260315_revenue_optimization.sql` | Created but never wired up; possibly retired. |
| `affiliate_monthly_reports` | 2 | `20260408_tier1_revenue_features.sql` | Types stale. |
| `ai_token_usage` | 4 | `20260523_ai_token_usage.sql` | Types stale (V-NEW-06 just shipped). |
| `api_keys` | 4 | `20260411_features_11_12_14_15_16_18.sql` | Types stale. |
| `api_request_log` | 1 | `20260411_features_11_12_14_15_16_18.sql` | Types stale. |
| `broker_signups` | 6 | `20260408_tier1_revenue_features.sql` | Types stale. |
| `calculator_config` | 2 | `002_schema_additions.sql` | Old table; types may be filtered or never regenerated. |
| `csp_violations` | 1 | `20260427_csp_violations.sql` | Types stale. |
| `data_export_requests` | 7 | `20260427_wave_security_observability.sql` | Types stale. |
| `drip_affiliate_clicks` | 1 | `20260408_tier1_revenue_features.sql` | Types stale. |
| `email_campaigns` | 0 | `20260315_revenue_optimization.sql` | Created but never wired up; verify retirement. |
| `email_otps` | 4 | `20260316_email_otps.sql` | Types stale. |
| `email_subscribers` | 0 (only admin run-migration step) | `20260315_revenue_optimization.sql` | Created but never wired up; verify retirement. |
| `fi_change_log` | 4 | `20260329_fi_data_tables.sql` | Types stale (FI rebuild). |
| `fi_dasp_rates` | 3 | `20260329_fi_data_tables.sql` | Types stale. |
| `fi_data_categories` | 2 | `20260329_fi_data_tables.sql` | Types stale. |
| `fi_dta_countries` | 3 | `20260329_fi_data_tables.sql` | Types stale. |
| `fi_property_rules` | 1 | `20260329_fi_data_tables.sql` | Types stale. |
| `firm_seat_requests` | 2 | `20260326_firm_roles_and_seat_requests.sql` | Types stale. |
| `fi_tax_brackets` | 4 | `20260329_fi_data_tables.sql` | Types stale. |
| `fi_withholding_rates` | 1 | `20260329_fi_data_tables.sql` | Types stale. |
| `foreign_investment_dta` | 0 | `20260322_foreign_investment_flags.sql` | Likely renamed/replaced by `fi_*` tables in `20260329_fi_data_tables.sql`. Verify retirement. |
| `listing_advisor_opt_ins` | 3 | `20260429_listing_advisor_opt_ins.sql` | Types stale. |
| `price_drop_notifications` | 1 | `20260411_features_11_12_14_15_16_18.sql` | Types stale. |
| `qa_votes` | 6 | `20260411_features_11_12_14_15_16_18.sql` | Types stale. |
| `quiz_questions` | 6 | `002_schema_additions.sql` | Old table; types may be filtered or never regenerated. |
| `quote_qa` | 3 | `20260429_marketplace_v2_extensions.sql` | Types stale. |
| `quote_reviews` | 1 | `20260429_marketplace_v2_extensions.sql` | Types stale. |
| `regulatory_broker_impacts` | 5 | `20260411_features_11_12_14_15_16_18.sql` | Types stale. |
| `site_ab_tests` | 7 | `20260408_tier1_revenue_features.sql` | Types stale. |
| `user_saved_comparisons` | 6 | `20260411_features_11_12_14_15_16_18.sql` | Types stale. |
| `user_shortlisted_brokers` | 6 | `20260411_features_11_12_14_15_16_18.sql` | Types stale. |
| `weekly_rate_drip_log` | 1 | `20260316_add_weekly_rate_drip_log.sql` | Types stale. |

## Stream A item map (suggested grouping)

The DoD calls for ~5 tables per iteration. Suggested groupings, ordered by app-impact:

- **A-02 (user-data + lead family)** — `profiles`, `quiz_leads`, `user_reviews`, `shared_shortlists`, `lead_disputes`, `lead_pricing`, `lead_pricing_log`, `international_leads`. RLS-required. **Highest priority** because user data + cited as "leads_*, lead_*" family in the queue line.
- **A-03 (advisor family)** — `advisor_applications`, `advisor_articles`, `advisor_auth_tokens`, `advisor_billing`, `advisor_bookings`, `advisor_booking_slots`, `advisor_metrics_daily`, `advisor_sessions`, `advisor_verification_log`. (`advisor_specialties` to be verified for retirement.) Matches the queue line "advisor_*".
- **A-04 (admin/audit)** — `admin_audit_log` (single big table, append-only, audit trail).
- **A-05 (affiliate / finance)** — `affiliate_payout_reports`, `affiliate_payout_variance`, `conversion_events`, `credit_packs`, `finance_transactions`, `subscriptions`. Money-handling, RLS where user-owned.
- **A-06 (marketplace)** — `broker_accounts`, `broker_activity_log`, `broker_answers`, `broker_data_changes`, `broker_health_scores`, `broker_packages`, `broker_questions`, `broker_review_invites`, `broker_review_stats` (verify view), `broker_wallets`, `wallet_transactions`, `campaigns`, `campaign_*` (3 sub-tables), `allocation_decisions`, `marketplace_invoices`, `marketplace_placements`, `sponsored_placement_bookings`, `sponsored_placement_pricing`. Largest sub-stream — split across multiple iterations.
- **A-07 (reference data)** — `au_postcodes`.
- **A-08 (CRM / BD)** — `bd_pipeline`, `broker_outreach_log`, `competitor_watch`.
- **A-09 (content tables)** — `broker_transfer_guides`, `content_calendar`, `country_investment_profiles`, `fee_auto_rules`, `fee_profiles`, `fee_update_queue`, `foreign_investment_rates`, `legal_documents`, `regulatory_alerts`, `switch_stories`, `team_members`.
- **A-10 (consultations / courses)** — `consultations`, `consultation_bookings`, `courses`, `course_lessons`, `course_progress`, `course_purchases`, `course_revenue`.
- **A-11 (ops / observability)** — `cron_health_alerts`, `posthog_events_mirror`, `rate_limits`, `webhook_delivery_queue`.
- **A-12 (email / lifecycle)** — `investor_drip_log`, `notification_preferences`.
- **A-13 (portfolio)** — `portfolio_alerts`, `portfolio_calculations` (verify), `portfolio_fee_snapshots`, `portfolio_holdings` (verify), `user_portfolios`.
- **A-14 (Pro tier)** — `pro_deals`, `pro_deal_redemptions`.
- **A-99 (retirement / types regen)** — `article_moderation_log`, `content_products`, `data_license_subscribers`, `featured_plans`, `foreign_investment_flags`, `investor_journey_touchpoints`, `sentiment_signals`, `trading_performance_daily`, `trading_positions`, `trading_signals`. Plus all 33 stale entries (regenerate types). PostGIS `spatial_ref_sys` is out of scope.

This puts the queue's "~8 iterations × ~5 tables" estimate roughly on target: ~80 active app tables to backfill across A-02 through A-14, plus a final retirement/regen iteration.

## Methodology

```bash
# Tables in types — top-level keys under Database['public']['Tables']
awk 'NR>=17 && NR<=11827 && /^      [a-z_][a-z0-9_]*: \{$/ \
       { gsub(/^      /, ""); gsub(/: \{$/, ""); print }' \
   lib/database.types.ts | sort -u > /tmp/types_tables.txt        # 236 entries

# Tables in migrations
grep -hE '^\s*CREATE TABLE (IF NOT EXISTS )?' supabase/migrations/*.sql \
  | sed -E 's/^\s*CREATE TABLE (IF NOT EXISTS )?//; s/^public\.//; s/[ ;(].*$//; s/"//g' \
  | sort -u > /tmp/migration_tables.txt                            # 178 entries

# Symmetric difference
comm -23 /tmp/types_tables.txt /tmp/migration_tables.txt > /tmp/drift.txt   # 91
comm -13 /tmp/types_tables.txt /tmp/migration_tables.txt > /tmp/stale.txt   #  33

# App-usage proxy per table
while read t; do
  n=$(grep -rE "from\('${t}'\)|from\(\"${t}\"\)" app/ lib/ | wc -l)
  echo "$n $t"
done < /tmp/drift.txt
```

The line bounds (17-11827) match the `Tables: {` … next top-level section (`Views: {` at line 11828) in `lib/database.types.ts`. The 6-space indent regex picks up only first-level entries (table names) and excludes the deeper nested `Row`/`Insert`/`Update`/`Relationships` keys.

Caveat: `from()`-grep is a proxy, not ground truth. Tables can also be reached via `.rpc(...)`, raw SQL through `supabase.from('some_view')`, or scripts in `scripts/`. The "0 refs" entries above were spot-checked against `scripts/` and `supabase/`, and the small number of cases where a script does use a "0 refs" table (e.g. `posthog_events_mirror` in `scripts/collect-quality-metrics.ts`) are noted in the per-table rows above.
