-- ============================================================
-- RLS hardening — pre-launch security pass
--
-- 1. CRITICAL FIX: the "Allow service read on quiz_leads" policy
--    was mis-scoped to {public} SELECT with qual=true. That
--    exposed every quiz lead's email + answers to anon via
--    PostgREST. Dropped and replaced with a service-role-only
--    SELECT so backend code reads normally via the service key
--    but anon and authenticated clients get nothing.
--
-- 2. Public-read policies added to tables that had 0 policies but
--    represent editorial / marketplace content which the public
--    site is supposed to render via the anon key. Until now these
--    pages only worked because the app reads them via the service
--    role admin client — but having no explicit policy trips the
--    Supabase security advisor.
--
-- 3. Explicit service-role-only policies added to sensitive tables
--    that had 0 policies. Default-deny already blocked anon, but
--    the explicit policy documents intent and clears the advisor
--    warning.
--
-- 4. Public INSERT allowed on listing_claims and developer_leads
--    so the frontend forms can post directly if needed. These
--    endpoints currently go via the admin client but we want the
--    permission aligned with intent. INSERT is guarded; SELECT
--    stays locked to service_role.
--
-- Everything is idempotent: every policy is DROP IF EXISTS'd
-- before CREATE.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CRITICAL: fix quiz_leads PII exposure
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow service read on quiz_leads" ON public.quiz_leads;

-- Keep the existing "Insert quiz leads" policy in place — that's
-- correctly scoped and allows anon submissions.

-- Replacement SELECT policy: only the service role (backend) can read.
DROP POLICY IF EXISTS "Service role read quiz_leads" ON public.quiz_leads;
CREATE POLICY "Service role read quiz_leads"
  ON public.quiz_leads
  FOR SELECT
  TO service_role
  USING (true);

-- ────────────────────────────────────────────────────────────
-- 2. Public-read tables (editorial / marketplace)
-- ────────────────────────────────────────────────────────────

-- commodity_stocks
ALTER TABLE public.commodity_stocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active commodity_stocks" ON public.commodity_stocks;
CREATE POLICY "Public read active commodity_stocks"
  ON public.commodity_stocks
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
DROP POLICY IF EXISTS "Service role write commodity_stocks" ON public.commodity_stocks;
CREATE POLICY "Service role write commodity_stocks"
  ON public.commodity_stocks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- commodity_etfs
ALTER TABLE public.commodity_etfs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active commodity_etfs" ON public.commodity_etfs;
CREATE POLICY "Public read active commodity_etfs"
  ON public.commodity_etfs
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
DROP POLICY IF EXISTS "Service role write commodity_etfs" ON public.commodity_etfs;
CREATE POLICY "Service role write commodity_etfs"
  ON public.commodity_etfs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- commodity_sectors
ALTER TABLE public.commodity_sectors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active commodity_sectors" ON public.commodity_sectors;
CREATE POLICY "Public read active commodity_sectors"
  ON public.commodity_sectors
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
DROP POLICY IF EXISTS "Service role write commodity_sectors" ON public.commodity_sectors;
CREATE POLICY "Service role write commodity_sectors"
  ON public.commodity_sectors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- commodity_news_briefs
ALTER TABLE public.commodity_news_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published commodity_news_briefs" ON public.commodity_news_briefs;
CREATE POLICY "Public read published commodity_news_briefs"
  ON public.commodity_news_briefs
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');
DROP POLICY IF EXISTS "Service role write commodity_news_briefs" ON public.commodity_news_briefs;
CREATE POLICY "Service role write commodity_news_briefs"
  ON public.commodity_news_briefs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- commodity_price_snapshots — public read (editorial snapshots)
ALTER TABLE public.commodity_price_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read commodity_price_snapshots" ON public.commodity_price_snapshots;
CREATE POLICY "Public read commodity_price_snapshots"
  ON public.commodity_price_snapshots
  FOR SELECT
  TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS "Service role write commodity_price_snapshots" ON public.commodity_price_snapshots;
CREATE POLICY "Service role write commodity_price_snapshots"
  ON public.commodity_price_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- best_for_scenarios
ALTER TABLE public.best_for_scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active best_for_scenarios" ON public.best_for_scenarios;
CREATE POLICY "Public read active best_for_scenarios"
  ON public.best_for_scenarios
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
DROP POLICY IF EXISTS "Service role write best_for_scenarios" ON public.best_for_scenarios;
CREATE POLICY "Service role write best_for_scenarios"
  ON public.best_for_scenarios
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- fund_listings
ALTER TABLE public.fund_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active fund_listings" ON public.fund_listings;
CREATE POLICY "Public read active fund_listings"
  ON public.fund_listings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
DROP POLICY IF EXISTS "Service role write fund_listings" ON public.fund_listings;
CREATE POLICY "Service role write fund_listings"
  ON public.fund_listings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- sector_reports
ALTER TABLE public.sector_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published sector_reports" ON public.sector_reports;
CREATE POLICY "Public read published sector_reports"
  ON public.sector_reports
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');
DROP POLICY IF EXISTS "Service role write sector_reports" ON public.sector_reports;
CREATE POLICY "Service role write sector_reports"
  ON public.sector_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. Server-only tables: explicit service-role-only policies
-- (Default-deny already blocked anon; these policies document
--  intent and satisfy the advisor.)
-- ────────────────────────────────────────────────────────────

-- newsletter_subscribers — anon INSERT allowed, service_role reads
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anon can subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(trim(email)) > 0);
DROP POLICY IF EXISTS "Service role full access newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Service role full access newsletter_subscribers"
  ON public.newsletter_subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- listing_claims — anon INSERT allowed, service_role reads
ALTER TABLE public.listing_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can submit claims" ON public.listing_claims;
CREATE POLICY "Anon can submit claims"
  ON public.listing_claims
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND full_name IS NOT NULL);
DROP POLICY IF EXISTS "Service role full access listing_claims" ON public.listing_claims;
CREATE POLICY "Service role full access listing_claims"
  ON public.listing_claims
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- developer_leads — anon INSERT allowed, service_role reads
ALTER TABLE public.developer_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can submit leads" ON public.developer_leads;
CREATE POLICY "Anon can submit leads"
  ON public.developer_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND full_name IS NOT NULL);
DROP POLICY IF EXISTS "Service role full access developer_leads" ON public.developer_leads;
CREATE POLICY "Service role full access developer_leads"
  ON public.developer_leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- stripe_webhook_events — service role only for everything
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only stripe_webhook_events" ON public.stripe_webhook_events;
CREATE POLICY "Service role only stripe_webhook_events"
  ON public.stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- content_freshness_log — service role only
ALTER TABLE public.content_freshness_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only content_freshness_log" ON public.content_freshness_log;
CREATE POLICY "Service role only content_freshness_log"
  ON public.content_freshness_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- newsletter_sponsors — service role only
ALTER TABLE public.newsletter_sponsors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only newsletter_sponsors" ON public.newsletter_sponsors;
CREATE POLICY "Service role only newsletter_sponsors"
  ON public.newsletter_sponsors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- _slug_fix_log — service role only
ALTER TABLE public._slug_fix_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only _slug_fix_log" ON public._slug_fix_log;
CREATE POLICY "Service role only _slug_fix_log"
  ON public._slug_fix_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- exit_intent_events — anon can log events, service role reads
ALTER TABLE public.exit_intent_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can log exit_intent_events" ON public.exit_intent_events;
CREATE POLICY "Anon can log exit_intent_events"
  ON public.exit_intent_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Service role read exit_intent_events" ON public.exit_intent_events;
CREATE POLICY "Service role read exit_intent_events"
  ON public.exit_intent_events
  FOR SELECT
  TO service_role
  USING (true);

-- chatbot_conversations — service role only (handled via the API)
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only chatbot_conversations" ON public.chatbot_conversations;
CREATE POLICY "Service role only chatbot_conversations"
  ON public.chatbot_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
