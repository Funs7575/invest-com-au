-- ============================================================================
-- Migration: 20260901000000_rls_audit_wave3.sql
-- Date:      2026-09-01
-- Queue ref: Wave-3 security audit — over-permissive INSERT/ALL policies
--
-- Two tables have policies missing a TO clause, which means they default to
-- PUBLIC (anon + authenticated role). Anyone with the public anon key can
-- bypass route-handler rate limits by calling Supabase REST directly.
--
--   S1  newsletter_sends — "Service manage newsletter sends" created with
--         FOR ALL USING (true) and no TO clause in
--         20260408_tier2_traffic_features.sql:71. All callers are server-side
--         cron and admin routes using createAdminClient().
--
--   S2  professional_reviews — "Anyone can submit reviews" created with
--         FOR INSERT WITH CHECK (true) and no TO clause in
--         20260309_advisor_reviews_and_views.sql. The rate-limited
--         /api/advisor-review route enforces 5/60min per IP, but this
--         INSERT policy lets an anon key holder bypass that limit entirely by
--         calling the Supabase REST API directly. Fix: restrict INSERT to
--         service_role only (route now uses createAdminClient() for INSERT,
--         changed in the same PR). The existing SELECT policies
--         ("Public can view approved reviews", "Admins full access reviews")
--         are unchanged.
--
-- App-impact analysis:
--   newsletter_sends:    all reads and writes via createAdminClient() in cron
--                        (weekly-rate-update) and admin routes. No anon path.
--   professional_reviews INSERT: /api/advisor-review now uses createAdminClient()
--                        for the INSERT call (same PR). No other route inserts
--                        reviews. The "Admins full access reviews" policy (FOR ALL
--                        TO authenticated USING (auth.role()='admin')) is
--                        unaffected.
--
-- Idempotency:
--   DROP POLICY IF EXISTS — no-op if already absent.
--   DO $$ IF NOT EXISTS check before CREATE POLICY — safe to re-run.
--
-- Rollback strategy (restores over-open state — NOT recommended for prod):
--   newsletter_sends:
--     DROP POLICY IF EXISTS "newsletter_sends_service_role_all" ON public.newsletter_sends;
--     CREATE POLICY "Service manage newsletter sends" ON public.newsletter_sends FOR ALL USING (true);
--   professional_reviews:
--     DROP POLICY IF EXISTS "professional_reviews_service_role_insert" ON public.professional_reviews;
--     CREATE POLICY "Anyone can submit reviews" ON public.professional_reviews FOR INSERT WITH CHECK (true);
-- ============================================================================

-- ── S1: newsletter_sends ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service manage newsletter sends" ON public.newsletter_sends;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'newsletter_sends'
      AND policyname = 'newsletter_sends_service_role_all'
  ) THEN
    CREATE POLICY "newsletter_sends_service_role_all"
      ON public.newsletter_sends
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sends FORCE ROW LEVEL SECURITY;

-- ── S2: professional_reviews (INSERT only) ───────────────────────────────────

-- Drop the open-to-public INSERT policy.
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.professional_reviews;

-- Replace with service_role INSERT only. The route (/api/advisor-review) now
-- uses createAdminClient() for the INSERT, so no behaviour change for users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'professional_reviews'
      AND policyname = 'professional_reviews_service_role_insert'
  ) THEN
    CREATE POLICY "professional_reviews_service_role_insert"
      ON public.professional_reviews
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- RLS already enabled by 20260309_advisor_reviews_and_views.sql — re-assert for
-- idempotency on partial-migration environments.
ALTER TABLE public.professional_reviews ENABLE ROW LEVEL SECURITY;
