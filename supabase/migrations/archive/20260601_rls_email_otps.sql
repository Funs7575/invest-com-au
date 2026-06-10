-- ============================================================================
-- Migration: Enable RLS on email_otps
-- Date: 2026-04-26 (queued under 20260601_ to sort after existing RLS work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (P0 — RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md B-01
--
-- Why: email_otps stores 6-digit verification codes keyed by email. The base
-- migration (20260316_email_otps.sql) created the table without enabling RLS,
-- so by default Postgres permits anon access via the Supabase REST endpoint.
-- That is a credentials-leakage vector — anyone could enumerate active OTPs.
--
-- Both call sites (app/api/verify-otp/send and app/api/verify-otp/verify) use
-- the service-role admin client, which bypasses RLS. Enabling RLS with a
-- deny-all policy for anon + authenticated therefore does NOT break those
-- routes; it only closes the implicit anon read/write hole.
--
-- Idempotent: ENABLE ROW LEVEL SECURITY is a no-op if already enabled, and
-- policies use DROP IF EXISTS + CREATE so reruns succeed.
--
-- Rollback:
--   DROP POLICY IF EXISTS "service_role full access" ON email_otps;
--   ALTER TABLE email_otps DISABLE ROW LEVEL SECURITY;
-- ============================================================================

BEGIN;

ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner connections, so admin-style misconfig
-- doesn't accidentally re-open the table.
ALTER TABLE email_otps FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing policies (this migration is the source of truth).
DROP POLICY IF EXISTS "service_role full access" ON email_otps;
DROP POLICY IF EXISTS "anon read own otp" ON email_otps;
DROP POLICY IF EXISTS "authenticated read own otp" ON email_otps;

-- Service-role explicit allow. Service-role bypasses RLS regardless, but an
-- explicit policy makes intent visible in pg_policies for auditing.
CREATE POLICY "service_role full access"
  ON email_otps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No policy granted to anon or authenticated — RLS denies all access by
-- default when no permissive policy applies. The /api/verify-otp/{send,verify}
-- routes use the service-role client, which is the only intended caller.

-- TODO: human review — confirm no future client-side code path needs to
-- read email_otps directly. If it does, add a narrowly-scoped policy keyed
-- on auth.jwt() ->> 'email' = email AND used_at IS NULL AND now() < expires_at.

COMMIT;
