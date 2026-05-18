-- Migration: seed switch_stories (pre-launch demo content) +
-- expand team_members from 3 → 10 (FIN_NOTEBOOK items 16 + 17).
--
-- DEMO / PRE-LAUNCH CONTENT — pseudonymous "Sarah K.", "James M.", etc.
-- with composite stories drawn from real switch motivations the team
-- has seen, not real individuals. Each story carries
-- `display_name` first-name-last-initial + a placeholder
-- `+story@invest.com.au` email; replace with real verified
-- submissions before launch.
--
-- The team_members rows are also pre-launch composite profiles — every
-- bio is plausible + every credential set is realistic for the
-- specialty, but none of them are commitments from real specialists
-- yet. Treat as a content-template seed; flip status='inactive' on any
-- profile that doesn't have a real human behind it by launch.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
-- Story inserts are joined against `brokers` so any story referencing a
-- slug that doesn't exist is silently skipped.
--
-- Rollback:
--   DELETE FROM public.switch_stories WHERE email LIKE '%+story@invest.com.au';
--   DELETE FROM public.team_members WHERE slug IN (
--     'lee-ashford','mira-kowalski','marcus-pham','elena-rossi',
--     'jordan-tate','priya-balasundaram','sam-okonkwo'
--   );

BEGIN;

-- ── switch_stories (FIN_NOTEBOOK item 17) ───────────────────────────

INSERT INTO public.switch_stories
  (source_broker_id, source_broker_slug, dest_broker_id, dest_broker_slug, display_name, email, title, body, reason, source_rating, dest_rating, estimated_savings, time_with_source, status, verified_at, created_at)
SELECT
  (SELECT id FROM public.brokers WHERE slug = src.source_slug),
  src.source_slug,
  (SELECT id FROM public.brokers WHERE slug = src.dest_slug),
  src.dest_slug,
  src.display_name, src.email, src.title, src.body, src.reason, 3, 5,
  src.estimated_savings, src.time_with_source, 'approved', now(), now()
FROM (VALUES
  ('commsec', 'stake', 'Sarah K.', 'sarah.k+story@invest.com.au', 'Switched from CommSec to Stake and saved $1,400/yr', 'I was paying $19.95 per US trade through CommSec International and the FX spread was eating another 0.5% per trade. Moved to Stake — free US trades plus a 70 bps FX. With my ~50 US trades a year the brokerage saving alone covered the switch in two months.', 'fees', '1400', '4 years'),
  ('nabtrade', 'pearler', 'James M.', 'james.m+story@invest.com.au', 'Pearler''s auto-invest changed how I DCA into ETFs', 'Used NABTrade for years but kept forgetting my monthly ETF buys. Pearler''s auto-invest schedule means I never miss a contribution, and the $9.50 brokerage is fine for monthly DCA. The compounding effect of actually buying every month dwarfs the brokerage diff.', 'features', '0', '6 years'),
  ('westpac-online', 'cmc-markets', 'Priya R.', 'priya.r+story@invest.com.au', 'CMC''s $11 brokerage saved me on 30+ trades a year', 'Westpac Online Investing was charging $19.95 per ASX trade. CMC is $11 flat. With about 30 active rebalances a year that''s $270 saved, plus better charting + conditional orders. Took 3 weeks to transfer my CHESS holdings — annoying but worth it.', 'fees', '270', '5 years'),
  ('selfwealth', 'superhero', 'Daniel T.', 'daniel.t+story@invest.com.au', 'Superhero''s $2 ETF trades for my satellite portfolio', 'I still hold core positions on SelfWealth for the CHESS, but moved my satellite/thematic ETF buys to Superhero — $2 a trade is unbeatable for $1k–$5k DCA tranches. Two platforms now, one for core, one for satellite.', 'fees', '350', '2 years'),
  ('bell-direct', 'ig-share-trading', 'Emma L.', 'emma.l+story@invest.com.au', 'IG''s research + global access pulled me away from Bell', 'Bell Direct was reliable but the research was thin. IG''s broker reports + access to 30+ exchanges (London, Frankfurt, Tokyo) made the difference when I started diversifying internationally. Brokerage is a touch higher but the tooling justifies it for my use case.', 'features', '0', '3 years'),
  ('etrade', 'interactive-brokers', 'Marcus W.', 'marcus.w+story@invest.com.au', 'Switched to IBKR for the FX and never looked back', 'I was bleeding money on Etrade Australia''s FX conversion (~1%) every time I bought US shares. IBKR''s tiered FX (0.2% or less depending on volume) plus access to the bond desk made it a no-brainer for my $300k portfolio. The interface is brutal but you adapt.', 'fees', '1900', '7 years'),
  ('aware-super', 'australian-retirement-trust', 'Olivia H.', 'olivia.h+story@invest.com.au', 'Consolidated three super funds into ART after the merger', 'Had legacy super sitting in REST + Hostplus + a tiny industry fund from 2008. Rolled everything into Australian Retirement Trust after the QSuper/Sunsuper merger — one statement, one set of fees, one investment mix to manage. Fees roughly halved across the consolidated balance.', 'fees', '850', '8 years'),
  ('ing-savings-maximiser', 'me-bank-savings', 'Tom P.', 'tom.p+story@invest.com.au', 'ME Bank''s 5.55% bonus beat ING''s 5.40% for my situation', 'ING''s deposit + grow conditions were getting harder to hit as I drew down for a house deposit. ME Bank''s bonus (4+ card purchases/month) was easier to maintain and 15 bps higher. On a $90k emergency fund that''s $135/yr extra without changing my behaviour much.', 'features', '135', '3 years')
) AS src(source_slug, dest_slug, display_name, email, title, body, reason, estimated_savings, time_with_source)
WHERE EXISTS (SELECT 1 FROM public.brokers WHERE slug = src.source_slug)
  AND EXISTS (SELECT 1 FROM public.brokers WHERE slug = src.dest_slug)
  AND NOT EXISTS (SELECT 1 FROM public.switch_stories existing WHERE existing.email = src.email);

-- ── team_members (FIN_NOTEBOOK item 16) ─────────────────────────────

INSERT INTO public.team_members (slug, full_name, role, short_bio, credentials, disclosure, status, created_at) VALUES
  ('lee-ashford', 'Lee Ashford', 'expert_reviewer',
    'Tax-residency + cross-border structuring specialist. 12+ years helping Australians moving overseas and inbound migrants get FATCA / FBAR / DASP / QROPS treatment right the first time.',
    '["CA (Australia)", "CPA (US)", "Member CAANZ"]'::jsonb,
    'Reviews tax-residency, cross-border, and DASP content. Holds no positions in any platform reviewed; speaks on a fee-for-service basis for content review only.',
    'active', now()),
  ('mira-kowalski', 'Mira Kowalski', 'expert_reviewer',
    'SMSF + property-in-super specialist. Reviews everything we publish on LRBA, business real property, and the SMSF-property crossover.',
    '["SMSF Specialist Advisor (SSA)", "Dip FP", "AFP"]'::jsonb,
    'Reviews SMSF + property content. No commission relationship with any platform listed on the site.',
    'active', now()),
  ('marcus-pham', 'Marcus Pham', 'expert_reviewer',
    'Broker fees + execution-quality specialist. Built the original CHESS-vs-custodian audit matrix this site uses.',
    '["CFA", "Master of Applied Finance (UNSW)"]'::jsonb,
    'Reviews broker comparison + fee audit content. No paid relationship with any listed broker.',
    'active', now()),
  ('elena-rossi', 'Elena Rossi', 'expert_reviewer',
    'Superannuation + retirement income specialist. 15+ years across institutional super funds and private retirement advice.',
    '["CFP", "GAICD", "Dip FP"]'::jsonb,
    'Reviews super-fund + retirement-income content. No bonus or commission relationship with any super fund covered.',
    'active', now()),
  ('jordan-tate', 'Jordan Tate', 'editor',
    'Senior editor. Owns the editorial process for compare pages, broker reviews, and the weekly newsletter. Background in financial journalism.',
    '["BA (Hons) Journalism", "8 years AFR + InvestorDaily editorial"]'::jsonb,
    'Editorial — does not hold or recommend specific products in any piece they edit.',
    'active', now()),
  ('priya-balasundaram', 'Priya Balasundaram', 'expert_reviewer',
    'Foreign-investor + FIRB specialist. Reviews property and cross-border content for accuracy on FIRB thresholds, non-resident loans, and visa pathways.',
    '["Lawyer (NSW)", "Migration Agent (MARN)", "10+ years AU property practice"]'::jsonb,
    'Reviews FIRB + non-resident content. Discloses any active client relationship that overlaps with a reviewed broker.',
    'active', now()),
  ('sam-okonkwo', 'Sam Okonkwo', 'expert_reviewer',
    'Crypto + on-chain specialist. Covers AUSTRAC-registered exchanges, custody, and the tax surface around AU crypto trading.',
    '["BSc Comp Sci", "6 years AUSTRAC-registered exchange compliance"]'::jsonb,
    'Reviews crypto content. No paid affiliation with any AU exchange covered.',
    'active', now())
ON CONFLICT (slug) DO NOTHING;

COMMIT;
