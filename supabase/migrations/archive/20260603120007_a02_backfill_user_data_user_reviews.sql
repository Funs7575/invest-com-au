-- ============================================================================
-- Migration: Backfill public.user_reviews (A-02 batch 2)
-- Date:      2026-05-01 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02 schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `user_reviews` is declared in `lib/database.types.ts` (line 11564) and has
--   ~26 call sites in app/ + lib/, but the migration tree has no CREATE TABLE
--   for it. `20260309_security_and_performance_fixes.sql` adds/replaces INSERT
--   policies and `20260411_features_11_12_14_15_16_18.sql` adds columns via
--   ALTER TABLE — both assume the table already exists (created via the Supabase
--   dashboard before those migrations were written).
--
--   This migration adds the table to the migration tree so a clean rebuild
--   produces a schema that matches lib/database.types.ts (base columns only;
--   ALTER TABLE columns like `is_verified_client` and `verified_via` are added
--   by the later `20260411_features_11_12_14_15_16_18.sql:95-96`).
--
-- Verified callers (grep app/ lib/)
--   Admin-client callers (BYPASSRLS):
--     - app/api/user-review/route.ts              INSERT (review submission)
--     - app/api/user-review/moderate/route.ts     UPDATE (moderation)
--     - app/api/user-review/verify/route.ts       SELECT + UPDATE (email verify)
--     - app/api/broker-review-invite/route.ts     SELECT (invite check)
--     - app/api/analytics-dashboard/route.ts      SELECT (count)
--     - app/api/admin/** routes                   SELECT + UPDATE (admin portal)
--     - app/api/cron/** routes                    SELECT + UPDATE (sentiment etc.)
--   Anon-key callers (RLS applies — must have SELECT policy):
--     - app/broker/[slug]/page.tsx                SELECT WHERE status='approved'
--     - lib/cached-data.ts                        SELECT WHERE status='approved'
--
-- IMPORTANT — prior policy state on user_reviews:
--   `20260309_security_and_performance_fixes.sql` contains (lines 223-235):
--     DROP POLICY IF EXISTS "Insert user reviews" ON user_reviews;
--     DROP POLICY IF EXISTS "Anyone can submit user reviews" ON user_reviews;
--     DROP POLICY IF EXISTS "Public insert user reviews" ON user_reviews;
--     CREATE POLICY "Insert user reviews" ON user_reviews ...
--   That file sorts BEFORE this migration (20260309 < 20260603). In a prod DB
--   (where user_reviews already existed before 20260309 ran), those statements
--   applied successfully. In a fresh rebuild, 20260309 runs before this
--   migration (table doesn't exist yet), which would cause the 20260309 policy
--   statements to be no-ops or errors. This is the known limitation of the A-02
--   batched backfill approach — the full fix requires the 20260309 migration to
--   guard against a missing table, which is out of scope for this batch.
--   The "Database types drift" CI gate still passes because it checks the
--   declared schema against types, not migration execution order.
--
-- RLS policy chosen
--   - service_role: explicit FOR ALL allow (audit visibility).
--   - anon + authenticated SELECT WHERE status = 'approved': for
--     public broker pages (broker/[slug]) and cached-data reads.
--   - anon + authenticated INSERT with validation: mirrors the existing
--     "Insert user reviews" policy from 20260309 so a fresh-rebuild environment
--     has the correct policy from this migration onwards. The 20260309 migration's
--     DROP IF EXISTS + CREATE re-applies the same logic idempotently.
--   - No UPDATE or DELETE for anon/authenticated; those go through the admin
--     client which bypasses RLS.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing table.
--   - ENABLE/FORCE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY — idempotent reruns.
--   - 20260309's "Insert user reviews" DROP + CREATE is a safe overwrite.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"    ON public.user_reviews;
--     DROP POLICY IF EXISTS "Public read approved reviews" ON public.user_reviews;
--     DROP POLICY IF EXISTS "Insert user reviews"         ON public.user_reviews;
--     ALTER TABLE public.user_reviews NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE public.user_reviews DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.user_reviews; -- only on clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_reviews (
  id                    serial        PRIMARY KEY,
  broker_id             integer       NOT NULL REFERENCES public.brokers(id),
  broker_slug           text          NOT NULL,
  body                  text          NOT NULL,
  display_name          text          NOT NULL,
  email                 text          NOT NULL,
  rating                integer       NOT NULL,
  status                text          NOT NULL DEFAULT 'pending',
  title                 text          NOT NULL,
  cons                  text,
  pros                  text,
  experience_months     integer,
  fees_rating           integer,
  ip_hash               text,
  moderation_note       text,
  platform_rating       integer,
  reliability_rating    integer,
  support_rating        integer,
  verification_token    text,
  verified_at           timestamptz,
  auto_moderated_at     timestamptz,
  auto_moderated_reasons jsonb,
  auto_moderated_verdict text,
  admin_overridden_at   timestamptz,
  admin_overridden_by   text,
  created_at            timestamptz   DEFAULT now(),
  updated_at            timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_reviews_broker_id ON public.user_reviews (broker_id);
-- user_reviews has no user_id; index on email for lookup/delete flows.
CREATE INDEX IF NOT EXISTS idx_user_reviews_email     ON public.user_reviews (email);

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reviews FORCE  ROW LEVEL SECURITY;

-- Drop prior policy names (covers 20260309 variants + any parallel drafts).
DROP POLICY IF EXISTS "service_role full access"       ON public.user_reviews;
DROP POLICY IF EXISTS "Public read approved reviews"   ON public.user_reviews;
DROP POLICY IF EXISTS "Insert user reviews"            ON public.user_reviews;
DROP POLICY IF EXISTS "Anyone can submit user reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Public insert user reviews"     ON public.user_reviews;

-- Service-role explicit allow. Admin client (service_role) bypasses RLS
-- regardless; explicit policy makes intent visible in pg_policies for auditors.
CREATE POLICY "service_role full access"
  ON public.user_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public read of approved reviews. Broker pages and cached-data helpers use
-- the anon-key server client (createClient()) and filter status='approved'.
-- This policy makes the RLS layer enforce the same invariant.
CREATE POLICY "Public read approved reviews"
  ON public.user_reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Public INSERT with validation. Mirrors the policy created by
-- `20260309_security_and_performance_fixes.sql:227-235` under the same name
-- so that migration's DROP IF EXISTS + CREATE is a clean idempotent overwrite.
-- Note: app/api/user-review/route.ts currently uses the admin client for INSERT,
-- so this policy is defence-in-depth rather than the active enforcement path.
CREATE POLICY "Insert user reviews"
  ON public.user_reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(trim(email)) > 0
    AND display_name IS NOT NULL AND length(trim(display_name)) > 0
    AND broker_id IS NOT NULL
    AND rating >= 1 AND rating <= 5
  );

-- TODO: human review of policy semantics — the INSERT path currently goes
-- through the admin client (createAdminClient() in user-review/route.ts),
-- so the anon INSERT policy is defence-in-depth. If that route is ever
-- refactored to use createClient(), this policy becomes the enforcement path.

COMMIT;
