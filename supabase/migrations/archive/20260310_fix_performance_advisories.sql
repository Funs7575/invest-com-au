-- ============================================================================
-- Migration: 20260310_fix_performance_advisories.sql
-- Purpose: Fix Supabase performance-advisor warnings — (1) wrap
--          `current_setting('request.jwt.claims', …)` in `(select …)` for
--          per-query (not per-row) evaluation on 2 RLS UPDATE policies
--          (`Update own portfolio alerts` on portfolio_alerts, `Update own
--          portfolio` on user_portfolios); (2) drop 3 duplicate indexes
--          (idx_analytics_events_created, idx_analytics_events_event_type,
--          idx_fee_snapshots_portfolio); (3) add 9 missing FK indexes
--          (idx_professional_leads_professional_id,
--          idx_professional_reviews_professional_id,
--          idx_advisor_applications_professional_id,
--          idx_advisor_articles_professional_id,
--          idx_advisor_bookings_professional_id,
--          idx_affiliate_clicks_broker_id, idx_articles_author_id,
--          idx_campaign_events_campaign_id, idx_campaigns_placement_id).
-- Rollback: Recreate the 3 dropped duplicate indexes; drop the 9 added
--          FK indexes; revert the 2 UPDATE policies to the original
--          unwrapped `current_setting(...)` predicate. Reverse is a NET
--          DEGRADATION (re-introduces the per-row evaluation perf issue
--          and removes FK indexes); only run as part of a full deploy
--          revert.
-- Risk: medium — reverse re-introduces the perf-advisor warnings the
--       Supabase advisor flagged (sequential scans on JOINs, slow per-row
--       JWT lookup). Functionally identical to forward, just slower.
--       The 2 RLS predicates change semantically as well: `(select
--       current_setting(...))` is evaluated once per query; the unwrapped
--       form is evaluated once per row. Reverse is safe but wasteful.
-- ============================================================================
--
-- Forward operations:
--   1. DROP POLICY IF EXISTS "Update own portfolio alerts"
--        ON public.portfolio_alerts;
--      CREATE POLICY "Update own portfolio alerts"
--        ON public.portfolio_alerts FOR UPDATE
--        USING (portfolio_id IN (SELECT id FROM public.user_portfolios
--          WHERE email = (select current_setting(
--            'request.jwt.claims', true)::json->>'email')))
--        WITH CHECK (portfolio_id IS NOT NULL).
--   2. DROP POLICY IF EXISTS "Update own portfolio"
--        ON public.user_portfolios;
--      CREATE POLICY "Update own portfolio" ON public.user_portfolios
--        FOR UPDATE
--        USING (email = (select current_setting(
--          'request.jwt.claims', true)::json->>'email'))
--        WITH CHECK (email IS NOT NULL AND length(TRIM(BOTH FROM email)) > 0).
--   3. DROP INDEX IF EXISTS public.idx_analytics_events_created;
--      DROP INDEX IF EXISTS public.idx_analytics_events_event_type;
--      DROP INDEX IF EXISTS public.idx_fee_snapshots_portfolio.
--   4. CREATE INDEX IF NOT EXISTS idx_professional_leads_professional_id,
--      idx_professional_reviews_professional_id,
--      idx_advisor_applications_professional_id,
--      idx_advisor_articles_professional_id,
--      idx_advisor_bookings_professional_id,
--      idx_affiliate_clicks_broker_id, idx_articles_author_id,
--      idx_campaign_events_campaign_id, idx_campaigns_placement_id.
--
-- Rollback (in reverse order):
--   -- WARNING: reverse re-introduces the per-row JWT lookup perf issue
--   -- and removes FK indexes. Only run as part of a full deploy revert.
--   4. DROP INDEX IF EXISTS public.idx_campaigns_placement_id;
--      DROP INDEX IF EXISTS public.idx_campaign_events_campaign_id;
--      DROP INDEX IF EXISTS public.idx_articles_author_id;
--      DROP INDEX IF EXISTS public.idx_affiliate_clicks_broker_id;
--      DROP INDEX IF EXISTS public.idx_advisor_bookings_professional_id;
--      DROP INDEX IF EXISTS public.idx_advisor_articles_professional_id;
--      DROP INDEX IF EXISTS public.idx_advisor_applications_professional_id;
--      DROP INDEX IF EXISTS public.idx_professional_reviews_professional_id;
--      DROP INDEX IF EXISTS public.idx_professional_leads_professional_id;
--   3. -- Re-create the dropped duplicate indexes only if a downstream
--      -- migration has not already replaced them with equivalents:
--      CREATE INDEX IF NOT EXISTS idx_fee_snapshots_portfolio
--        ON public.portfolio_fee_snapshots(portfolio_id);
--      CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type
--        ON public.analytics_events(event_type);
--      CREATE INDEX IF NOT EXISTS idx_analytics_events_created
--        ON public.analytics_events(created_at);
--   2. DROP POLICY IF EXISTS "Update own portfolio" ON public.user_portfolios;
--      CREATE POLICY "Update own portfolio" ON public.user_portfolios
--        FOR UPDATE
--        USING (email = current_setting(
--          'request.jwt.claims', true)::json->>'email')
--        WITH CHECK (email IS NOT NULL
--          AND length(TRIM(BOTH FROM email)) > 0);
--   1. DROP POLICY IF EXISTS "Update own portfolio alerts"
--        ON public.portfolio_alerts;
--      CREATE POLICY "Update own portfolio alerts"
--        ON public.portfolio_alerts FOR UPDATE
--        USING (portfolio_id IN (SELECT id FROM public.user_portfolios
--          WHERE email = current_setting(
--            'request.jwt.claims', true)::json->>'email'))
--        WITH CHECK (portfolio_id IS NOT NULL);
-- ============================================================================

-- Fix Supabase performance advisories

-- 1. Fix RLS initplan: wrap current_setting in (select ...) for per-query eval
DROP POLICY IF EXISTS "Update own portfolio alerts" ON public.portfolio_alerts;
CREATE POLICY "Update own portfolio alerts"
  ON public.portfolio_alerts FOR UPDATE
  USING (
    portfolio_id IN (
      SELECT id FROM public.user_portfolios 
      WHERE email = (select current_setting('request.jwt.claims', true)::json->>'email')
    )
  )
  WITH CHECK (portfolio_id IS NOT NULL);

DROP POLICY IF EXISTS "Update own portfolio" ON public.user_portfolios;
CREATE POLICY "Update own portfolio"
  ON public.user_portfolios FOR UPDATE
  USING (
    email = (select current_setting('request.jwt.claims', true)::json->>'email')
  )
  WITH CHECK (email IS NOT NULL AND length(TRIM(BOTH FROM email)) > 0);

-- 2. Drop duplicate indexes on analytics_events
DROP INDEX IF EXISTS public.idx_analytics_events_created;
DROP INDEX IF EXISTS public.idx_analytics_events_event_type;

-- 3. Drop duplicate index on portfolio_fee_snapshots
DROP INDEX IF EXISTS public.idx_fee_snapshots_portfolio;

-- 4. Add missing foreign key indexes for high-traffic tables
CREATE INDEX IF NOT EXISTS idx_professional_leads_professional_id 
  ON public.professional_leads(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_reviews_professional_id 
  ON public.professional_reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_advisor_applications_professional_id 
  ON public.advisor_applications(professional_id);
CREATE INDEX IF NOT EXISTS idx_advisor_articles_professional_id 
  ON public.advisor_articles(professional_id);
CREATE INDEX IF NOT EXISTS idx_advisor_bookings_professional_id 
  ON public.advisor_bookings(professional_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_broker_id 
  ON public.affiliate_clicks(broker_id);
CREATE INDEX IF NOT EXISTS idx_articles_author_id 
  ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_id 
  ON public.campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_placement_id 
  ON public.campaigns(placement_id);
