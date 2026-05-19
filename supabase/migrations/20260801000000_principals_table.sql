-- ============================================================================
-- Migration: 20260801000000_principals_table.sql
-- Purpose: Foundation for unified identity model. A `principal` is anything
--          that can ACT in the system and leave audit trail. Initial scope:
--          humans (auth.users-backed) for the 5 existing account kinds, and
--          partner_orgs (no auth.users) for sponsors / commercial-partner
--          metadata rows. Designed to extend to agents / internal_team /
--          regulatory_representative kinds in a future migration without
--          schema rework.
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 0 — Session 0.1.
-- Risk: low — additive table; no existing data touched.
-- Rollback:
--   BEGIN;
--     DROP TRIGGER IF EXISTS principals_updated_at ON public.principals;
--     DROP TABLE IF EXISTS public.principals CASCADE;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.principals (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind            text NOT NULL CHECK (kind IN ('human','partner_org')),
  -- NULL for partner_org kind today. Will be NULL for future agent /
  -- internal_team / regulatory_representative principals where there's no
  -- corresponding auth.users row. PostgreSQL UNIQUE permits multiple NULL
  -- values, so the unique constraint below remains correct for those kinds.
  auth_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name    text NOT NULL CHECK (length(display_name) > 0),
  slug            text UNIQUE,
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','suspended','retired','pending')),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT principals_auth_user_unique UNIQUE (auth_user_id)
);

CREATE INDEX IF NOT EXISTS idx_principals_kind ON public.principals (kind);
CREATE INDEX IF NOT EXISTS idx_principals_status_active
  ON public.principals (status) WHERE status = 'active';

ALTER TABLE public.principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.principals FORCE ROW LEVEL SECURITY;

-- Humans read only their own principal row. Partner_orgs are admin-managed
-- and never accessed via authenticated session — service_role policy below
-- handles all reads on those rows.
DROP POLICY IF EXISTS "human reads own principal" ON public.principals;
CREATE POLICY "human reads own principal"
  ON public.principals FOR SELECT
  TO authenticated
  USING (kind = 'human' AND auth_user_id = auth.uid());

DROP POLICY IF EXISTS "service_role full access principals" ON public.principals;
CREATE POLICY "service_role full access principals"
  ON public.principals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Reuse the shared updated_at trigger function (created by
-- 20260305_create_advisor_directory.sql and reused across every table).
CREATE TRIGGER principals_updated_at
  BEFORE UPDATE ON public.principals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
