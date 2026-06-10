-- ============================================================================
-- Migration: Enable RLS on leads
-- Date: 2026-04-26 (queued under 20260601_ to sort after existing lead work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (P0 — RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md B-02
--
-- Why: `leads` stores PII (user_email, user_name, user_phone,
-- user_location_state, user_intent JSONB) for advisor-quiz and platform-lead
-- submissions. The base migration (20260316_create_leads_table.sql) created
-- the table without enabling RLS, so by default Postgres permits anon access
-- via the Supabase REST endpoint — a PII enumeration vector.
--
-- All three call sites (verified 2026-04-26 via
-- `grep -rln "from('leads')" app/`) use the service-role admin client:
--   - app/api/submit-lead/route.ts
--   - app/api/submit-lead/confirm/route.ts
--   - app/api/cron/confirm-lead-notify/route.ts
-- Service-role bypasses RLS, so this change is safe — it only closes the
-- implicit anon read/write hole.
--
-- Policy: deny anon + authenticated (no user-facing reads of leads — the
-- submitter does not authenticate; an admin UI would use service-role).
-- Service-role explicit allow for auditability in pg_policies.
--
-- Idempotent: ENABLE ROW LEVEL SECURITY is a no-op if already enabled, and
-- policies use DROP IF EXISTS + CREATE so reruns succeed.
--
-- Rollback:
--   DROP POLICY IF EXISTS "service_role full access" ON leads;
--   ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
-- ============================================================================

BEGIN;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner connections, so admin-style misconfig
-- doesn't accidentally re-open the table.
ALTER TABLE leads FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing policies (this migration is the source of truth).
DROP POLICY IF EXISTS "service_role full access" ON leads;
DROP POLICY IF EXISTS "anon read leads" ON leads;
DROP POLICY IF EXISTS "authenticated read leads" ON leads;

-- Service-role explicit allow. Service-role bypasses RLS regardless, but an
-- explicit policy makes intent visible in pg_policies for auditing.
CREATE POLICY "service_role full access"
  ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No policy granted to anon or authenticated — RLS denies all access by
-- default when no permissive policy applies. The /api/submit-lead{,/confirm}
-- and /api/cron/confirm-lead-notify routes use the service-role client, which
-- is the only intended caller. If a future authenticated admin UI is added,
-- it must explicitly add a SELECT policy for the admin role / claim.

-- TODO: human review of policy semantics — confirm no authenticated admin UI
-- needs direct anon-key reads. If yes, add a JWT-claim-based read policy
-- (e.g., USING (auth.jwt() ->> 'role' = 'admin')) in a follow-up migration.

COMMIT;
