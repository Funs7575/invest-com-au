-- ============================================================================
-- Migration: C-DISC-20260430-03 — lead_disputes RLS hardening
-- Date: 2026-04-30
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md C-DISC-20260430-03
--
-- Why:
--   `lead_disputes` has no RLS. Dispute records contain advisor PII (reason
--   code, dispute details, billing_id, credit refund amounts). Without RLS
--   any caller with the anon PostgREST key can enumerate all disputes — a
--   breach of confidentiality between competing advisors.
--
--   The table was created outside migrations history (earliest reference is
--   20260413_advisor_lead_dispute_auto_resolve.sql which only adds columns and
--   constraints, implying the table pre-existed via Supabase dashboard).
--   This migration is the first time RLS is enabled on lead_disputes.
--
-- Verified callers (grep app/ lib/):
--   - app/api/advisor-auth/disputes/route.ts  SELECT+INSERT via createAdminClient()
--   - lib/advisor-lead-dispute-resolver.ts    SELECT+UPDATE via createAdminClient()
--   - app/api/cron/auto-resolve-disputes/     SELECT+UPDATE via createAdminClient()
--   - app/api/admin/**                        SELECT+UPDATE via createAdminClient()
--   All callers use the admin client (service-role key, BYPASSRLS privilege).
--   Enabling RLS does not break any existing caller.
--
-- IMPORTANT — prior policy state on lead_disputes:
--   None. This migration is the first RLS activation on this table.
--
-- Idempotent:
--   ENABLE/FORCE ROW LEVEL SECURITY are no-ops if already set.
--   DROP POLICY IF EXISTS + CREATE is idempotent.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Advisor can view own disputes" ON lead_disputes;
--   DROP POLICY IF EXISTS "service_role full access disputes" ON lead_disputes;
--   ALTER TABLE lead_disputes NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE lead_disputes DISABLE ROW LEVEL SECURITY;
-- ============================================================================

BEGIN;

ALTER TABLE lead_disputes ENABLE ROW LEVEL SECURITY;

-- FORCE RLS so the table owner cannot bypass.
ALTER TABLE lead_disputes FORCE ROW LEVEL SECURITY;

-- Service-role explicit allow (makes intent visible in pg_policies).
-- The admin client (service_role key) has BYPASSRLS and does not need this
-- policy to function, but without it pg_policies shows no service_role entry
-- which obscures the intended access pattern for auditors.
DROP POLICY IF EXISTS "service_role full access disputes" ON lead_disputes;
CREATE POLICY "service_role full access disputes"
  ON lead_disputes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Advisor self-scoped SELECT: Supabase Auth advisors can read their own
-- dispute records. professional_id links to professionals.auth_user_id;
-- there is no direct auth.uid() column on lead_disputes. Cookie-session
-- advisors (no auth.uid()) remain on the admin client path in disputes/route.ts.
DROP POLICY IF EXISTS "Advisor can view own disputes" ON lead_disputes;
CREATE POLICY "Advisor can view own disputes"
  ON lead_disputes
  FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- No anon INSERT/UPDATE/DELETE — disputes are created and resolved exclusively
-- by the advisor portal (admin client) and cron jobs (admin client).
-- Advisors INSERT disputes via disputes/route.ts which uses admin client scoped
-- by advisorId — no direct INSERT policy for authenticated role is needed.

-- TODO: human review of policy semantics — lead_disputes has no direct
-- auth.uid() column; ownership is inferred via the professionals join.
-- Confirm no cross-advisor dispute exposure is possible (it cannot: a given
-- auth.uid() maps to exactly one professionals.id via auth_user_id, so the
-- subquery is bounded to a single advisor's rows).

COMMIT;
