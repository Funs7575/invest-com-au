-- ============================================================
-- RLS cosmetic cleanup: dynamic_pricing_rules + forum_threads
--
-- Two cosmetic RLS issues surfaced 2026-04-21 during the
-- agent-infrastructure migration RLS audit (TODO.md "Soon").
-- Neither is a data exposure — both are advisor-flag noise that
-- should be cleared so future audits don't have to re-evaluate.
--
-- 1. dynamic_pricing_rules — RLS is enabled (default-deny is
--    correct for anon/authenticated) but no explicit policy
--    exists for service_role. Service-role writes work today
--    via BYPASSRLS, but Supabase advisor flags the missing
--    explicit policy. Add `Service role manages
--    dynamic_pricing_rules FOR ALL` to mirror the pattern used
--    on bd_pipeline / competitor_watch / agent_logs etc.
--
-- 2. forum_threads — two duplicate public-read policies exist
--    with the same `is_removed = false` predicate:
--      - "Public can read threads"     (legacy, from
--         migrations/20260411_community_forums.sql)
--      - "forum_threads_public_read"   (current, from
--         supabase/migrations/20260427_wave_security_observability.sql)
--    Drop the legacy one. The current name is referenced by
--    20260427's hardening pass so we keep that.
--
-- Rollback: re-CREATE the dropped legacy policy and DROP the
-- new service_role policy. No data modified.
-- ============================================================

-- 1. dynamic_pricing_rules — explicit service_role policy
DROP POLICY IF EXISTS "Service role manages dynamic_pricing_rules"
  ON public.dynamic_pricing_rules;
CREATE POLICY "Service role manages dynamic_pricing_rules"
  ON public.dynamic_pricing_rules
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. forum_threads — drop the legacy duplicate public-read policy
DROP POLICY IF EXISTS "Public can read threads" ON public.forum_threads;
