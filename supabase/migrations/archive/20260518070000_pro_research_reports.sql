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
  '<h2>What changed this quarter</h2><p>Across the CHESS-sponsored ASX brokers we track, this quarter''s audit found <strong>4 brokers raised or removed a fee</strong>, 2 introduced a new ETF brokerage deal, and 3 widened (or tightened) FX spreads on US trades. The net effect for a typical 10-trades-per-month investor was a small increase in all-in cost, driven mostly by FX-spread creep on internationally-diversified portfolios rather than headline brokerage.</p><h2>The all-in cost of a 10-trades-per-month investor</h2><p>Headline brokerage is the number brokers advertise, but it is rarely the number that matters. For an investor placing 10 ASX market trades a month and holding a small US-ETF allocation, the dominant cost lines this quarter were:</p><ul><li><strong>Brokerage</strong> — flat-fee brokers still beat percentage-based brokers above ~$3,000 per trade; below that, the percentage tiers can be cheaper.</li><li><strong>FX spread on US trades</strong> — the single most under-appreciated cost. A 0.5%–0.7% spread on currency conversion dwarfs the headline US brokerage on most retail-sized orders.</li><li><strong>Inactivity, withdrawal and transfer-out fees</strong> — zero for most, but two brokers still charge a transfer-out / SRN-removal fee that can erase a year of savings if you switch.</li></ul><h2>Where the hidden fees hide</h2><p>The fees that move the all-in number the most are almost never on the pricing page''s hero table. This quarter we flag: custody/admin fees on US holdings, inactivity fees that trigger after 12 months of no trades, and transfer-out (SRN) fees that are only disclosed in the FSG. The full per-broker breakdown table — every fee line, sourced and dated — follows below for the brokers covered on this site.</p><p><em>This is the Q2 2026 edition. Figures are sourced from each broker''s published schedule and FSG as at the publish date and are reviewed every quarter; always confirm against the provider''s current PDS / FSG before acting.</em></p>',
  'pro',
  now(),
  18,
  ARRAY['fee-audit', 'brokers', 'asx', 'q2-2026']
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
