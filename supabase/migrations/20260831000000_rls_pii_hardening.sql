-- ============================================================================
-- Migration: 20260831000000_rls_pii_hardening.sql
-- Date:      2026-08-31
-- Queue ref: Wave-2 security audit — PII/commercial-data RLS tightening
--
-- Why: Three tables/views with over-permissive SELECT policies that expose
--   sensitive data to any holder of the public anon key via the Supabase
--   REST API:
--
--   S1  broker_signups — "Admin read signups" is FOR SELECT USING (true)
--         with no TO clause, so it defaults to PUBLIC (anon + authenticated).
--         Exposes revenue_cents, commission_type, external_ref, click_id,
--         utm_* — commercially sensitive affiliate/revenue data. All reads
--         are via createAdminClient() (service_role), so nothing in the app
--         breaks when we restrict to service_role only.
--         (src: 20260408_tier1_revenue_features.sql L44)
--         Note: "Service insert signups" (INSERT WITH CHECK true) is also
--         widened to service_role — the only inserter is the
--         /api/webhooks/broker-signup route which uses createAdminClient().
--
--   S2  qa_votes — "Public read votes" is FOR SELECT USING (true) with no
--         TO clause. The voter_identifier column stores IP hashes or raw
--         user_ids, which lets anyone enumerate which users voted on which
--         Q&A items. All reads happen via createAdminClient() in
--         app/api/{answers,questions}/[id]/vote/route.ts (server-side).
--         (src: 20260411_features_11_12_14_15_16_18.sql L117 + repair L94)
--
--   S3  advisor_cohort_metrics — MATERIALIZED VIEW created in
--         20260415_wave_8_growth_engine.sql with no REVOKE/GRANT. In
--         Supabase the default grants include SELECT to authenticated, which
--         allows any logged-in user to read monthly advisor acquisition
--         cohort data (internal business metrics). Restrict to service_role.
--
-- App-impact analysis:
--   broker_signups:  all reads via createAdminClient() (admin routes, cron,
--                    webhook). No app path uses the anon/user client.
--   qa_votes:        all reads via createAdminClient() in server routes.
--                    Vote counts rendered in RSC pages come from server-side
--                    admin queries, not client-side Supabase JS.
--   advisor_cohort_metrics: read only by cron/admin routes via service_role.
--
-- Idempotency:
--   DROP POLICY IF EXISTS — no-op if already absent.
--   CREATE POLICY guarded by DO $$ IF NOT EXISTS check $$.
--   REVOKE on absent privilege is a no-op.
--   GRANT re-asserts post-state. Safe to re-run.
--
-- Rollback strategy (restores over-open state — NOT recommended for prod):
--   broker_signups:
--     DROP POLICY IF EXISTS "broker_signups_service_role_read" ON public.broker_signups;
--     DROP POLICY IF EXISTS "broker_signups_service_role_insert" ON public.broker_signups;
--     CREATE POLICY "Admin read signups" ON public.broker_signups FOR SELECT USING (true);
--     CREATE POLICY "Service insert signups" ON public.broker_signups FOR INSERT WITH CHECK (true);
--   qa_votes:
--     DROP POLICY IF EXISTS "qa_votes_service_role_all" ON public.qa_votes;
--     CREATE POLICY "Public insert votes" ON public.qa_votes FOR INSERT WITH CHECK (true);
--     CREATE POLICY "Public read votes" ON public.qa_votes FOR SELECT USING (true);
--   advisor_cohort_metrics:
--     GRANT SELECT ON public.advisor_cohort_metrics TO authenticated;
-- ============================================================================

-- ── S1: broker_signups ────────────────────────────────────────────────────────

-- Drop the over-open policies (idempotent)
DROP POLICY IF EXISTS "Admin read signups"      ON public.broker_signups;
DROP POLICY IF EXISTS "Service insert signups"  ON public.broker_signups;

-- Replace with service_role-only policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'broker_signups'
      AND policyname = 'broker_signups_service_role_read'
  ) THEN
    CREATE POLICY "broker_signups_service_role_read"
      ON public.broker_signups
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'broker_signups'
      AND policyname = 'broker_signups_service_role_insert'
  ) THEN
    CREATE POLICY "broker_signups_service_role_insert"
      ON public.broker_signups
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Ensure RLS is enabled and enforced (idempotent)
ALTER TABLE public.broker_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_signups FORCE ROW LEVEL SECURITY;

-- ── S2: qa_votes ─────────────────────────────────────────────────────────────

-- Drop both over-open policies
DROP POLICY IF EXISTS "Public insert votes" ON public.qa_votes;
DROP POLICY IF EXISTS "Public read votes"   ON public.qa_votes;

-- Single service_role-manages-all replaces them (all callers are server-side)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'qa_votes'
      AND policyname = 'qa_votes_service_role_all'
  ) THEN
    CREATE POLICY "qa_votes_service_role_all"
      ON public.qa_votes
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Ensure RLS is enabled and enforced (idempotent)
ALTER TABLE public.qa_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_votes FORCE ROW LEVEL SECURITY;

-- ── S3: advisor_cohort_metrics ────────────────────────────────────────────────

-- Revoke SELECT from roles that should not query this view directly.
-- REVOKE on a privilege not held is a no-op in Postgres.
REVOKE SELECT ON public.advisor_cohort_metrics FROM anon;
REVOKE SELECT ON public.advisor_cohort_metrics FROM authenticated;

-- service_role retains SELECT (default superuser-equivalent access).
-- No GRANT needed — service_role bypasses object-level privileges.
