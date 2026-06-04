-- ============================================================================
-- Migration: 20260602_data_exports_bucket.sql
-- Purpose: Private storage bucket for APP-12 / GDPR-15 personal data exports,
--          written by the process-data-exports cron (service-role admin client).
--          Users receive a 7-day signed URL, so NO authenticated/anon policy is
--          declared — a cross-user policy would risk leaking another user's full
--          PII export. Mirrors the dv02 user-documents bucket pattern and
--          replaces the previously-manual "create this bucket by hand" launch
--          step documented in app/api/cron/process-data-exports/route.ts.
-- Idempotent: bucket INSERT uses ON CONFLICT DO NOTHING; policy uses DROP IF EXISTS.
-- Rollback:
--   DROP POLICY IF EXISTS "Service role full access data-exports objects" ON storage.objects;
--   -- DESTRUCTIVE: empty the bucket first; the DELETE fails while objects exist.
--   DELETE FROM storage.buckets WHERE id = 'data-exports';
-- ============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('data-exports', 'data-exports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Service role full access data-exports objects" ON storage.objects;
CREATE POLICY "Service role full access data-exports objects"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'data-exports')
  WITH CHECK (bucket_id = 'data-exports');

COMMIT;
