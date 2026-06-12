-- gm07: Seed the 13 missing retail intent slugs into intent_taxonomy.
--
-- get_matched_action_plans has a FK on intent_slug → intent_taxonomy(slug).
-- The 13 primary retail goals were never inserted, so every resolve call
-- that maps to one of these goals (grow, income, crypto, trade, automate,
-- super, property, home, alt_assets, royalties, pre_ipo, help, browse)
-- threw "violates foreign key constraint" and returned an internal_error —
-- the quiz could never complete for any mainstream user path.
--
-- Rollback: DELETE FROM intent_taxonomy WHERE slug IN ('grow','income',
--   'crypto','trade','automate','super','property','home','alt_assets',
--   'royalties','pre_ipo','help','browse');

INSERT INTO public.intent_taxonomy
  (slug, label, description, default_route, default_brief_template, risk_level, enabled, sort_order)
VALUES
  ('grow',       'Start investing / Long-term growth',   'ETFs, shares, or building wealth over time.',                    'compare',    NULL,                'low',    true, 10),
  ('income',     'Earn income or dividends',             'Regular income from investments.',                               'compare',    NULL,                'low',    true, 20),
  ('crypto',     'Buy or hold crypto',                   'Bitcoin, Ethereum, altcoins, plus CGT help when you sell.',      'compare',    NULL,                'low',    true, 30),
  ('trade',      'Active trading / CFDs',                'Frequent trades, CFDs, or short-term strategies.',               'compare',    NULL,                'low',    true, 40),
  ('automate',   'Hands-off / robo-investing',           'Set and forget — robo-advisors do the rebalancing.',             'compare',    NULL,                'low',    true, 50),
  ('super',      'Super / SMSF',                         'Optimise super, set up an SMSF, or use super for property.',     'individual', 'financial_adviser', 'medium', true, 60),
  ('property',   'Property',                             'Buy investment property, browse listings, or use REITs / SMSF.', 'individual', 'mortgage',          'low',    true, 70),
  ('home',       'Buy a home or get a loan',             'First home, refinance, or investment loan.',                     'individual', 'mortgage',          'low',    true, 80),
  ('alt_assets', 'Alternative / collectible assets',    'Whisky, wine, art, watches, classic cars, coins.',               'browse',     NULL,                'low',    true, 90),
  ('royalties',  'Royalties / income-producing assets',  'Music, mining, IP royalties; vending / ATM income.',             'browse',     NULL,                'low',    true, 100),
  ('pre_ipo',    'Pre-IPO / wholesale deals',            'Late-stage private equity, IPO calendar, s708 deals.',           'browse',     NULL,                'medium', true, 110),
  ('help',       'Get expert help',                      'I''d like professional guidance.',                               'individual', 'financial_adviser', 'high',   true, 120),
  ('browse',     'Browse / not sure yet',                'Look around — show me what''s possible.',                        'browse',     NULL,                'low',    true, 130)
ON CONFLICT (slug) DO NOTHING;
