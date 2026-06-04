-- ============================================================================
-- Migration: 20260604_advisor_photos_policy_tighten.sql
-- Purpose: Tighten the three WRITE policies on the 'advisor-photos' storage
--          bucket (INSERT / UPDATE / DELETE) so they apply TO service_role
--          ONLY. As authored in 20260309_create_advisor_photos_storage.sql,
--          these three policies were created with NO `TO` clause, which
--          defaults to PUBLIC — i.e. the `anon` role (anyone holding the
--          public anon key) could INSERT, UPDATE, or DELETE any object in the
--          bucket, allowing advisor portraits to be defaced, overwritten, or
--          wiped, and bypassing the upload API's moderation entirely.
--
--          The advisor upload API writes via the service-role client
--          (advisors authenticate with custom session tokens, not Supabase
--          Auth), and service_role bypasses RLS, so restricting these policies
--          to service_role leaves the legitimate upload path fully working.
--          The public SELECT policy ("Public read access for advisor photos")
--          is intentionally left untouched — public read is by design for a
--          public bucket whose photo URLs render on advisor profiles.
--
-- Idempotent: each policy is dropped with IF EXISTS and recreated, so the
--          migration is safe to re-run.
--
-- Rollback: re-widen the three write policies back to PUBLIC (the pre-fix,
--          insecure state). Only do this if something legitimately writes to
--          the bucket as `anon`/`authenticated` (nothing in this codebase
--          does). Reverse statements:
--            DROP POLICY IF EXISTS "Service role can upload advisor photos" ON storage.objects;
--            CREATE POLICY "Service role can upload advisor photos"
--              ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'advisor-photos');
--            DROP POLICY IF EXISTS "Service role can update advisor photos" ON storage.objects;
--            CREATE POLICY "Service role can update advisor photos"
--              ON storage.objects FOR UPDATE USING (bucket_id = 'advisor-photos');
--            DROP POLICY IF EXISTS "Service role can delete advisor photos" ON storage.objects;
--            CREATE POLICY "Service role can delete advisor photos"
--              ON storage.objects FOR DELETE USING (bucket_id = 'advisor-photos');
--
-- Risk: low — non-destructive. No object data is touched; only the RLS grants
--          on the write policies change. The service-role upload path is
--          unaffected (service_role bypasses RLS). Public read is unaffected.
-- ============================================================================

-- ── INSERT (upload) — restrict to service_role ──────────────────────────────
DROP POLICY IF EXISTS "Service role can upload advisor photos" ON storage.objects;
CREATE POLICY "Service role can upload advisor photos"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'advisor-photos');

-- ── UPDATE — restrict to service_role ───────────────────────────────────────
DROP POLICY IF EXISTS "Service role can update advisor photos" ON storage.objects;
CREATE POLICY "Service role can update advisor photos"
  ON storage.objects FOR UPDATE TO service_role
  USING (bucket_id = 'advisor-photos')
  WITH CHECK (bucket_id = 'advisor-photos');

-- ── DELETE — restrict to service_role ───────────────────────────────────────
DROP POLICY IF EXISTS "Service role can delete advisor photos" ON storage.objects;
CREATE POLICY "Service role can delete advisor photos"
  ON storage.objects FOR DELETE TO service_role
  USING (bucket_id = 'advisor-photos');
