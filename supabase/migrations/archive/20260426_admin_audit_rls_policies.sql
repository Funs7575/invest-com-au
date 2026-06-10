-- ============================================================
-- Admin/audit RLS policies (O-01, iter 3)
--
-- Source: 04-26 audit §4.4.1 — `rls_enabled_no_policy` advisor
-- finding. Iter 3 of the user-data class. Tables in scope are the
-- admin/audit cluster — backoffice + compliance bookkeeping
-- tables that have NO legitimate user-facing read path:
--
--   1. public.admin_action_log         (per-admin action trail)
--   2. public.admin_mfa_enrollments    (TOTP secrets + recovery hashes)
--   3. public.financial_audit_log      (money-movement append-only log)
--   4. public.login_attempts           (per-email brute-force counter)
--
-- All four were RLS-enabled at creation (in `20260413_automation_
-- wave_2.sql`, `20260414_wave_3_trust_compliance.sql`, and
-- `20260415_wave_10_critical_gaps.sql`) but no policies were
-- added, so non-service-role reads/writes were silently denied.
-- All current callers go through service-role admin clients
-- (admin dashboard, compliance crons, login throttle) which
-- bypass RLS — so this migration changes ZERO current behaviour.
--
-- Policy choice: `service_role FOR ALL` on each table, NOTHING
-- for `authenticated` or `anon`. Reasoning:
--
--   - admin_action_log: per-admin trail; no user should ever read
--     it. Even other admins read via service-role-mediated APIs
--     so a per-row admin_email scope adds zero security and
--     would forbid admin dashboards from showing the team-wide
--     view.
--
--   - admin_mfa_enrollments: contains encrypted TOTP secrets +
--     SHA-256 recovery hashes. Even revealing the row presence
--     leaks "this admin has MFA enrolled" — useful intel for an
--     attacker. Service-role-only is the right answer; the MFA
--     verification flow already runs server-side.
--
--   - financial_audit_log: append-only money-movement log used
--     for compliance reconciliation + ASIC audits. Read access
--     is admin-dashboard only via service role; writes are by
--     the wallet/payment crons and the Stripe webhook handler
--     (also service role).
--
--   - login_attempts: rate-limit counters keyed by email. The
--     login flow itself reads/writes via service role from
--     `lib/login-lockout.ts`. No user-facing read path.
--
-- Pattern verified via prior-policy gate (per REMEDIATION_DEFAULTS
-- §"Verification gates" — added after the iter-7 B-05 stack-up
-- where a legacy permissive policy survived an incomplete DROP):
--
--   $ grep -nE 'POLICY.*(admin_action_log|admin_mfa_enrollments|
--               financial_audit_log|login_attempts)' \
--           supabase/migrations/*.sql
--
-- → only match was `admin_login_attempts` (a DIFFERENT table from
-- 20260310, already has a service-role-only policy). Our four
-- targets are clean ground.
--
-- Tested via the Supabase advisor: after this migration the
-- `rls_enabled_no_policy` finding count drops from 52 (post iter
-- 1+2) → 48.
--
-- Idempotent (DROP POLICY IF EXISTS + CREATE POLICY). Safe to
-- re-apply on the live DB.
--
-- Rollback (operator-only):
--   DROP POLICY IF EXISTS "service_role full access" ON public.admin_action_log;
--   DROP POLICY IF EXISTS "service_role full access" ON public.admin_mfa_enrollments;
--   DROP POLICY IF EXISTS "service_role full access" ON public.financial_audit_log;
--   DROP POLICY IF EXISTS "service_role full access" ON public.login_attempts;
--   Tables remain RLS-enabled with no policies — same default-deny
--   state they were in before this migration.
-- ============================================================

DROP POLICY IF EXISTS "service_role full access" ON public.admin_action_log;
CREATE POLICY "service_role full access" ON public.admin_action_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.admin_mfa_enrollments;
CREATE POLICY "service_role full access" ON public.admin_mfa_enrollments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.financial_audit_log;
CREATE POLICY "service_role full access" ON public.financial_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.login_attempts;
CREATE POLICY "service_role full access" ON public.login_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
