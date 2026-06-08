# Runbook: Deploy the migration backlog + clear "Supabase types drift"

> ## 🛑 SUPERSEDED — DO NOT FOLLOW (2026-06-07)
>
> This runbook's core action — `supabase db push` to apply "118 pending
> migrations" — is **dangerous and based on a model that is no longer true**.
> Measured 2026-06-07: only **5 of 250** local migration versions are tracked in
> the prod ledger, so `db push` would attempt **~245** migrations — re-creating
> existing tables and **re-running ~35 non-idempotent data backfills**, plus the
> CSF/Tier-E startup-portal migration. The schema content is already ~98% in
> prod; the real problem is a **forked migration ledger** caused by the
> `supabase-migrate.yml` workflow silently no-op'ing for months (its secrets were
> unset — see PR #1463).
>
> **Use instead:**
> - **State:** `docs/audits/DB-STATE-2026-06-07.md`
> - **Fix:** `docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md` (baseline-squash)
>
> The historical content below is retained for the per-migration notes and the
> compliance-hold record only.

---

**Status:** ⚠️ SUPERSEDED — historical reference only. The original "prep only"
status and the `db push` procedure below must not be executed.
**Prepared:** 2026-05-26. **Project ref:** `guggzyqceattncjwvgyc` (invest-com-au, eu-west-1).

## Why this exists

`lib/database.types.ts` is generated from the live schema. Recent rounds added
schema (full-text `search_vec`, `consumer_webhook_deliveries`, certificate
`holder_display_name`, `team_members.advisor_slug`, the v1 API billing/webhook
tables, `rate_alert_subscriptions` v2 columns, push prefs, etc.) but the types
were never regenerated, so the **"Supabase types drift" CI check is red** and
will stay red on every PR until the schema is deployed and the types refreshed.

A read-only check (`mcp list_migrations`) shows the live DB is **118 migrations
behind `main`** — everything dated after `20260525231409`. This is **not** just
the recent feature work; it spans many streams. Do not apply it ad-hoc, one
`apply_migration` at a time — use the deploy pipeline below.

Composition of the 118:
- **35 data-backfill migrations** (`a02/a03/a04_backfill_*`) — these **move/transform
  production data** and are the hardest to reverse. **Snapshot prod first.**
- **20 RLS migrations** (`*_rls`, `c02_*`, `o05_*`, `a05/a06_*`) — security policy
  changes; verify app auth still works after.
- Feature/seed/repair migrations across the marketplace, advisor, content, and
  API surfaces.

## Root cause of the backlog (confirmed 2026-06-07)

The backlog is not just "we forgot to deploy" — the auto-deploy was never wired
up. `.github/workflows/supabase-migrate.yml` is meant to `supabase db push` on
every push to `main`, but its `SUPABASE_PROJECT_REF` and `SUPABASE_DB_PASSWORD`
secrets were never set (only `SUPABASE_ACCESS_TOKEN` was), so its secret-precheck
**green-skipped every run since the workflow landed** — it has never applied a
single migration, while reporting success the whole time. That false-green is why
drift accumulated unseen and why migrations only ever reached prod via manual
`apply_migration` / direct SQL (e.g. the `drift_backfill_*` batch hand-applied on
2026-06-04). The workflow now **fails loudly** when the secrets are missing, so the
gap is visible.

**Do not simply add the two secrets to "fix" it.** The first `db push
--include-all` would replay this entire backlog at once — including the `#97` CSF
compliance-hold migration below and ~35 hard-to-reverse data-backfills. Drain the
backlog via the pipeline here first (snapshot → dry-run → resolve the compliance
hold → push → regen types); only once the live ledger is at parity should the
secrets be added to enable auto-apply for the steady state (where `--include-all`
only ever has 0–1 pending migration).

## ⚠️ Compliance hold — review BEFORE deploy

One migration in the backlog touches an **avoid-list** area (see
`docs/strategy/REGULATORY-AVOID-LIST.md`):

| # | Migration | Concern | Action |
|---|-----------|---------|--------|
| 97 | `20260729_sp02_startup_portal_schema.sql` | **Startup Portal = equity crowdfunding / CSF** intermediary territory — needs a CSF licence; **never-autonomous (Tier E)**. | **Founder + legal sign-off required** before this is deployed/enabled. The schema alone (empty tables + RLS) does not expose the feature — the routes/UI gate it — but per the avoid-list, deploying it is still a sign-off step. |

`supabase db push` applies **all** pending migrations in version order, and this
one sits in the middle (#97/118). To deploy the rest while holding it, either:
- **(a)** get explicit founder+legal OK to include the schema-only migration
  (no CSF routes/UI are enabled by it), or
- **(b)** temporarily move `20260729_sp02_startup_portal_schema.sql` out of
  `supabase/migrations/`, deploy the rest, and handle it separately once signed off.

Three other files matched the compliance keyword scan but are **false positives**
(no action): `20260705_a06_batch2_broker_marketplace_rls.sql` &
`20260802010000_broker_health_score_history.sql` (`client_money_score` is a broker
*rating dimension*, not us holding client money), and `20260802000000_seed_forum_threads.sql`
("custody" appears in a Bitcoin-ETF *forum seed post*).

## Procedure (deploy pipeline — recommended)

```bash
# 0. SNAPSHOT prod first (Dashboard → Database → Backups, or pg_dump).
#    35 of these migrations backfill data and are not cleanly reversible.

supabase link --project-ref guggzyqceattncjwvgyc

# 1. Preview what will run — confirm it's the expected 118.
supabase db push --dry-run

# 2. Resolve the compliance hold (see table above) BEFORE continuing.

# 3. STRONGLY PREFERRED: apply to a preview branch first, verify, then promote.
supabase branches create deploy-backlog-verify   # ephemeral copy
#   …point a staging build at the branch, smoke-test search/cert/webhook/billing…

# 4. Apply to production (all pending, in order):
supabase db push

# 5. Regenerate types and commit — this is what clears the drift check:
supabase gen types typescript --linked > lib/database.types.ts
#   (or: supabase gen types typescript --project-id guggzyqceattncjwvgyc > lib/database.types.ts)
git checkout -b chore/regen-db-types
git add lib/database.types.ts
git commit -m "chore(db): regenerate database.types.ts after migration backlog deploy"
#   open a PR; "Supabase types drift" should now pass.
```

## What lights up once deployed

These were merged with graceful fallbacks (they don't crash today — search
returns `[]`, etc.), and become functional once their migrations apply:

| Migration (#) | Feature that activates |
|---------------|------------------------|
| `20260825090000_search_vectors` (118) | Real full-text site search (`/search`, ⌘K) ranking |
| `20260825070000_certificate_holder_display_name` (116) | Certificate holder name on `/certificate/[number]` |
| `20260825080000_team_members_advisor_slug` (117) | Team-member → advisor profile linking |
| `20260825050000_api_consumer_webhooks` + `…060000_consumer_webhook_deliveries` (114-115) | v1 API consumer webhook delivery + log |
| `20260825030000_api_billing_tiers` (112) | v1 API metered billing tiers |
| `20260825020000_rate_alert_subscriptions_v2` (111) | Rate-alert subscriptions (watchlist alerts cron) |
| `20260825040000_push_subscriptions_user_id_and_prefs` (113) | Web-push subscription + preferences |
| `20260825010000_verified_engagement_reviews` (110) | Verified-engagement review badges |
| `20260825000000_api_v1_platform_endpoints` + `20260802_api_v1_advisors_fee_index_endpoints` (108-109) | v1 API platform/advisor/fee-index endpoints |

## Appendix — full ordered backlog (118)

Apply in this order (this is `supabase/migrations/*.sql` with version >
`20260525231409`). `#97` is the compliance hold.

```
1   20260601_rls_email_otps
2   20260601_rls_investment_listings
3   20260601_rls_leads
4   20260601_rls_listing_claims
5   20260601_rls_listing_enquiries
6   20260601_rls_listing_plans
7   20260602_c02_advisor_sessions_backfill
8   20260602_investment_listings_tighten_rls
9   20260602_seed_slo_definitions
10  20260603120000_a02_backfill_user_data_profiles
11  20260603120001_a02_backfill_lead_quiz_leads
12  20260603120002_a02_backfill_user_data_shared_shortlists
13  20260603120003_a02_backfill_lead_lead_pricing
14  20260603120004_a02_backfill_lead_lead_pricing_log
15  20260603120005_a02_backfill_lead_international_leads
16  20260603120006_a02_backfill_lead_lead_disputes
17  20260603120007_a02_backfill_user_data_user_reviews
18  20260603120008_a02_backfill_advisor_applications
19  20260603120010_a02_backfill_advisor_billing
20  20260603120011_a02_backfill_advisor_verification_log
21  20260603120012_a02_backfill_advisor_auth_tokens
22  20260603120013_a02_backfill_advisor_booking_slots
23  20260603120014_a02_backfill_advisor_specialties
24  20260603120015_a02_backfill_advisor_metrics_daily
25  20260603130000_a03_backfill_revenue_affiliate_payout_reports
26  20260603130001_a03_backfill_revenue_affiliate_payout_variance
27  20260603130002_a03_backfill_revenue_sponsored_placement_pricing
28  20260603130003_a03_backfill_revenue_sponsored_placement_bookings
29  20260603130004_a03_backfill_revenue_subscriptions
30  20260603_c02_advisor_auth_rls_hardening
31  20260604140000_a04_backfill_advisor_articles
32  20260604140001_a04_backfill_broker_transfer_guides
33  20260604140002_a04_backfill_content_calendar
34  20260604140003_a04_backfill_content_products
35  20260604_c02_advisor_data_tables_rls
36  20260605_c02_professional_reviews_advisor_select
37  20260606150000_a03_backfill_conversion_events
38  20260606150001_a03_backfill_finance_transactions
39  20260606150002_a03_backfill_credit_packs
40  20260606_c02_lead_disputes_rls
41  20260607130000_a03_batch4_marketplace_accounts
42  20260607160000_a02_backfill_advisor_auth_tokens
43  20260607160001_a02_backfill_advisor_bookings
44  20260607160002_a02_backfill_advisor_booking_slots
45  20260607160003_a02_backfill_advisor_metrics_daily
46  20260607_a02_advisor_family_tables_batch4
47  20260608120000_a02_backfill_advisor_firm_tables
48  20260608120100_a02_disc_article_guidelines_rls
49  20260608130000_a02_batch6_notification_prefs
50  20260608130001_a02_batch6_course_purchases
51  20260608130002_a02_batch6_investor_drip_log
52  20260608130003_a02_batch6_investor_journey_touchpoints
53  20260608140000_a06_batch1_portfolio_family
54  20260608150000_a03_batch3_broker_wallets
55  20260608150000_a03_batch3_marketplace_revenue
56  20260608150001_a03_batch3_wallet_transactions
57  20260608150002_a03_batch3_marketplace_invoices
58  20260608150003_a03_batch3_newsletter_subscriptions
59  20260609120000_a02_backfill_notification_preferences
60  20260609120001_a02_backfill_investor_drip_log
61  20260610120000_a03_batch5_revenue_products
62  20260611100000_a05_batch1_agent_ops_rls_hardening
63  20260702_o05_service_role_policy_clarity
64  20260703120000_a_disc_finance_monthly_summary_view
65  20260703_a05_batch2_ops_tables_rls
66  20260704_a05_batch3_crm_tables_rls
67  20260705_a03_batch6_content_consultation_rls
68  20260705_a06_batch2_broker_marketplace_rls
69  20260706_a06_batch3_fee_content_rls
70  20260707_a03_batch6_consultations_courses_rls
71  20260708_a03_batch7_content_tables_rls
72  20260709_a03_batch8_audit_qa_rls
73  20260710_launch_ops_bug_reports
74  20260711_launch_ops_synthetic_check_runs
75  20260712_fx_providers_non_resident_improvements
76  20260713_a_missing_table_2_data_export_requests_repair
77  20260714_g04_m2_best_for_scenarios_repair
78  20260715_g04_m6_features_11_18_repair
79  20260716_ff01_seed_missing_feature_flags
80  20260716_ww01_user_watchlist_items
81  20260717_ff02_feature_flag_archived_at
82  20260718_ff04_flag_last_evaluated_at
83  20260720_cmp_w1a_user_calculator_state
84  20260721_kk04_link_injection_flag
85  20260722_fund_reviews
86  20260722_ww02_watchlist_alert_preferences
87  20260723_pmp01_provider_marketplace_foundation
88  20260724_gm01_get_matched_router
89  20260725180000_seed_firms_and_firm_members
90  20260725180100_seed_expert_teams
91  20260725200000_add_listing_kind
92  20260725_ux_onboarding_profiles_columns
93  20260726_rr02_professional_review_responses
94  20260727000000_afsl_register_cache
95  20260728_w423_firm_billing_summary
96  20260729_drop_orphan_sharesight_connections
97  20260729_sp02_startup_portal_schema      <-- COMPLIANCE HOLD (CSF) — founder+legal
98  20260730_presence_pings_restrict_anon_read
99  20260731_px01_slack_webhook_url
100 20260731_px05_referral_codes
101 20260731_px07_mot_sent_at
102 20260801000000_principals_table
103 20260801000800_gdpr_soft_delete
104 20260801_availability_status
105 20260801_org_events
106 20260802000000_seed_forum_threads
107 20260802010000_broker_health_score_history
108 20260802_api_v1_advisors_fee_index_endpoints
109 20260825000000_api_v1_platform_endpoints
110 20260825010000_verified_engagement_reviews
111 20260825020000_rate_alert_subscriptions_v2
112 20260825030000_api_billing_tiers
113 20260825040000_push_subscriptions_user_id_and_prefs
114 20260825050000_api_consumer_webhooks
115 20260825060000_consumer_webhook_deliveries
116 20260825070000_certificate_holder_display_name
117 20260825080000_team_members_advisor_slug
118 20260825090000_search_vectors
```
