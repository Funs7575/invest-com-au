-- ============================================================================
-- Migration: 20260521_buildfix_rls_overopen.sql
-- Date:      2026-05-21
-- Queue ref: BB build-fix — over-open RLS remediation (C4, C5, C6 a–d)
--
-- Why: Six security findings where row-level security or grants were
--   effectively PUBLIC, so anyone holding the public anon key (not just an
--   admin behind proxy.ts / a logged-in owner) could read or write data via
--   Supabase REST:
--
--   C4  site_ab_tests             — "Admin manage ab tests" was FOR ALL
--                                    USING (true) with NO `TO` clause, so it
--                                    defaulted to PUBLIC: anon could
--                                    INSERT/UPDATE/DELETE A/B tests.
--                                    (src: 20260408_tier1_revenue_features.sql L90-91)
--   C5  affiliate_monthly_reports — "Admin read reports" (SELECT USING true)
--                                    and "Service write reports" (FOR ALL
--                                    USING true), both no `TO` clause → PUBLIC.
--                                    Anon could read revenue / CPA / EPC data
--                                    and write bogus rows.
--                                    (src: 20260408_tier1_revenue_features.sql L61-63)
--   C6a outbound_webhook_endpoints.signing_secret
--                                  — "owners see own endpoints" (SELECT TO
--                                    authenticated) returns ALL columns, so an
--                                    owner reading their row via the anon key
--                                    sees the HMAC signing_secret in plaintext.
--                                    (src: 20260515_mm26_outbound_webhooks_and_nz.sql L41-57)
--   C6b startup_profiles          — "startup_profiles_anon_read_active"
--                                    (SELECT USING status='active', no `TO`)
--                                    is PUBLIC and exposes every column,
--                                    including the internal ESIC reviewer
--                                    identity (esic_verified_by / _at).
--                                    (src: 20260729_sp02_startup_portal_schema.sql L66-73)
--   C6c startup_rounds            — "startup_rounds_anon_read_public"
--                                    (SELECT USING status IN (...), no `TO`)
--                                    is PUBLIC and exposes financial terms
--                                    (valuation cap, discount, interest rate,
--                                    ticket sizes, lead investor).
--                                    (src: 20260729_sp02_startup_portal_schema.sql L121-127)
--   C6d firm_credit_balance_summary
--                                  — view GRANT SELECT TO authenticated lets
--                                    ANY logged-in user read EVERY firm's
--                                    aggregate credit / spend balances; the
--                                    view has no per-firm row filter (intended
--                                    to be read via service-role only).
--                                    (src: 20260728_w423_firm_billing_summary.sql L52)
--
-- There is no RLS-distinguishable "admin" role in this schema — admin gating
-- is edge-only (proxy.ts + ADMIN_EMAILS). So `authenticated` cannot stand in
-- for "admin"; the secure scope for admin-only / revenue / cross-firm data is
-- service_role, mirroring 20260611100000_a05_batch1_agent_ops_rls_hardening.sql.
--
-- ── APP IMPACT (no app code changed in this migration — security gain) ──
--   * app/admin/ab-tests/page.tsx writes site_ab_tests via the *anon* browser
--     client (createClient). After this migration those writes are denied.
--     They must move to a service-role app/api/admin/* route (out of scope here).
--     The public anon SELECT of *running* tests (HomeHeroCTA, CompareClient) is
--     PRESERVED — those components only read status='running' rows.
--   * app/admin/affiliate-dashboard/page.tsx reads affiliate_monthly_reports via
--     the anon browser client. After this migration that read is denied and must
--     move to a service-role route (out of scope here). The cron writer
--     (app/api/cron/monthly-affiliate-report) already uses service-role — unaffected.
--   * Webhook code paths (lib/outbound-webhooks/index.ts, the advisor-portal
--     route) all use createAdminClient() (service-role) — column REVOKE does not
--     affect service-role. Owners can still SELECT their endpoints (all columns
--     except signing_secret) via the unchanged owner policy.
--   * firm-portal billing reads firm_credit_balance_summary via service-role
--     server handlers — unaffected.
--
-- Idempotency: DROP POLICY IF EXISTS (no-op if absent); ALTER TABLE … FORCE /
--   ENABLE ROW LEVEL SECURITY is idempotent; CREATE POLICY guarded by a
--   pg_policies existence check; REVOKE on an absent privilege is a no-op;
--   GRANT re-asserts the post-state. Safe to re-run.
--
-- Rollback (restore original over-open state — NOT recommended):
--   site_ab_tests:
--     ALTER TABLE public.site_ab_tests NO FORCE ROW LEVEL SECURITY;
--     DROP POLICY IF EXISTS "site_ab_tests_service_role_all" ON public.site_ab_tests;
--     DROP POLICY IF EXISTS "site_ab_tests_public_read_running" ON public.site_ab_tests;
--     CREATE POLICY "Admin manage ab tests" ON public.site_ab_tests FOR ALL USING (true);
--   affiliate_monthly_reports:
--     ALTER TABLE public.affiliate_monthly_reports NO FORCE ROW LEVEL SECURITY;
--     GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_monthly_reports TO anon, authenticated;
--     DROP POLICY IF EXISTS "affiliate_monthly_reports_service_role_all" ON public.affiliate_monthly_reports;
--     CREATE POLICY "Admin read reports" ON public.affiliate_monthly_reports FOR SELECT USING (true);
--     CREATE POLICY "Service write reports" ON public.affiliate_monthly_reports FOR ALL USING (true);
--   outbound_webhook_endpoints:
--     ALTER TABLE public.outbound_webhook_endpoints NO FORCE ROW LEVEL SECURITY;
--     GRANT SELECT ON public.outbound_webhook_endpoints TO anon, authenticated;
--   startup_profiles:
--     ALTER TABLE public.startup_profiles NO FORCE ROW LEVEL SECURITY; -- (already FORCE in source)
--     GRANT SELECT ON public.startup_profiles TO anon, authenticated;
--   startup_rounds:
--     DROP POLICY IF EXISTS "startup_rounds_authed_read_public" ON public.startup_rounds;
--     CREATE POLICY "startup_rounds_anon_read_public" ON public.startup_rounds
--       FOR SELECT USING (status IN ('open','committed','closed'));
--   firm_credit_balance_summary:
--     GRANT SELECT ON public.firm_credit_balance_summary TO authenticated;
--
-- Risk: medium — intentionally revokes anon/authenticated access that the two
--   admin pages currently (insecurely) rely on. See APP IMPACT above.
-- ============================================================================

BEGIN;

-- ── C4. site_ab_tests ───────────────────────────────────────────────────────
-- Source over-open policy: "Admin manage ab tests" FOR ALL USING (true)
--   (20260408_tier1_revenue_features.sql L90-91) — no TO clause ⇒ PUBLIC.
-- Replace with: service_role full access + a tightened public SELECT limited
-- to running tests (the only rows HomeHeroCTA / CompareClient ever read).
DROP POLICY IF EXISTS "Admin manage ab tests" ON public.site_ab_tests;

ALTER TABLE public.site_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ab_tests FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_ab_tests'
      AND policyname = 'site_ab_tests_service_role_all'
  ) THEN
    CREATE POLICY "site_ab_tests_service_role_all"
      ON public.site_ab_tests
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Preserve the legitimate public read of *running* tests only (variant
  -- assignment). No write access for anon/authenticated.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_ab_tests'
      AND policyname = 'site_ab_tests_public_read_running'
  ) THEN
    CREATE POLICY "site_ab_tests_public_read_running"
      ON public.site_ab_tests
      FOR SELECT
      TO anon, authenticated
      USING (status = 'running');
  END IF;
END $$;

-- ── C5. affiliate_monthly_reports ───────────────────────────────────────────
-- Source over-open policies (20260408_tier1_revenue_features.sql L61-63):
--   "Admin read reports"  FOR SELECT USING (true)  — no TO ⇒ PUBLIC read.
--   "Service write reports" FOR ALL  USING (true)  — no TO ⇒ PUBLIC write.
-- Revenue / CPA / EPC data: restrict entirely to service_role. The admin
-- dashboard must read via a service-role route (out of scope). The cron
-- writer already uses service-role.
DROP POLICY IF EXISTS "Admin read reports"   ON public.affiliate_monthly_reports;
DROP POLICY IF EXISTS "Service write reports" ON public.affiliate_monthly_reports;

-- Belt-and-braces: a PUBLIC USING(true) FOR ALL policy also exercised the
-- table-level grants anon/authenticated hold by default. Revoke them so no
-- residual REST access remains even if a permissive policy is re-added.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.affiliate_monthly_reports FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.affiliate_monthly_reports FROM authenticated;

ALTER TABLE public.affiliate_monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_monthly_reports FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'affiliate_monthly_reports'
      AND policyname = 'affiliate_monthly_reports_service_role_all'
  ) THEN
    CREATE POLICY "affiliate_monthly_reports_service_role_all"
      ON public.affiliate_monthly_reports
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ── C6a. outbound_webhook_endpoints.signing_secret ──────────────────────────
-- The "owners see own endpoints" SELECT policy
--   (20260515_mm26_outbound_webhooks_and_nz.sql L41-57) is correctly scoped
-- TO authenticated, but it returns every column — including the plaintext HMAC
-- signing_secret. Exclude that one column from the anon/authenticated SELECT
-- privilege (column-level grant, same pattern as
-- 20260517_w2_17_premium_content_column_grants.sql). The row policy is
-- unchanged, so owners still see their own rows — minus signing_secret.
-- service_role retains full access (column grants do not constrain it) so
-- lib/outbound-webhooks/index.ts (createAdminClient) keeps working.
REVOKE SELECT ON public.outbound_webhook_endpoints FROM anon;
REVOKE SELECT ON public.outbound_webhook_endpoints FROM authenticated;

GRANT SELECT (
  id,
  owner_kind,
  owner_id,
  url,
  event_subscriptions,
  enabled,
  last_success_at,
  last_failure_at,
  failure_count,
  created_at,
  updated_at
) ON public.outbound_webhook_endpoints TO anon, authenticated;

ALTER TABLE public.outbound_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_webhook_endpoints FORCE ROW LEVEL SECURITY;

-- ── C6b. startup_profiles — exclude ESIC reviewer identity from anon read ───
-- "startup_profiles_anon_read_active" (20260729_sp02_startup_portal_schema.sql
--   L66-73) is PUBLIC (no TO) and exposes all columns, including the internal
-- ESIC reviewer fields esic_verified_by / esic_verified_at. Keep the row-level
-- public read of active profiles, but revoke column SELECT and re-grant only
-- the public-safe column subset (omitting esic_verified_by + esic_verified_at).
-- The owner SELECT policy (TO authenticated) and service_role keep full access;
-- service_role ignores column grants, so server handlers are unaffected.
REVOKE SELECT ON public.startup_profiles FROM anon;
REVOKE SELECT ON public.startup_profiles FROM authenticated;

GRANT SELECT (
  id,
  slug,
  company_name,
  abn,
  founded_at,
  stage,
  sector,
  team,
  linkedin_url,
  pitch_deck_url,
  esic_eligible_self_attested,
  owner_user_id,
  status,
  created_at,
  updated_at
) ON public.startup_profiles TO anon, authenticated;

-- (FORCE ROW LEVEL SECURITY already set in the source migration; re-assert.)
ALTER TABLE public.startup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_profiles FORCE ROW LEVEL SECURITY;

-- ── C6c. startup_rounds — gate financial terms behind authentication ────────
-- "startup_rounds_anon_read_public" (20260729_sp02_startup_portal_schema.sql
--   L121-127) is PUBLIC (no TO) and exposes financial terms (valuation cap,
-- discount, interest rate, ticket sizes, lead investor). Re-scope the same row
-- filter TO authenticated so anonymous visitors no longer see deal economics.
-- Owner FOR ALL and service_role policies are unchanged.
DROP POLICY IF EXISTS "startup_rounds_anon_read_public" ON public.startup_rounds;

ALTER TABLE public.startup_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_rounds FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'startup_rounds'
      AND policyname = 'startup_rounds_authed_read_public'
  ) THEN
    CREATE POLICY "startup_rounds_authed_read_public"
      ON public.startup_rounds
      FOR SELECT
      TO authenticated
      USING (status IN ('open', 'committed', 'closed'));
  END IF;
END $$;

-- ── C6d. firm_credit_balance_summary — restrict view to service_role ────────
-- View GRANT SELECT TO authenticated (20260728_w423_firm_billing_summary.sql
--   L52) leaks every firm's aggregate credit/spend; the view has no per-firm
-- row filter and is meant to be read only via service-role server handlers
-- gated on is_firm_admin. Revoke authenticated; keep service_role.
REVOKE SELECT ON public.firm_credit_balance_summary FROM authenticated;
REVOKE SELECT ON public.firm_credit_balance_summary FROM anon;
GRANT SELECT ON public.firm_credit_balance_summary TO service_role;

COMMIT;
