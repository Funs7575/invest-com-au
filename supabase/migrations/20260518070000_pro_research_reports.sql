-- Migration: pro_research_reports — backing table for /pro/research.
--
-- FIN_NOTEBOOK Revenue #10 (premium research subscription, 90% built —
-- Stripe + Pro tier already complete). /pro/research lists report
-- cards; this table is what those cards read from. Pre-launch we ship
-- the table + one example report so the funnel renders end-to-end;
-- editorial adds more reports over time via /admin/pro-research (next
-- PR) or direct INSERTs.
--
-- Schema:
--   - slug: stable identifier used in the report detail URL
--     (/pro/research/<slug>).
--   - title / kicker / summary: card copy.
--   - body_html: full report content. Sanitised at write-time (admin
--     route runs through the same allowlist as articles).
--   - tier: minimum subscription tier required to read the body. Today
--     a single 'pro' tier covers everything; leaving the column in
--     so we can stratify later without a schema change.
--   - published_at: when the report goes live. NULL until publish.
--   - cover_image_url + reading_time_minutes: card metadata.
--   - tags[]: e.g. ['fee-audit','brokers'] for filtering on the index.
--
-- RLS: public read on body_html is gated at the route layer (the page
-- checks getSubscription().isPro), so the table policy is permissive
-- read + service-role write. This matches the pattern used by
-- `articles`.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.pro_research_reports;

BEGIN;

CREATE TABLE IF NOT EXISTS public.pro_research_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  kicker text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  tier text NOT NULL DEFAULT 'pro',
  published_at timestamptz,
  cover_image_url text,
  reading_time_minutes integer NOT NULL DEFAULT 10,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_research_reports_tier_check CHECK (tier IN ('pro', 'pro_research', 'pro_full'))
);

CREATE INDEX IF NOT EXISTS idx_pro_research_reports_published
  ON public.pro_research_reports (published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_pro_research_reports_tags
  ON public.pro_research_reports USING GIN (tags);

ALTER TABLE public.pro_research_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published pro_research_reports" ON public.pro_research_reports;
CREATE POLICY "Public can read published pro_research_reports"
  ON public.pro_research_reports FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Service role manages pro_research_reports" ON public.pro_research_reports;
CREATE POLICY "Service role manages pro_research_reports"
  ON public.pro_research_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed one example report so the index page has content immediately.
INSERT INTO public.pro_research_reports
  (slug, title, kicker, summary, body_html, tier, published_at, reading_time_minutes, tags)
VALUES (
  'asx-broker-fee-audit-2026-q2',
  'ASX Broker Fee Audit — 2026 Q2',
  'Fee audit',
  'Quarterly fee-by-fee comparison of every CHESS-sponsored ASX broker. Headline brokerage, ETF deals, FX spreads on US trades, hidden inactivity / withdrawal / transfer-out fees, and the all-in cost of a 10-trades-per-month investor.',
  '<p>This quarter''s audit found 4 brokers raised or removed a fee, 2 introduced a new ETF deal, and 3 changed FX spreads on US trades. The summary table below walks through every CHESS-sponsored ASX broker on this site (sample report — full table + per-broker breakdown lands as editorial backfills the body).</p><p><em>Demo report. Full content is editorial work in progress.</em></p>',
  'pro',
  now(),
  18,
  ARRAY['fee-audit', 'brokers', 'asx', 'q2-2026']
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
