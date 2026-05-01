-- ============================================================================
-- Migration: C-02 step 3 — advisor data tables RLS (professional_leads,
--            advisor_billing)
-- Date: 2026-04-30
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (RLS gaps, admin-scope)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md C-02
--
-- Why:
--   The advisor dashboard route (app/api/advisor-auth/data/route.ts) queries
--   four tables to populate the advisor portal. Two of them lack a SELECT
--   policy for the authenticated role, causing silent empty results when
--   called via the Supabase Auth server client (createClient()):
--
--   1. professional_leads — RLS is enabled (from 20260305) but only has an
--      INSERT policy and a service_role ALL policy. No SELECT policy exists
--      for authenticated advisors reading their own leads. The data route
--      currently works around this by using createAdminClient() scoped by
--      professional_id (applied in C-02 step 2); this migration adds the
--      RLS foundation so Supabase Auth advisors can eventually use
--      createClient() for this query.
--
--   2. advisor_billing — No RLS at all (table was created outside migrations
--      history; only an index-creation reference exists in
--      20260309_security_and_performance_fixes.sql). Without RLS, billing
--      records are accessible via PostgREST to any caller with the anon key.
--      This migration enables RLS, locks down anon access, and adds
--      advisor-scoped SELECT so Supabase Auth advisors can read their own
--      billing rows.
--
-- Verified callers (grep app/ lib/):
--   professional_leads:
--     - app/api/advisor-auth/data/route.ts     SELECT+UPDATE via createAdminClient()
--     - app/api/submit-lead/route.ts           INSERT via createClient() (anon INSERT policy covers this)
--     - app/api/advisor-lead/route.ts          INSERT via createClient()
--     - app/api/advisor-auth/disputes/route.ts SELECT via createAdminClient()
--     - lib/email-notifications.ts             SELECT via createAdminClient()
--     - cron routes                            SELECT via createAdminClient()
--   advisor_billing:
--     - app/api/advisor-auth/data/route.ts     SELECT via createAdminClient()
--     - app/api/advisor-auth/topup/route.ts    INSERT/UPDATE via createAdminClient()
--     - app/api/stripe/webhook/route.ts        INSERT/UPDATE via createAdminClient()
--     - cron/auto-resolve-disputes             SELECT via createAdminClient()
--   All call sites use admin client today — RLS does not break them.
--   The policies here lay the foundation for a future createClient() switch
--   for Supabase Auth paths.
--
-- IMPORTANT — prior policy state on professional_leads:
--   "Anyone can submit leads"   — INSERT, TO anon+authenticated (20260305,
--                                  recreated in 20260309 with stricter check)
--   "Admins full access leads"  — ALL, USING auth.users role='admin' (20260305)
--   No SELECT policy → this migration adds the first SELECT policy.
--
-- IMPORTANT — prior policy state on advisor_billing:
--   None (table has no RLS history in migrations). This migration is the
--   first time RLS is enabled on this table.
--
-- Idempotent:
--   ENABLE/FORCE ROW LEVEL SECURITY are no-ops if already set.
--   DROP POLICY IF EXISTS + CREATE is idempotent.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Advisor can view own leads" ON professional_leads;
--   DROP POLICY IF EXISTS "Advisor can view own billing" ON advisor_billing;
--   DROP POLICY IF EXISTS "service_role full access billing" ON advisor_billing;
--   ALTER TABLE advisor_billing NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE advisor_billing DISABLE ROW LEVEL SECURITY;
-- ============================================================================

BEGIN;

-- ─── professional_leads: add advisor self-scoped SELECT policy ───────────────

-- Prior policies (kept, not dropped):
--   "Anyone can submit leads"  (INSERT, anon+authenticated)
--   "Admins full access leads" (ALL, admin-role check)
--
-- New: advisors can SELECT their own leads via Supabase Auth session.
-- professional_id links to professionals.auth_user_id via the professionals
-- table. Cookie-session advisors (no auth.uid()) remain on the admin client
-- path (app-layer advisorId scoping in data/route.ts).

DROP POLICY IF EXISTS "Advisor can view own leads" ON professional_leads;
CREATE POLICY "Advisor can view own leads"
  ON professional_leads
  FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- TODO: human review of policy semantics — professional_leads has no direct
-- auth.uid() column; the join through professionals.auth_user_id is the
-- only linkage. Confirm that the professionals.auth_user_id → leads join
-- cannot be exploited to expose another advisor's leads (it cannot: the
-- SELECT returns only rows where professional_id matches an advisor whose
-- auth_user_id equals the caller's uid).

-- ─── advisor_billing: enable RLS and add advisor + service_role policies ─────

ALTER TABLE advisor_billing ENABLE ROW LEVEL SECURITY;

-- FORCE RLS so the table owner cannot bypass. Service_role has BYPASSRLS
-- privilege in Supabase (set by the platform) so FORCE RLS does not affect
-- the admin client, but the explicit policy below makes intent visible in
-- pg_policies for auditors.
ALTER TABLE advisor_billing FORCE ROW LEVEL SECURITY;

-- Service-role explicit allow (auditability — intent visible in pg_policies).
-- The admin client (service_role key) has BYPASSRLS and does not need this
-- policy to function, but without it pg_policies shows no service_role entry
-- which obscures the intended access pattern.
DROP POLICY IF EXISTS "service_role full access billing" ON advisor_billing;
CREATE POLICY "service_role full access billing"
  ON advisor_billing
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Advisor self-scoped SELECT: Supabase Auth advisors can read their own
-- billing rows (statements, invoices, balances) via the advisory portal.
-- professional_id links to professionals.auth_user_id. No anon SELECT —
-- billing data is confidential.
DROP POLICY IF EXISTS "Advisor can view own billing" ON advisor_billing;
CREATE POLICY "Advisor can view own billing"
  ON advisor_billing
  FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- No anon INSERT/UPDATE/DELETE — billing records are created and updated
-- exclusively by the admin client (Stripe webhook, topup flow, cron jobs).

-- TODO: human review of policy semantics — advisor_billing has no direct
-- auth.uid() column; ownership is inferred via the professionals join.
-- Confirm no cross-advisor billing data exposure is possible (it cannot:
-- a given auth.uid() maps to exactly one professionals.id via auth_user_id,
-- so the subquery is bounded to a single advisor's rows).

COMMIT;
