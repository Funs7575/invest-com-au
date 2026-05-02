-- ============================================================================
-- Migration: 20260310_fix_security_advisories.sql
-- Purpose: Fix Supabase security advisories — set search_path = public on
--          3 functions (update_professional_geog, advisor_fee_stats,
--          search_advisors_nearby) to prevent SQL injection via mutable
--          search_path; add deny-all policy to admin_login_attempts (had
--          RLS enabled but no policies); tighten portfolio_alerts UPDATE
--          and user_portfolios UPDATE to owner-scoped predicates.
-- Rollback: ALTER FUNCTION update_professional_geog() RESET search_path;
--           ALTER FUNCTION advisor_fee_stats(text) RESET search_path;
--           ALTER FUNCTION search_advisors_nearby(...) RESET search_path;
--           DROP POLICY IF EXISTS "Service role only on admin_login_attempts" ON admin_login_attempts;
--           DROP POLICY IF EXISTS "Update own portfolio alerts" ON portfolio_alerts;
--           CREATE POLICY "Update portfolio alerts" ON portfolio_alerts FOR UPDATE USING (true);
--           DROP POLICY IF EXISTS "Update own portfolio" ON user_portfolios;
--           CREATE POLICY "Update own portfolio" ON user_portfolios FOR UPDATE USING (true);
--   Note: rollback re-introduces the mutable search_path vulnerability and
--   overly permissive UPDATE policies — only use to undo a bad deploy.
-- ============================================================================

-- Fix Supabase security advisories flagged by database linter

-- 1. Fix function search_path to prevent SQL injection via mutable search_path
ALTER FUNCTION public.update_professional_geog()
  SET search_path = public;

ALTER FUNCTION public.advisor_fee_stats(text)
  SET search_path = public;

ALTER FUNCTION public.search_advisors_nearby(double precision, double precision, integer, text, text, text, integer, integer)
  SET search_path = public;

-- 2. Add policy to admin_login_attempts (had RLS enabled but no policies)
CREATE POLICY "Service role only on admin_login_attempts"
  ON public.admin_login_attempts FOR ALL
  USING (false);

-- 3. Tighten portfolio_alerts UPDATE policy (was USING (true))
DROP POLICY IF EXISTS "Update portfolio alerts" ON public.portfolio_alerts;
CREATE POLICY "Update own portfolio alerts"
  ON public.portfolio_alerts FOR UPDATE
  USING (
    portfolio_id IN (
      SELECT id FROM public.user_portfolios WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  )
  WITH CHECK (portfolio_id IS NOT NULL);

-- 4. Tighten user_portfolios UPDATE policy (was USING (true))
DROP POLICY IF EXISTS "Update own portfolio" ON public.user_portfolios;
CREATE POLICY "Update own portfolio"
  ON public.user_portfolios FOR UPDATE
  USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
  )
  WITH CHECK (email IS NOT NULL AND length(TRIM(BOTH FROM email)) > 0);
