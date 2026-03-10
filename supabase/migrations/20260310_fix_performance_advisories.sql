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
