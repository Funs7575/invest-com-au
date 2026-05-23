-- ============================================================================
-- Migration: 20260520_dv02_user_documents_storage.sql
-- Date: 2026-05-20
-- Audit ref: docs/audits/codebase-health-2026-04-24.md
-- Queue item: DV-01 follow-up (storage-layer owner isolation for the vault)
--
-- Why: 20260520_dv01_user_documents.sql created the user_documents metadata
-- table with owner-only RLS, but relegated creation of the "user-documents"
-- Supabase Storage bucket — and its storage.objects RLS policies — to a manual
-- dashboard step. That left the actual file bytes with NO declared-in-migration
-- access control. Because the upload/list/delete routes
-- (app/api/account/documents/*) use createClient() (the user's JWT, NOT the
-- service-role admin client), every storage.objects operation is evaluated
-- under the `authenticated` role and is denied by default unless an explicit
-- policy grants it. Absent per-user policies the vault either (a) silently
-- fails to upload/sign, or (b) — if a broad policy is added by hand — leaks
-- one user's documents to another (storage-layer IDOR).
--
-- This migration makes the secure state explicit and reproducible:
--   * creates the private "user-documents" bucket (20 MB, same MIME allowlist
--     the upload route enforces), and
--   * adds four storage.objects policies on the `authenticated` role scoped to
--     the object's first path segment === auth.uid(), matching the route's
--     storage path layout `{uid}/{docId}/{filename}`. This enforces strict
--     owner-only access at the storage layer — the same trust boundary the
--     user_documents metadata table already enforces.
--   * adds a service_role full-access policy for admin/cron cleanup (e.g. the
--     orphan-file removal in the upload route's DB-insert-failure path), mirroring
--     the "Service role full access user_documents" table policy.
--
-- Idempotency claim: is a no-op when re-applied — the bucket INSERT uses
-- ON CONFLICT (id) DO NOTHING and every policy uses DROP POLICY IF EXISTS
-- before CREATE POLICY.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Owners can read own vault objects"   ON storage.objects;
--   DROP POLICY IF EXISTS "Owners can insert own vault objects" ON storage.objects;
--   DROP POLICY IF EXISTS "Owners can update own vault objects" ON storage.objects;
--   DROP POLICY IF EXISTS "Owners can delete own vault objects" ON storage.objects;
--   DROP POLICY IF EXISTS "Service role full access vault objects" ON storage.objects;
--   -- DESTRUCTIVE: deleting the bucket orphans every uploaded document.
--   -- The DELETE fails while objects exist; empty it first via dashboard.
--   DELETE FROM storage.buckets WHERE id = 'user-documents';
--
-- IMPORTANT — prior policy state on storage.objects for this bucket:
--   No prior policies reference 'user-documents'; they are introduced here.
-- ============================================================================

BEGIN;

-- Private bucket: file bytes must never be anon/cross-user readable. Downloads
-- go through short-lived signed URLs minted by the list route (createSignedUrl,
-- 10 min TTL). 20 MB matches MAX_BYTES in app/api/account/documents/upload/route.ts.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-documents',
  'user-documents',
  false,
  20971520, -- 20 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── storage.objects RLS — per-user folder isolation ───────────────────────────
-- The route stores objects at `{auth.uid()}/{docId}/{filename}`, so the first
-- path segment is the owner's UID. (storage.foldername(name))[1] extracts it.
-- Casting auth.uid() (uuid) to text matches the stored segment.

DROP POLICY IF EXISTS "Owners can read own vault objects" ON storage.objects;
CREATE POLICY "Owners can read own vault objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Owners can insert own vault objects" ON storage.objects;
CREATE POLICY "Owners can insert own vault objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Owners can update own vault objects" ON storage.objects;
CREATE POLICY "Owners can update own vault objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Owners can delete own vault objects" ON storage.objects;
CREATE POLICY "Owners can delete own vault objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Service role explicit allow — admin/cron cleanup of orphaned files and the
-- upload route's failure-path remove(). Mirrors the table-level service_role policy.
DROP POLICY IF EXISTS "Service role full access vault objects" ON storage.objects;
CREATE POLICY "Service role full access vault objects"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'user-documents')
  WITH CHECK (bucket_id = 'user-documents');

COMMIT;
