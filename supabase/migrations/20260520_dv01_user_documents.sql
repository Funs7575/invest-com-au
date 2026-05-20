-- ============================================================================
-- Migration: 20260520_dv01_user_documents.sql
-- Date: 2026-05-20
-- Audit ref: docs/audits/codebase-health-2026-04-24.md
-- Queue item: DV-01 (document vault — encrypted upload + RLS-isolated storage)
--
-- Why: Investors need a secure place to store sensitive financial documents
-- (super statements, tax returns, will, insurance policies, bank statements).
-- This migration creates the metadata table for the vault; actual file bytes
-- live in the private Supabase Storage bucket "user-documents" which uses
-- AES-256 encryption at rest. The RLS policy ensures strict owner-only access:
-- no user can read or write another user's document rows.
--
-- NOTE: The "user-documents" Supabase Storage bucket must be created as a
-- private bucket in the Supabase dashboard (or via storage API) before the
-- upload route goes live. Set max file size to 20 MB at the bucket level.
--
-- Idempotency claim: is a no-op when re-applied — every statement uses
-- IF NOT EXISTS / DROP POLICY IF EXISTS.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.user_documents CASCADE;
--   (Storage bucket contents must be cleared manually via dashboard.)
--
-- IMPORTANT — prior policy state on user_documents:
--   No prior policies exist; this table is new.
-- ============================================================================

BEGIN;

-- TODO: human review of policy semantics — ensure service_role INSERT is
-- the right trust boundary; the upload route uses createClient() (user JWT)
-- not admin, so the INSERT policy is on authenticated role, not service_role.

CREATE TABLE IF NOT EXISTS public.user_documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type     TEXT        NOT NULL CHECK (document_type IN (
                                  'super_statement',
                                  'tax_return',
                                  'will',
                                  'insurance_policy',
                                  'bank_statement',
                                  'other'
                                )),
  file_name         TEXT        NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  file_path         TEXT        NOT NULL,
  file_size_bytes   BIGINT      NOT NULL CHECK (file_size_bytes > 0),
  mime_type         TEXT        NOT NULL,
  description       TEXT        CHECK (char_length(description) <= 500),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_documents IS
  'Metadata for investor document vault uploads. File bytes in private Supabase Storage bucket "user-documents".';

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id_created
  ON public.user_documents (user_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents FORCE ROW LEVEL SECURITY;

-- Owners can SELECT their own documents
DROP POLICY IF EXISTS "Owners can view own documents" ON public.user_documents;
CREATE POLICY "Owners can view own documents"
  ON public.user_documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owners can INSERT documents where user_id = their UID
DROP POLICY IF EXISTS "Owners can insert own documents" ON public.user_documents;
CREATE POLICY "Owners can insert own documents"
  ON public.user_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owners can DELETE their own documents
DROP POLICY IF EXISTS "Owners can delete own documents" ON public.user_documents;
CREATE POLICY "Owners can delete own documents"
  ON public.user_documents
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role explicit allow (auditability — shows intent in pg_policies)
DROP POLICY IF EXISTS "Service role full access user_documents" ON public.user_documents;
CREATE POLICY "Service role full access user_documents"
  ON public.user_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
