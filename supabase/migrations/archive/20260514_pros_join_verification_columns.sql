-- ============================================================================
-- Migration: 20260514_pros_join_verification_columns.sql
-- Purpose: Add provider-marketplace verification columns to professionals so
--          /pros/join can store the wizard submission + admin queue can flip
--          to verified once credentials are sighted.
--
-- Why: existing professionals.status uses ('active','inactive','pending') for
-- listing visibility, and professionals.verified is a single bool that doesn't
-- distinguish "submitted, awaiting review" from "rejected" or "suspended". The
-- expert_teams table (20260723_pmp01) already uses a verification_status enum
-- + accepts_briefs flag pattern — this migration mirrors that on professionals
-- so the Match Request router treats both target kinds identically.
--
-- Idempotency: ADD COLUMN IF NOT EXISTS + DROP/ADD CONSTRAINT. Safe to re-run.
--
-- Rollback (destructive):
--   ALTER TABLE public.professionals
--     DROP CONSTRAINT IF EXISTS professionals_verification_status_check,
--     DROP COLUMN IF EXISTS verification_status,
--     DROP COLUMN IF EXISTS accepts_briefs,
--     DROP COLUMN IF EXISTS verification_doc_url,
--     DROP COLUMN IF EXISTS payout_bsb,
--     DROP COLUMN IF EXISTS payout_account_last4;
--
-- Risk: low — additive only, defaults preserve current behaviour. The
-- check-constraint is added after defaulting all existing rows so the ALTER
-- never trips on legacy data.
-- ============================================================================

BEGIN;

-- New columns — all nullable / defaulted so existing rows survive the add.
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS accepts_briefs boolean NOT NULL DEFAULT false;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS verification_doc_url text;

-- Payout split: BSB stored in full (not sensitive on its own), account number
-- stored only as last4. The full account number is never persisted in our DB —
-- Stripe Connect / wise / manual ops carry the rest off-platform.
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS payout_bsb text;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS payout_account_last4 text;

-- Bring legacy rows into a known-good state before constraining. Rows that
-- already had `verified=true` get promoted to 'verified'; everything else
-- stays at the default 'pending'.
UPDATE public.professionals
   SET verification_status = 'verified'
 WHERE verified = true
   AND verification_status = 'pending';

UPDATE public.professionals
   SET accepts_briefs = true
 WHERE verified = true
   AND status = 'active'
   AND accepts_briefs = false;

-- Add the check constraint last so the UPDATEs above don't have to satisfy it.
ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_verification_status_check;
ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_verification_status_check
  CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'));

-- Index for the admin queue: pending submissions, newest first.
CREATE INDEX IF NOT EXISTS idx_professionals_verification_pending
  ON public.professionals (verification_status, created_at DESC)
  WHERE verification_status = 'pending';

-- RLS reminder: professionals already has ENABLE ROW LEVEL SECURITY (see
-- 20260305_create_advisor_directory.sql). No new policies required — admin
-- routes call createAdminClient() (service_role) for queue operations, and
-- public read-active policy (`status = 'active'`) hides pending rows from
-- anon visitors.

-- ── Verification doc storage bucket ───────────────────────────────────────
-- Private bucket: pre-auth wizard uploads land here. Anonymous reads MUST be
-- denied — admin queue previews go through signed URLs (createSignedUrl). The
-- existing `advisor-kyc` bucket is keyed by professional_id which doesn't
-- exist yet at /pros/join time, so we introduce a separate bucket scoped to
-- the wizard.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pro-verification-docs',
  'pro-verification-docs',
  false,
  10485760, -- 10MB — bigger than photos because PDFs run larger
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Service-role-only access. No public-read or anon-insert policies — the
-- /api/pros/join/upload route uses createAdminClient() and returns a storage
-- path; admin queue route mints signed URLs for preview.
DROP POLICY IF EXISTS "Service role can manage pro verification docs"
  ON storage.objects;
CREATE POLICY "Service role can manage pro verification docs"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'pro-verification-docs')
  WITH CHECK (bucket_id = 'pro-verification-docs');

COMMIT;
