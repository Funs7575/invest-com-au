-- ============================================================================
-- Migration: Backfill public.international_leads (A-02 batch 2)
-- Date:      2026-05-01 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02 schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `international_leads` is declared in `lib/database.types.ts` (line 6988)
--   and is referenced via FK from `professional_leads` via
--   `international_leads_professional_lead_id_fkey` (types line 7027), but the
--   migration tree has no CREATE TABLE for it. A FK index was added by
--   `20260426_add_missing_fk_indexes.sql:41` on professional_lead_id, which
--   assumes the column and table already exist.
--
--   This migration adds the table to the migration tree so a clean rebuild
--   produces a schema that matches lib/database.types.ts.
--
-- Verified callers (grep app/ lib/)
--   None found — international_leads has no direct `from("international_leads")`
--   call sites in app/ or lib/. The table is referenced only via the FK in
--   professional_leads and appears to be populated out-of-band (e.g., a
--   separate intake flow or import). All access is expected to go through
--   admin-client code (service_role), bypassing RLS.
--
-- RLS policy chosen — service_role-only (deny all anon/authenticated)
--   No anon or authenticated policies are created because:
--   - No authenticated app-layer caller exists.
--   - The table contains investor PII (country, visa type, estimated AUD, etc.).
--   - Any future app-layer caller should use the admin client (service_role).
--   Service-role explicit policy is added for audit visibility in pg_policies.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing table.
--   - ENABLE/FORCE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY — idempotent reruns.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.international_leads;
--     ALTER TABLE public.international_leads NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE public.international_leads DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.international_leads; -- only on clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.international_leads (
  id                        serial        PRIMARY KEY,
  investor_country          text          NOT NULL,
  investor_type             text          NOT NULL,
  professional_lead_id      integer       REFERENCES public.professional_leads(id),
  estimated_investment_aud  numeric,
  investment_type           text,
  language_preference       text,
  requires_firb             boolean,
  visa_type                 text,
  created_at                timestamptz   DEFAULT now()
);

ALTER TABLE public.international_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_leads FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.international_leads;

-- Service-role explicit allow. Admin client (service_role) bypasses RLS
-- regardless; explicit policy makes intent visible in pg_policies for auditors.
CREATE POLICY "service_role full access"
  ON public.international_leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TODO: human review of policy semantics — no authenticated or anon policies
-- are created because no app-layer caller was found at migration-write time.
-- If a future caller is added using createClient() / the authenticated role,
-- a scoped policy must be added here.

COMMIT;
