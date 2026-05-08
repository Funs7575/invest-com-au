# G-04 partial-failure-marker verification — results

Verification run: 2026-05-08 via Supabase MCP `execute_sql` against project
`guggzyqceattncjwvgyc` (eu-west-1, ACTIVE_HEALTHY). Methodology and
expected-vs-actual rules per `docs/audits/g-04-partial-failure-markers.md`.

All eight migrations from the G-04 list have now been verified. **Six are
clean. Two have real findings that need forward-fix-up migrations and
explicit founder authorisation (Tier C — schema migration).**

## Summary table

| # | Migration | Result | Action |
|---|---|---|---|
| 1 | `20260316_email_otps.sql` | ✅ clean — table + both indexes present | none |
| 2 | `20260426_wave_launch_readiness.sql` | 🔴 **20 best-for slugs missing in live** | forward-fix needed |
| 3 | `20260512_agent_infrastructure.sql` | ✅ clean — all 19 tables, RLS, policies, triggers, function present | none |
| 4 | `20260310_fix_advisor_photos.sql` | 🟡 17/167 advisors missing `photo_url` — but all 17 were inserted *after* the migration date (post-2026-04-13). Migration applied correctly; later seeds did not set photo_url. | optional one-shot UPDATE |
| 5 | `20260310_admin_login_attempts.sql` | ✅ clean — table, index, RLS=true | none |
| 6 | `20260411_features_11_12_14_15_16_18.sql` | 🔴 **entire migration never applied** — 7 tables missing, all column ALTERs missing | forward-fix needed |
| 7 | `20260522_rls_cosmetic_cleanup.sql` | ✅ effectively clean — `dynamic_pricing_rules` has `service_role full access` (different name, same intent); `Public can read threads` is gone from `forum_threads` | none |
| 8 | `20260513_fix_public_read_leaks.sql` | ✅ clean — `bd_pipeline` + `competitor_watch` no longer have public-read policies; RLS=true on both; service-role policy on competitor_watch present | none |

## Finding #2 (M2) — `best_for_scenarios` 20 slugs missing

Live `best_for_scenarios` has 30 rows (display_order 10–300, all the
"original" set). The migration's 20-row INSERT for display_order 310–500
never landed.

**Customer-visible impact:** every `/best/<slug>` page for these 20
scenarios returns 404 (or empty rankings, depending on the page's
fallback). The page templates are compiled and shipped; the data row is
just not there.

Slugs missing in live:

```
fractional-shares · copy-trading · margin-lending · family-accounts ·
international-shares-beyond-us · demo-account · asx-small-caps ·
high-frequency-api · ipo-investing · tax-reporting · corporate-accounts ·
sustainable-super · share-trading-seniors · term-deposits ·
high-interest-savings · share-trading-nz · cheapest-etf-portfolio ·
joint-accounts · after-hours-trading · crypto-staking
```

**Recovery:** the original migration's INSERT block uses `ON CONFLICT
(slug) DO UPDATE SET …` so re-running it is fully idempotent. The
proposed forward-fix migration is a verbatim copy of lines 224–415 of
`supabase/migrations/20260426_wave_launch_readiness.sql` (just the 20-row
INSERT — no other DDL, no forum/newsletter blocks since those are clean).

**Status: APPLIED 2026-05-08** via Supabase MCP after founder authorisation. The original migration's `'{"key": true}'` JSONB-object syntax for `required_attrs` was the cause of the original miss — live's `required_attrs` column is `TEXT[]`, not `JSONB`. The forward-fix translates each value to `ARRAY['key']::text[]`. Repo migration file: `supabase/migrations/20260714_g04_m2_best_for_scenarios_repair.sql`. Verified post-apply: `best_for_scenarios` now has 50 rows; all 20 new slugs present.

## Finding #6 (M6) — `20260411_features_11_12_14_15_16_18.sql` entire migration unapplied

This is the more consequential finding. None of the migration's seven
new tables exist in live, and none of its column ALTERs have been
applied:

**Tables missing:** `user_saved_comparisons`, `user_shortlisted_brokers`,
`price_drop_notifications`, `qa_votes`, `api_keys`, `api_request_log`,
`regulatory_broker_impacts`.

**Column ALTERs missing on existing tables:**
`fee_alert_subscriptions.{price_threshold,last_notified_at,notification_count}`,
`broker_questions.vote_count`, `broker_answers.{vote_count,helpful_count}`,
`user_reviews.{is_verified_client,verified_via,verified_client_at}`,
`professional_reviews.{is_verified_client,lead_id,verified_client_at}`,
`regulatory_alerts.{affected_broker_slugs,affected_platform_types,change_category,user_action_required,compliance_deadline,views_count}`.

**Production code affected** (grep'd 2026-05-08): 11 paths reference these
missing tables or columns —

```
app/api/admin/regulatory-impacts/route.ts          (regulatory_broker_impacts)
app/alerts/[slug]/page.tsx                         (regulatory_alerts new cols)
app/api/cron/price-drop-alerts/route.ts            (price_drop_notifications)
app/api/questions/[id]/vote/route.ts               (qa_votes)
app/api/cron/abandoned-shortlist-drip/route.ts     (user_shortlisted_brokers)
app/api/answers/[id]/vote/route.ts                 (qa_votes)
app/api/saved-comparisons/route.ts                 (user_saved_comparisons)
app/api/sync-shortlist/route.ts                    (user_shortlisted_brokers)
app/api/saved-comparisons/[id]/route.ts            (user_saved_comparisons)
app/api/v1/api-keys/route.ts                       (api_keys, api_request_log)
lib/api-auth.ts                                    (api_keys)
```

These routes will throw on first call against live (PostgREST 4xx
"relation does not exist"). Whether they're actively called depends on
whether the corresponding UI is reachable; the cron jobs will silently
fail. Sentry should be reporting these as PostgrestError 500s — worth a
spot-check before fixing to confirm pre-fix state.

**Recovery:** the original migration's blocks are all idempotent
(`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX
IF NOT EXISTS`). The proposed forward-fix migration is the verbatim
content of `supabase/migrations/20260411_features_11_12_14_15_16_18.sql`
applied as a new file `<date>_g04_features_11_18_repair.sql`.

**Status: APPLIED 2026-05-08** via Supabase MCP after founder authorisation. All 7 tables created, all column ALTERs landed; 11 prod code paths unblocked. Expect Sentry's "relation does not exist" error rate on those endpoints to drop to zero. Repo migration file: `supabase/migrations/20260715_g04_m6_features_11_18_repair.sql`.

## Finding #4 (M4) — minor, optional

17 of 167 advisors have `NULL photo_url`. All 17 IDs (234–250) were
inserted on or after 2026-04-13 — *after* the 2026-03-10 migration.
The migration ran correctly; later seed scripts did not populate
`photo_url`. Not a partial-failure: the application is responsible for
setting `photo_url` at insert time.

**Recovery (optional):** one-shot UPDATE to backfill ui-avatars URLs for
the 17 rows. Cosmetic; no security or correctness impact.

```sql
UPDATE public.professionals
SET photo_url = 'https://ui-avatars.com/api/?name=' || REPLACE(name, ' ', '+')
              || '&background=7c3aed&color=fff&size=200&bold=true'
WHERE photo_url IS NULL;
```

## Findings closed

Migrations 1, 3, 5, 7, 8 are fully verified clean. They can be removed
from `LAUNCH_GATE_9_5.md` and `g-04-partial-failure-markers.md` as
"verified 2026-05-08 — no action needed".
