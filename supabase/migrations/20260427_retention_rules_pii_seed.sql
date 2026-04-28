-- Date: 2026-04-27
-- Audit: docs/audits/codebase-health-2026-04-24.md §7 (K-14)
-- Queue item: K-14
-- Why: The `retention_rules` table drives the `gdpr-retention-purge` cron, but
--   as of the 04-24 audit the table was empty in live — the cron ran daily and
--   did nothing. Without seed data the app has no enforceable data-retention
--   posture under the Australian Privacy Act 1988 (APP-12: destroy or de-identify
--   personal information no longer needed) or GDPR Article 5(1)(e) (storage
--   limitation). This migration seeds policies for the seven highest-PII tables.
--   It also adds FORCE ROW LEVEL SECURITY and an explicit service_role policy
--   (the original wave_7 migration only ran ENABLE RLS, leaving the table with
--   zero pg_policies entries — unclear intent for SOC 2 reviewers).
-- Idempotency: all INSERTs use ON CONFLICT DO NOTHING keyed on
--   (table_name, timestamp_column); DROP/CREATE policy uses IF EXISTS / IF NOT
--   EXISTS semantics; FORCE RLS is idempotent. Safe to re-apply.
-- Rollback: DELETE FROM public.retention_rules WHERE table_name IN
--   ('leads','email_otps','listing_enquiries','quiz_follow_ups',
--    'auth_attempts','admin_login_attempts','support_messages');
--   DROP POLICY IF EXISTS "service_role full access on retention_rules"
--     ON public.retention_rules;
--   ALTER TABLE public.retention_rules NO FORCE ROW LEVEL SECURITY;
--   (RLS remains enabled per the wave_7 intent; only the seeds + policy revert.)

-- IMPORTANT — prior policy state on retention_rules:
--   • RLS enabled:          20260415_wave_7_trust_ops.sql line 148
--   • FORCE RLS:            NOT SET (this migration adds it)
--   • No CREATE POLICY on this table in any prior migration.
--   Default-deny already applies to anon/authenticated roles because
--   RLS is enabled with no permissive policies. BYPASSRLS roles
--   (service_role) can access regardless of policy count.
--   Adding the explicit service_role ALLOW policy documents intent in
--   pg_policies for SOC 2 / Supabase security-advisor review.

BEGIN;

-- ── 1. Tighten RLS posture ────────────────────────────────────────────────────

ALTER TABLE public.retention_rules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access on retention_rules"
  ON public.retention_rules;
CREATE POLICY "service_role full access on retention_rules"
  ON public.retention_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 2. Seed PII table retention policies ─────────────────────────────────────
--
-- Retention windows follow the Privacy Act APP-12 principle of "not needed for
-- any purpose" plus reasonable business-use periods:
--   • 7 days  — auth/OTP codes (no business use after expiry)
--   • 90 days — security-audit logs (security-incident investigation window)
--   • 180 days— drip-state tables (drip campaign closes within 30 days)
--   • 730 days— PII lead / enquiry records (2-year commercial limitation period)
--   • 1095 days- support communication (3-year record-keeping for disputes)
--
-- NOTE: The anonymise strategy in gdpr-retention-purge only nulls the
--   email_column. For leads + listing_enquiries, user_name / user_phone remain
--   until a future cron enhancement nulls additional PII columns.
--   TODO: extend gdpr-retention-purge to accept a `pii_columns` array and null
--         all listed columns in a single UPDATE, not just email_column.
--
-- admin_login_attempts uses reset_at (lockout-expiry timestamp) rather than a
--   created_at column. Cutoff = now() - 7days means entries whose lockout
--   window expired more than 7 days ago are purged; active lockouts are kept.

INSERT INTO public.retention_rules
  (table_name, keep_days, strategy, email_column, timestamp_column, description)
VALUES
  (
    'leads',
    730,
    'anonymise',
    'user_email',
    'created_at',
    'Advisor + platform leads — anonymise email after 2 years (APP-12 / GDPR Art 5(1)(e)). user_name + user_phone still need manual extension to full anonymise.'
  ),
  (
    'email_otps',
    7,
    'delete',
    NULL,
    'created_at',
    'Short-lived OTP codes — delete after 7 days (codes expire within minutes; no business use beyond that).'
  ),
  (
    'listing_enquiries',
    730,
    'anonymise',
    'user_email',
    'created_at',
    'Investment listing enquiries (name, email, phone, message) — anonymise email after 2 years.'
  ),
  (
    'quiz_follow_ups',
    180,
    'delete',
    NULL,
    'created_at',
    'Drip-email dedup state — delete after 180 days (drip window closes by day 30; 150d safety margin).'
  ),
  (
    'auth_attempts',
    90,
    'delete',
    NULL,
    'created_at',
    'Auth-attempt security log (email + ip_hash) — delete after 90 days (covers security-incident investigation window).'
  ),
  (
    'admin_login_attempts',
    7,
    'delete',
    NULL,
    'reset_at',
    'Admin rate-limit state — delete rows where lockout window (reset_at) expired more than 7 days ago.'
  ),
  (
    'support_messages',
    1095,
    'delete',
    NULL,
    'created_at',
    'Support ticket messages (sender_name, message text) — delete after 3 years (dispute/record-keeping window).'
  )
ON CONFLICT (table_name, timestamp_column) DO NOTHING;

COMMIT;
