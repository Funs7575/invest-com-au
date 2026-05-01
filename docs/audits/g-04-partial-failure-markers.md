# G-04 — Partial-failure-marker migrations needing prod verification

Generated 2026-04-30. Source: `docs/audits/codebase-health-2026-04-24.md` §5.5.

These migrations contain markers indicating partial-success / uncertain state.
Each entry below tells the founder exactly what to query in prod to confirm
the actual applied state, and what to do if it differs.

**Founder action required.** The agent cannot verify prod state — needs
Supabase MCP query access (which is founder-tier).

## What the markers actually are

Audit §5.5 names two distinct flavours of marker:

1. **TODOs / FIXMEs** — explicit `TODO.md` references inside the migration's
   header comment, indicating the migration was authored as remediation for
   an open follow-up item that may or may not have been re-validated
   post-apply.
2. **Missing trailing semicolon on final statement** — the file ends with a
   trailing `--`-comment line rather than a clean SQL statement terminator.
   Most psql / `supabase db push` flows handle this fine; some pipelines
   (raw `\i` includes, certain CI runners that line-buffer) have historically
   silently truncated the last statement. Worth re-verifying these applied
   cleanly in prod, per the audit.

For each migration below, the verification SQL is concrete: run it via
Supabase MCP `execute_sql`, compare the result to the "Expected if fully
applied" column, and pick the recovery action if it doesn't match.

---

## Migration 1: `20260316_email_otps.sql`

**Purpose:** Create `email_otps` table for the find-advisor quiz email-verification flow (6-digit codes, expiry tracking, used-at marker).

**Uncertain operation:** The file's final SQL statement is `CREATE INDEX IF NOT EXISTS idx_email_otps_expires`, followed by a trailing `--` comment line. If the last index creation silently truncated, the table exists but the `expires_at` index is missing — every OTP cleanup query (`WHERE expires_at < NOW()`) would table-scan instead of using the index. Functional but slow at scale.

**Verification SQL:**
```sql
-- Confirm table + both indexes exist
SELECT to_regclass('public.email_otps') AS table_exists;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'email_otps'
ORDER BY indexname;
```

**Expected result if migration fully applied:**
- `table_exists` → `email_otps`
- Indexes: `email_otps_pkey`, `idx_email_otps_email`, `idx_email_otps_expires`

**Expected result if partial:** Table + `email_otps_pkey` + `idx_email_otps_email` exist but `idx_email_otps_expires` is missing.

**Recovery action:** If `idx_email_otps_expires` missing, run `CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps (expires_at);` directly via MCP. No follow-up migration required (idempotent one-liner). Also note: `email_otps` was flagged in audit §5.3 as missing RLS — Stream B / O is handling that separately.

---

## Migration 2: `20260426_wave_launch_readiness.sql`

**Purpose:** Launch-readiness migration — creates `newsletter_editions` + 5 forum tables (`forum_categories`, `forum_threads`, `forum_posts`, `forum_user_profiles`, `forum_votes`), seeds 8 forum categories, 3 newsletter editions, and 20 best-for scenarios.

**Uncertain operation:** Final SQL is `INSERT INTO public.best_for_scenarios … ON CONFLICT (slug) DO UPDATE SET …` covering 20 rows (`fractional-shares` through `crypto-staking`, display_order 310–500). Header comment block runs another ~30 lines after the last semicolon. If the INSERT was truncated, fewer than 20 of the new scenarios shipped — comparison pages for those slugs would 404 / serve empty rankings.

**Verification SQL:**
```sql
-- Confirm all 20 best-for slugs from this migration exist
SELECT slug
FROM public.best_for_scenarios
WHERE slug IN (
  'fractional-shares','copy-trading','margin-lending','family-accounts',
  'international-shares-beyond-us','demo-account','asx-small-caps',
  'high-frequency-api','ipo-investing','tax-reporting','corporate-accounts',
  'sustainable-super','share-trading-seniors','term-deposits',
  'high-interest-savings','share-trading-nz','cheapest-etf-portfolio',
  'joint-accounts','after-hours-trading','crypto-staking'
)
ORDER BY display_order;

-- Confirm the supporting tables and seed counts
SELECT to_regclass('public.newsletter_editions') AS newsletter_editions,
       to_regclass('public.forum_categories')    AS forum_categories,
       to_regclass('public.forum_threads')       AS forum_threads,
       to_regclass('public.forum_posts')         AS forum_posts,
       to_regclass('public.forum_user_profiles') AS forum_user_profiles,
       to_regclass('public.forum_votes')         AS forum_votes;

SELECT COUNT(*) AS forum_category_count FROM public.forum_categories;
SELECT COUNT(*) AS newsletter_edition_count FROM public.newsletter_editions;
```

**Expected result if migration fully applied:**
- 20 rows returned from `best_for_scenarios` query (display_order 310 through 500).
- All 6 `to_regclass` results non-null.
- `forum_category_count` ≥ 8, `newsletter_edition_count` ≥ 3.

**Expected result if partial:** First query returns fewer than 20 rows; missing slugs are exactly the ones whose INSERT row got truncated. Or one of the `to_regclass` results is null (table was never created). Or seed counts are below 8 / 3.

**Recovery action:**
- If specific best-for slugs are missing, re-run only the missing INSERT rows from this migration as a one-off MCP `execute_sql` (the `ON CONFLICT (slug) DO UPDATE` makes it idempotent for any slug that's already there).
- If a forum table is missing, create a forward fix-up migration `supabase/migrations/<date>_g04_forum_table_repair.sql` with the missing `CREATE TABLE IF NOT EXISTS` block(s) lifted verbatim from this file. Don't edit the original migration — forward-only per CLAUDE.md.
- If `forum_categories` count is short, re-run the 8-row INSERT block from lines 136-145 (idempotent via `ON CONFLICT (slug) DO NOTHING`).

---

## Migration 3: `20260512_agent_infrastructure.sql`

**Purpose:** Create the 19 agent-internal tables (`agent_tasks`, `agent_memory`, `agent_logs`, `platform_snapshots`, `prospects`, `compliance_tasks`, `ceo_approvals`, `friend_decisions`, `advisor_content_subscriptions`, `revenue_opportunities`, `migration_plan`, `llm_citations`, `editorial_articles`, `api_customers`, `founder_bandwidth`, `cobranded_products`, `partner_integrations`, `authorised_representatives`, `credit_representatives`) plus the shared `set_updated_at_agent_infra()` trigger function.

**Uncertain operation:** The final SQL block creates table #19, `credit_representatives`, including its `CREATE INDEX`, `CREATE TRIGGER`, `ALTER TABLE … ENABLE ROW LEVEL SECURITY`, and `CREATE POLICY`, ending at line 608 with a trailing `-- End of migration.` comment. If the last several statements truncated, `credit_representatives` may be missing the index, the updated_at trigger, RLS, or its service-role policy. Authorised representatives (table #18) was also created near the end — same risk.

**Verification SQL:**
```sql
-- Confirm all 19 agent-infra tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN (
  'agent_tasks','agent_memory','agent_logs','platform_snapshots','prospects',
  'compliance_tasks','ceo_approvals','friend_decisions',
  'advisor_content_subscriptions','revenue_opportunities','migration_plan',
  'llm_citations','editorial_articles','api_customers','founder_bandwidth',
  'cobranded_products','partner_integrations','authorised_representatives',
  'credit_representatives'
)
ORDER BY tablename;

-- Confirm RLS is enabled on the two trailing tables (highest truncation risk)
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('authorised_representatives','credit_representatives')
  AND relnamespace = 'public'::regnamespace;

-- Confirm policies exist for the two trailing tables
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('authorised_representatives','credit_representatives')
ORDER BY tablename, policyname;

-- Confirm the shared trigger function exists
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'set_updated_at_agent_infra';

-- Confirm the updated_at trigger is wired on the last two tables
SELECT event_object_table, trigger_name
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('authorised_representatives','credit_representatives');
```

**Expected result if migration fully applied:**
- First query returns 19 rows.
- `relrowsecurity = true` for both `authorised_representatives` and `credit_representatives`.
- Each of the two trailing tables has a policy named `Service role manages <table>`.
- `set_updated_at_agent_infra` function exists.
- Triggers `set_updated_at_authorised_representatives` and `set_updated_at_credit_representatives` exist.

**Expected result if partial:** Fewer than 19 tables, or missing RLS / missing policy / missing trigger on the trailing tables. Most likely missing piece: the `CREATE POLICY` on `credit_representatives` (last statement before end-of-file comment).

**Recovery action:** Forward-only fix-up migration `supabase/migrations/<date>_g04_agent_infra_repair.sql` containing only the missing pieces (which the verification reveals). All blocks in `20260512_agent_infrastructure.sql` are guarded with `IF NOT EXISTS` / `DROP POLICY IF EXISTS` / `DROP TRIGGER IF EXISTS`, so re-running affected sections via MCP is also safe.

---

## Migration 4: `20260310_fix_advisor_photos.sql`

**Purpose:** Backfill `professionals.photo_url` for advisors with NULL photos — first via a 55-WHEN `CASE` statement keyed by slug (specific advisors), then a catch-all UPDATE for any remaining NULLs using a name-derived ui-avatars URL.

**Uncertain operation:** The catch-all UPDATE on lines 69-71 is the final SQL statement, followed by a single trailing blank line (no closing comment, but no statement terminator after it either — the trailing newline is the only thing between `WHERE photo_url IS NULL;` and EOF). The risk is two-fold: (a) the catch-all UPDATE truncated, leaving newly-added advisors without photos; (b) the slug-keyed CASE block missed advisors whose slugs don't match any of the 55 WHENs, and the catch-all should have caught them but didn't apply.

**Verification SQL:**
```sql
-- Count advisors still missing photo_url
SELECT COUNT(*) AS missing_photo_count
FROM public.professionals
WHERE photo_url IS NULL;

-- Sample any that are still NULL (to see if it's the trailing-truncation case)
SELECT id, slug, name
FROM public.professionals
WHERE photo_url IS NULL
ORDER BY id
LIMIT 10;

-- Sanity check: how many advisors have ui-avatars URLs (i.e. were touched)
SELECT COUNT(*) AS ui_avatars_count
FROM public.professionals
WHERE photo_url LIKE 'https://ui-avatars.com/api/%';
```

**Expected result if migration fully applied:** `missing_photo_count = 0` (or only very recently added advisors that post-date the migration). `ui_avatars_count` should be in the range of all advisors that existed when the migration ran (at least the 55 listed in the CASE plus any others active at that time).

**Expected result if partial:** `missing_photo_count > 0` for advisors that pre-date 2026-03-10 — indicates the catch-all UPDATE either truncated or never ran. (Post-migration advisor inserts are not the migration's responsibility — they should be set at insert-time by the application.)

**Recovery action:** The fix is a single one-shot MCP `execute_sql` re-running the catch-all (idempotent for any row already populated):
```sql
UPDATE professionals
SET photo_url = 'https://ui-avatars.com/api/?name=' || REPLACE(name, ' ', '+')
              || '&background=7c3aed&color=fff&size=200&bold=true'
WHERE photo_url IS NULL;
```
No new migration file needed for a one-shot data backfill, though if the founder prefers a paper-trail a forward-fix-up `<date>_g04_advisor_photo_backfill.sql` is fine.

---

## Migration 5: `20260310_admin_login_attempts.sql`

**Purpose:** Create `admin_login_attempts` table + reset_at index + ENABLE RLS to back the admin-login rate limiter (replaces a pre-existing in-memory `Map`).

**Uncertain operation:** The final SQL statement is `ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;` (line 12), followed by `-- No RLS policies = only service role key can read/write` as a trailing comment. If this last ALTER truncated, the table exists with the index but RLS is **off** — meaning the table is readable / writable via the anon key, which is a real security regression (the table holds IP hashes that could be enumerated).

**Verification SQL:**
```sql
-- Confirm table + index exist
SELECT to_regclass('public.admin_login_attempts') AS table_exists;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'admin_login_attempts';

-- Confirm RLS is enabled (the highest-risk piece)
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'admin_login_attempts'
  AND relnamespace = 'public'::regnamespace;

-- Confirm there are NO non-service-role-bypass policies (intentional design:
-- "no policies = only service-role bypass works")
SELECT policyname, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'admin_login_attempts';
```

**Expected result if migration fully applied:**
- `table_exists` → `admin_login_attempts`
- `indexname` includes `idx_admin_login_attempts_reset_at` (and the implicit pkey).
- `relrowsecurity = true`.
- No rows from the policies query (zero policies is intentional — service-role bypasses RLS at the connection level).

**Expected result if partial:** `relrowsecurity = false` while the table exists — anon key can read/write. Critical fix needed.

**Recovery action:** If RLS is off, run `ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;` directly via MCP — single statement, no migration file needed. Also: this table was flagged in audit §5.3 (RLS gap audit); Stream B / O confirmation should resolve this in parallel.

---

## Migration 6: `20260411_features_11_12_14_15_16_18.sql`

**Purpose:** Multi-feature batch — creates `user_saved_comparisons`, `user_shortlisted_brokers`, `price_drop_notifications`, `qa_votes`, `api_keys`, `api_request_log`, `regulatory_broker_impacts`; adds columns to `fee_alert_subscriptions`, `broker_questions`, `broker_answers`, `user_reviews`, `professional_reviews`, `regulatory_alerts`.

**Uncertain operation:** The final SQL is creating `regulatory_broker_impacts` (lines 163-180): `CREATE TABLE`, two indexes, `ENABLE RLS`, two policies. After that, only trailing comments (lines 182-185 — a developer note about extending the cleanup cron, no SQL). If truncated, the table or one of its policies / indexes may be missing. Also worth verifying: the six `ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS` statements (lines 155-160) all applied — if these silently fell through, `regulatory_alerts` is missing the impact-assessment columns.

**Verification SQL:**
```sql
-- Confirm all new tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename IN (
  'user_saved_comparisons','user_shortlisted_brokers','price_drop_notifications',
  'qa_votes','api_keys','api_request_log','regulatory_broker_impacts'
)
ORDER BY tablename;

-- Confirm the trailing table is fully set up (RLS + policies)
SELECT relrowsecurity FROM pg_class
WHERE relname = 'regulatory_broker_impacts'
  AND relnamespace = 'public'::regnamespace;

SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'regulatory_broker_impacts'
ORDER BY policyname;

-- Confirm the column ALTERs applied to existing tables
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'regulatory_alerts'
  AND column_name IN ('affected_broker_slugs','affected_platform_types',
                      'change_category','user_action_required',
                      'compliance_deadline','views_count')
ORDER BY column_name;

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'fee_alert_subscriptions'
  AND column_name IN ('price_threshold','last_notified_at','notification_count')
ORDER BY column_name;

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'professional_reviews'
  AND column_name IN ('is_verified_client','lead_id','verified_client_at')
ORDER BY column_name;

-- Confirm vote_count + helpful_count columns landed
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'broker_questions' AND column_name = 'vote_count')
    OR (table_name = 'broker_answers' AND column_name IN ('vote_count','helpful_count')))
ORDER BY table_name, column_name;
```

**Expected result if migration fully applied:**
- 7 new tables present.
- `relrowsecurity = true` and 2 policies (`Public read regulatory impacts`, `Service write regulatory impacts`) on `regulatory_broker_impacts`.
- All 6 `regulatory_alerts` columns present.
- All 3 `fee_alert_subscriptions` columns present.
- All 3 `professional_reviews` columns present.
- `broker_questions.vote_count` + `broker_answers.{vote_count,helpful_count}` present.

**Expected result if partial:** A subset of the above missing — most likely the trailing `regulatory_broker_impacts` policies or the `regulatory_alerts` columns toward the end of the ALTER block.

**Recovery action:** Forward fix-up migration `supabase/migrations/<date>_g04_features_11_18_repair.sql` with only the missing pieces (each is already idempotent in the original via `IF NOT EXISTS` / explicit `CREATE POLICY` after a defensive `DROP`). For the `ADD COLUMN IF NOT EXISTS` pattern, even re-running the original block is safe.

---

## Migration 7: `20260522_rls_cosmetic_cleanup.sql`

**Purpose:** Cosmetic RLS cleanup — adds an explicit `service_role` policy to `dynamic_pricing_rules` (no behaviour change; clears a Supabase advisor flag), and drops a legacy duplicate public-read policy on `forum_threads`.

**Uncertain operation:** Final statement is `DROP POLICY IF EXISTS "Public can read threads" ON public.forum_threads;` (line 39). The header comment block references `TODO.md "Soon"` (line 5) — flagging this as a follow-up item that may not have been re-validated post-apply. If the trailing DROP truncated, the duplicate public-read policy would still exist on `forum_threads`, creating ambiguity for future RLS audits but not a security gap (both policies have the same `is_removed = false` predicate).

**Verification SQL:**
```sql
-- Confirm the new service_role policy exists on dynamic_pricing_rules
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'dynamic_pricing_rules'
  AND policyname = 'Service role manages dynamic_pricing_rules';

-- Confirm the legacy duplicate policy is gone from forum_threads
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'forum_threads'
ORDER BY policyname;
```

**Expected result if migration fully applied:**
- First query returns one row: `Service role manages dynamic_pricing_rules`.
- Second query does NOT include `Public can read threads`. Should include `forum_threads_public_read` (current canonical name from `20260427_wave_security_observability.sql`) and the auth-scoped insert/update/delete policies.

**Expected result if partial:** Either the new service-role policy missing on `dynamic_pricing_rules`, or the legacy `Public can read threads` still present on `forum_threads`.

**Recovery action:** Either issue is a one-line MCP `execute_sql`:
- Missing service-role policy: `CREATE POLICY "Service role manages dynamic_pricing_rules" ON public.dynamic_pricing_rules FOR ALL TO service_role USING (true) WITH CHECK (true);`
- Lingering legacy policy: `DROP POLICY IF EXISTS "Public can read threads" ON public.forum_threads;`

No follow-up migration file needed (cosmetic + idempotent).

---

## Migration 8: `20260513_fix_public_read_leaks.sql`

**Purpose:** Fix two genuine public-read data leaks — drops `Public can read BD pipeline` on `bd_pipeline` and `Public read competitor_watch` on `competitor_watch`, then adds an explicit service_role policy on `competitor_watch`. The header notes this was captured in `TODO.md "Urgent — data exposure"`.

**Uncertain operation:** Final SQL block (lines 42-44) is the `DROP POLICY IF EXISTS "Service role manages competitor_watch" ... CREATE POLICY "Service role manages competitor_watch" ...`. The header references `TODO.md` (a marker the audit flags). The risk on this one is the most consequential of the eight: if the migration truncated before the public-read DROPs applied, **`bd_pipeline` (enterprise contacts/deal sizes) and/or `competitor_watch` (competitor intel) are still publicly readable via PostgREST anon access** — an active data leak, not just a hygiene issue.

**Verification SQL:**
```sql
-- Confirm the leaky public-read policies are gone on both tables
SELECT tablename, policyname, roles, cmd, qual::text AS qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('bd_pipeline','competitor_watch')
ORDER BY tablename, policyname;

-- Confirm both tables have RLS enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('bd_pipeline','competitor_watch')
  AND relnamespace = 'public'::regnamespace;

-- Smoke test: try an anon-role read and confirm it's blocked
-- (run this from an anon-key MCP connection if available; from the
-- service-role connection RLS is bypassed and the test is meaningless)
-- SELECT count(*) FROM public.bd_pipeline;        -- should error or 0
-- SELECT count(*) FROM public.competitor_watch;   -- should error or 0
```

**Expected result if migration fully applied:**
- No policy named `Public can read BD pipeline` on `bd_pipeline`.
- No policy named `Public read competitor_watch` on `competitor_watch`.
- `competitor_watch` has a `Service role manages competitor_watch` policy with `roles = {service_role}`.
- Both tables show `relrowsecurity = true`.
- Anon read returns 0 rows or RLS error.

**Expected result if partial:** Either of the two `Public ...` policies still listed → active data leak. Or the new `Service role manages competitor_watch` policy missing — which is harmless because service_role uses BYPASSRLS, but still wants applying for advisor cleanliness.

**Recovery action:** **Treat as urgent if the public-read policies are still present.** One-shot MCP fix:
```sql
DROP POLICY IF EXISTS "Public can read BD pipeline" ON public.bd_pipeline;
DROP POLICY IF EXISTS "Public read competitor_watch" ON public.competitor_watch;
DROP POLICY IF EXISTS "Service role manages competitor_watch" ON public.competitor_watch;
CREATE POLICY "Service role manages competitor_watch" ON public.competitor_watch
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```
Also note: `app/admin/competitors/page.tsx` is a client component reading via the anon client (per the migration's "Known downstream impact" note). If the public-read DROP did apply, that admin page is silently empty — Stream C / X covers the refactor to an API route + service-role client.

---

## Summary table for the founder

| # | Migration | Risk if partial | Verification SQL location | Likely recovery |
|---|---|---|---|---|
| 1 | `20260316_email_otps.sql` | Slow OTP cleanup (no impact, just perf) | above §1 | One-shot `CREATE INDEX IF NOT EXISTS` |
| 2 | `20260426_wave_launch_readiness.sql` | Some `/best/[slug]` pages 404 / forum tables missing | above §2 | Forward fix-up migration |
| 3 | `20260512_agent_infrastructure.sql` | Last 1-2 of 19 agent tables incomplete (RLS / policies) | above §3 | Forward fix-up migration |
| 4 | `20260310_fix_advisor_photos.sql` | Some advisors with NULL `photo_url` | above §4 | One-shot UPDATE |
| 5 | `20260310_admin_login_attempts.sql` | RLS off on rate-limit table → anon enumeration | above §5 | One-shot `ENABLE RLS` |
| 6 | `20260411_features_11_12_14_15_16_18.sql` | Trailing table or column ALTERs missing | above §6 | Forward fix-up migration |
| 7 | `20260522_rls_cosmetic_cleanup.sql` | Cosmetic only (duplicate policy) | above §7 | One-shot DROP / CREATE |
| 8 | `20260513_fix_public_read_leaks.sql` | **Active data leak on `bd_pipeline` + `competitor_watch`** | above §8 | **Urgent one-shot DROPs** |

**Suggested run order:** #8 first (highest risk if partial), then #5 (security), then #3 (broadest scope), then the rest in any order. Total time at the SQL prompt is ~10 minutes if all eight verifications run cleanly.

After running the verifications, reply with the result counts so any forward-fix-up migrations can be queued. None of the recoveries above touch the original migration files — all repairs are forward-only per `CLAUDE.md`.
