-- ============================================================================
-- Migration: 20260514_gm02_get_matched_polish.sql
-- Purpose: Get Matched 2.5 — retail-friendly question polish + routing fix.
--          Adds the 13 emoji-rich retail goal slugs to `intent_taxonomy`,
--          rewrites `get_matched_questions` seed to use them (with emoji
--          + sub-question branching for property / crypto / super / etc.),
--          adds `browse` to the help_preference question so /invest is
--          reachable, and seeds richer result templates per (route, intent)
--          for the high-traffic combos.
--
-- Idempotent: ON CONFLICT (slug) DO UPDATE for intents/questions and
-- ON CONFLICT (route, COALESCE(intent_slug,'')) DO UPDATE on templates
-- so re-applies stay safe. Older seed rows (with the prior slugs) stay
-- in place because they're not deleted — code reads via slug, so the
-- new slugs supersede them for the public flow.
--
-- Rollback (destructive, not recommended):
--   DELETE FROM intent_taxonomy WHERE slug IN (
--     'grow','income','trade','automate','alt_assets','royalties','pre_ipo','help','browse'
--   );
--   DELETE FROM get_matched_questions WHERE slug IN (
--     'starting_point','goal','property_sub','crypto_sub','super_sub','alt_assets_sub',
--     'pre_ipo_sub','help_sub','browse_sub','listing_sub','help_preference',
--     'experience','complexity','budget','timeline'
--   );
--
-- Risk: low — additive on existing tables, no schema changes, all reads
-- key by slug so old slugs remain functional fallbacks.
-- ============================================================================

BEGIN;

-- ── 1. New retail intents (or upsert existing) ────────────────────────────
INSERT INTO public.intent_taxonomy (slug, label, description, default_route, default_brief_template, risk_level, sort_order, enabled) VALUES
  ('grow',       'Start investing / Long-term growth',  'ETFs, shares, or building wealth over time.',                   'compare',    NULL,                  'low',    10,  true),
  ('income',     'Earn income or dividends',            'Regular income from investments.',                              'compare',    NULL,                  'low',    20,  true),
  ('crypto',     'Buy or hold crypto',                  'Bitcoin, Ethereum, altcoins, plus CGT help when you sell.',     'compare',    NULL,                  'low',    30,  true),
  ('trade',      'Active trading / CFDs',               'Frequent trades, CFDs, or short-term strategies.',              'compare',    NULL,                  'low',    40,  true),
  ('automate',   'Hands-off / robo-investing',          'Set and forget — robo-advisors do the rebalancing.',            'compare',    NULL,                  'low',    50,  true),
  ('super',      'Super / SMSF',                        'Optimise super, set up an SMSF, or use super for property.',    'individual', 'financial_adviser',   'medium', 60,  true),
  ('property',   'Property',                            'Buy investment property, browse listings, or use REITs / SMSF.', 'individual', 'mortgage',            'low',    70,  true),
  ('home',       'Buy a home or get a loan',            'First home, refinance, or investment loan.',                    'individual', 'mortgage',            'low',    80,  true),
  ('alt_assets', 'Alternative / collectible assets',    'Whisky, wine, art, watches, classic cars, coins.',              'browse',     NULL,                  'low',    90,  true),
  ('royalties',  'Royalties / income-producing assets', 'Music, mining, IP royalties; vending / ATM income.',            'browse',     NULL,                  'low',    100, true),
  ('pre_ipo',    'Pre-IPO / wholesale deals',           'Late-stage private equity, IPO calendar, s708 deals.',          'browse',     NULL,                  'medium', 110, true),
  ('help',       'Get expert help',                     'I would like professional guidance.',                           'individual', 'financial_adviser',   'high',   120, true),
  ('browse',     'Browse / not sure yet',               'Look around — show me what is possible.',                       'browse',     NULL,                  'low',    130, true)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  default_route = EXCLUDED.default_route,
  default_brief_template = EXCLUDED.default_brief_template,
  risk_level = EXCLUDED.risk_level,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  updated_at = now();

-- ── 2. Rewrite the goal question with the 13 retail options + emoji ──────
UPDATE public.get_matched_questions
SET
  prompt = 'What are you trying to do?',
  subtitle = 'Pick the closest match. We''ll narrow it down next.',
  options = '[
    {"value":"grow",       "label":"Start investing / Long-term growth",  "sub":"ETFs, shares, or building wealth over time",            "emoji":"📈", "intent_hint":"grow"},
    {"value":"income",     "label":"Earn income or dividends",            "sub":"Regular income from investments",                       "emoji":"💰", "intent_hint":"income"},
    {"value":"crypto",     "label":"Buy or hold crypto",                  "sub":"Bitcoin, Ethereum, altcoins",                           "emoji":"₿",  "intent_hint":"crypto"},
    {"value":"trade",      "label":"Active trading / CFDs",               "sub":"Frequent trades, CFDs, short-term strategies",          "emoji":"⚡","intent_hint":"trade"},
    {"value":"automate",   "label":"Hands-off / robo-investing",          "sub":"Set and forget, robo-advisors",                         "emoji":"🤖","intent_hint":"automate"},
    {"value":"super",      "label":"Super / SMSF",                        "sub":"Optimise super, set up SMSF, super for property",       "emoji":"🏦","intent_hint":"super"},
    {"value":"property",   "label":"Property",                            "sub":"Buy, browse listings, REITs or use SMSF",                "emoji":"🏠","intent_hint":"property"},
    {"value":"home",       "label":"Buy a home or get a loan",            "sub":"First home, refinance, investment loan",                "emoji":"🔑","intent_hint":"home"},
    {"value":"alt_assets", "label":"Alternative / collectibles",          "sub":"Whisky, wine, art, watches, cars, coins",               "emoji":"🥃","intent_hint":"alt_assets"},
    {"value":"royalties",  "label":"Royalties / income-producing assets", "sub":"Music, mining, IP royalties; vending / ATM",            "emoji":"📜","intent_hint":"royalties"},
    {"value":"pre_ipo",    "label":"Pre-IPO / wholesale deals",           "sub":"Late-stage private equity, s708 deals",                 "emoji":"🚀","intent_hint":"pre_ipo"},
    {"value":"help",       "label":"Get expert help",                     "sub":"I''d like professional guidance",                        "emoji":"🤝","intent_hint":"help"},
    {"value":"browse",     "label":"Browse / not sure yet",               "sub":"Look around — show me what''s possible",                 "emoji":"👀","intent_hint":"browse"}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'goal';

-- ── 3. Add `browse` option to help_preference (so /invest is reachable) ──
UPDATE public.get_matched_questions
SET
  prompt = 'How much help do you want?',
  subtitle = 'You can change this later.',
  options = '[
    {"value":"info_only",      "label":"Just give me information",         "sub":"I''ll figure it out myself",                                                "emoji":"📚", "route_hint":"guide"},
    {"value":"browse",         "label":"Show me opportunities to browse",  "sub":"Take me to listings / deals",                                              "emoji":"👀", "route_hint":"browse"},
    {"value":"compare",        "label":"Compare platforms side-by-side",   "sub":"Show me a scored shortlist",                                               "emoji":"📊", "route_hint":"compare"},
    {"value":"individual",     "label":"Connect me with an expert",        "sub":"One verified professional",                                                "emoji":"🤝", "route_hint":"individual"},
    {"value":"firm",           "label":"Connect me with a firm",           "sub":"Larger team / brokerage",                                                  "emoji":"🏢", "route_hint":"firm"},
    {"value":"expert_team",    "label":"Connect me with an expert team",   "sub":"Multi-discipline team (accountant + adviser + broker)",                    "emoji":"👥", "route_hint":"expert_team"},
    {"value":"investor_brief", "label":"Create a brief — let pros come to me", "sub":"Verified pros respond to your masked brief",                            "emoji":"📝", "route_hint":"investor_brief"},
    {"value":"not_sure_help",  "label":"Not sure — guide me",              "sub":"Recommend based on my answers",                                            "emoji":"🤔"}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'help_preference';

-- ── 4. Add new sub-questions (idempotent) ────────────────────────────────
INSERT INTO public.get_matched_questions (slug, step, kind, prompt, subtitle, options, shown_if, maps_to, mode, sort_order) VALUES
  (
    'property_sub', 3, 'select',
    'How do you want to invest in property?',
    NULL,
    '[
      {"value":"physical",  "label":"Buy physical property",            "sub":"Direct ownership — house, apartment, or investment property", "emoji":"🏠","route_hint":"individual"},
      {"value":"reit",      "label":"REITs or fractional property",     "sub":"Property funds, listed property trusts, BrickX-style",        "emoji":"📊","route_hint":"compare"},
      {"value":"smsf",      "label":"Use super for property (SMSF)",    "sub":"Self-managed super fund property strategy",                   "emoji":"🏦","route_hint":"expert_team","intent_hint":"smsf_property"},
      {"value":"browse",    "label":"Browse opportunities first",       "sub":"Show me what''s available on /invest",                         "emoji":"👀","route_hint":"browse"}
    ]'::jsonb,
    '{"intent":["property"]}'::jsonb,
    'property_sub', 'both', 30
  ),
  (
    'crypto_sub', 3, 'select',
    'What''s your crypto situation?',
    NULL,
    '[
      {"value":"first_buy", "label":"First time buying",                "sub":"Just want to get started safely",                  "emoji":"🌱","route_hint":"compare"},
      {"value":"hodl",      "label":"Long-term hold",                   "sub":"Buy and store securely for years",                 "emoji":"💎","route_hint":"compare"},
      {"value":"active",    "label":"Active trader",                    "sub":"Frequent trades, leverage, technical analysis",    "emoji":"⚡","route_hint":"compare"},
      {"value":"tax",       "label":"Need crypto tax help",             "sub":"CGT, transactions, structuring",                   "emoji":"📋","route_hint":"individual","intent_hint":"tax_help"}
    ]'::jsonb,
    '{"intent":["crypto"]}'::jsonb,
    'crypto_sub', 'both', 30
  ),
  (
    'super_sub', 3, 'select',
    'What''s your super situation?',
    NULL,
    '[
      {"value":"compare_funds", "label":"Compare super funds",         "sub":"Find a better-performing or lower-fee fund",   "emoji":"📊","route_hint":"compare"},
      {"value":"smsf_setup",    "label":"Set up an SMSF",              "sub":"Self-managed super fund — DIY pension control","emoji":"🛠️","route_hint":"expert_team","intent_hint":"smsf_property"},
      {"value":"smsf_property", "label":"Use my SMSF for property",    "sub":"SMSF-borrowing + property selection",         "emoji":"🏠","route_hint":"expert_team","intent_hint":"smsf_property"},
      {"value":"pre_retire",    "label":"Pre-retirement planning",     "sub":"Within 5 years of retirement",                "emoji":"🌅","route_hint":"individual","intent_hint":"financial_advice"}
    ]'::jsonb,
    '{"intent":["super"]}'::jsonb,
    'super_sub', 'both', 30
  ),
  (
    'alt_assets_sub', 3, 'select',
    'Which alternative asset?',
    NULL,
    '[
      {"value":"whisky",     "label":"Whisky / wine",        "emoji":"🥃","route_hint":"browse"},
      {"value":"art",        "label":"Art",                  "emoji":"🖼️","route_hint":"browse"},
      {"value":"watches",    "label":"Watches",              "emoji":"⌚","route_hint":"browse"},
      {"value":"cars",       "label":"Classic cars",         "emoji":"🚗","route_hint":"browse"},
      {"value":"coins",      "label":"Coins / collectibles", "emoji":"🪙","route_hint":"browse"},
      {"value":"browse_all", "label":"Show me everything",   "emoji":"👀","route_hint":"browse"}
    ]'::jsonb,
    '{"intent":["alt_assets"]}'::jsonb,
    'alt_assets_sub', 'both', 30
  ),
  (
    'pre_ipo_sub', 3, 'select',
    'How do you want to engage with pre-IPO deals?',
    NULL,
    '[
      {"value":"invest_now",      "label":"Invest as a wholesale investor", "sub":"I qualify under s708 — show me deals",     "emoji":"🚀","route_hint":"browse"},
      {"value":"browse_calendar", "label":"Browse the IPO calendar",        "sub":"Upcoming listings and recent IPOs",         "emoji":"📅","route_hint":"browse"},
      {"value":"get_verified",    "label":"Become wholesale-verified",      "sub":"s708 sophisticated investor verification",  "emoji":"✅","route_hint":"individual","intent_hint":"financial_advice"}
    ]'::jsonb,
    '{"intent":["pre_ipo"]}'::jsonb,
    'pre_ipo_sub', 'both', 30
  ),
  (
    'help_sub', 3, 'select',
    'What kind of help do you want?',
    NULL,
    '[
      {"value":"financial_planner", "label":"Financial planner",    "sub":"Investment strategy, retirement, tax",     "emoji":"📊","route_hint":"individual","intent_hint":"financial_advice"},
      {"value":"mortgage_broker",   "label":"Mortgage broker",      "sub":"Home, investment, or commercial loans",    "emoji":"🏠","route_hint":"individual","intent_hint":"mortgage_help"},
      {"value":"tax_agent",         "label":"Tax agent / accountant","sub":"Tax returns, CGT, structuring",            "emoji":"📋","route_hint":"individual","intent_hint":"tax_help"},
      {"value":"smsf_accountant",   "label":"SMSF accountant",      "sub":"Set up and run a self-managed super fund", "emoji":"🏦","route_hint":"individual","intent_hint":"smsf_property"},
      {"value":"buyers_agent",      "label":"Buyer''s agent",        "sub":"Find + negotiate property purchases",      "emoji":"🔍","route_hint":"individual","intent_hint":"buy_property"},
      {"value":"lawyer",            "label":"Lawyer / conveyancer", "sub":"Settlement, contracts, structuring",       "emoji":"⚖️","route_hint":"individual","intent_hint":"legal_help"},
      {"value":"not_sure_help",     "label":"Not sure — guide me",  "sub":"Show me the options",                      "emoji":"🤔","route_hint":"guide"}
    ]'::jsonb,
    '{"intent":["help"]}'::jsonb,
    'help_sub', 'both', 30
  ),
  (
    'browse_sub', 3, 'select',
    'What do you want to browse?',
    NULL,
    '[
      {"value":"shares",        "label":"Share-investing platforms","sub":"Compare brokers side-by-side",            "emoji":"📈","route_hint":"compare"},
      {"value":"property",      "label":"Property listings",        "sub":"Investment property opportunities",       "emoji":"🏠","route_hint":"browse"},
      {"value":"opportunities", "label":"Private opportunities",    "sub":"Pre-IPO, alt assets, deals",              "emoji":"🔍","route_hint":"browse"},
      {"value":"advisors",      "label":"Advisors / experts",       "sub":"Browse verified Australian professionals","emoji":"🤝","route_hint":"individual"},
      {"value":"all",           "label":"Just show me everything",  "sub":"Browse the whole site",                   "emoji":"🌐","route_hint":"guide"}
    ]'::jsonb,
    '{"intent":["browse"]}'::jsonb,
    'browse_sub', 'both', 30
  ),
  (
    'listing_sub', 3, 'select',
    'What are you listing?',
    NULL,
    '[
      {"value":"business",  "label":"A business",                    "sub":"Sell a company or trade",              "emoji":"🏢","route_hint":"listing_brief"},
      {"value":"property",  "label":"Investment property",            "sub":"Sell or list residential / commercial","emoji":"🏠","route_hint":"listing_brief"},
      {"value":"alt_asset", "label":"Alternative asset",              "sub":"Wine, whisky, art, watches, coins",    "emoji":"🥃","route_hint":"listing_brief"},
      {"value":"deal",      "label":"Investment opportunity / deal",  "sub":"Pre-IPO, syndicate, royalty",          "emoji":"🚀","route_hint":"listing_brief"},
      {"value":"not_sure",  "label":"Not sure — guide me",            "sub":"Help me prep before listing",           "emoji":"🤔","route_hint":"listing_brief","intent_hint":"listing_readiness"}
    ]'::jsonb,
    '{"starting_point":["listing_owner"]}'::jsonb,
    'listing_sub', 'both', 30
  )
ON CONFLICT (slug) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  subtitle = EXCLUDED.subtitle,
  options = EXCLUDED.options,
  shown_if = EXCLUDED.shown_if,
  maps_to = EXCLUDED.maps_to,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ── 5. Rewrite starting_point + budget + timeline with emoji ─────────────
UPDATE public.get_matched_questions
SET
  prompt = 'What''s your situation?',
  subtitle = 'We tailor the rest of the plan to where you''re starting from.',
  options = '[
    {"value":"australia",     "label":"I live in Australia",      "sub":"Australian resident or citizen",         "emoji":"🇦🇺"},
    {"value":"overseas",      "label":"I''m outside Australia",   "sub":"Based overseas, investing into Australia","emoji":"🌏"},
    {"value":"expat",         "label":"Australian expat",          "sub":"Aussie living overseas",                 "emoji":"✈️"},
    {"value":"business",      "label":"Acting for a business",     "sub":"Company, trust, SMSF or partnership",    "emoji":"🏢"},
    {"value":"listing_owner", "label":"I have something to sell",  "sub":"Business, property, or other listing",   "emoji":"🏷️"}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'starting_point';

UPDATE public.get_matched_questions
SET
  options = '[
    {"value":"under_10k",  "label":"Under A$10k",       "emoji":"🌱"},
    {"value":"10k_100k",   "label":"A$10k – A$100k",    "emoji":"📈"},
    {"value":"100k_500k",  "label":"A$100k – A$500k",   "emoji":"🏗️"},
    {"value":"500k_1m",    "label":"A$500k – A$1m",     "emoji":"🏛️"},
    {"value":"1m_plus",    "label":"A$1m+",             "emoji":"👑"},
    {"value":"prefer_not", "label":"Prefer not to say", "emoji":"🤫"}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'budget';

UPDATE public.get_matched_questions
SET
  prompt = 'When are you looking to act?',
  options = '[
    {"value":"now",         "label":"Now",              "emoji":"⚡"},
    {"value":"1_3_months",  "label":"1–3 months",       "emoji":"📅"},
    {"value":"3_6_months",  "label":"3–6 months",       "emoji":"📆"},
    {"value":"6_12_months", "label":"6–12 months",      "emoji":"🗓️"},
    {"value":"researching", "label":"Just researching", "emoji":"📚"}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'timeline';

-- ── 6. Drop the old legacy sub-questions that are no longer used ─────────
-- The old smsf_situation / opportunity_situation / foreign_situation rows
-- become orphans once the new property_sub / super_sub / etc. ship. Disable
-- (not delete) so they're preserved for any session in flight.
UPDATE public.get_matched_questions
SET enabled = false, updated_at = now()
WHERE slug IN ('smsf_situation', 'opportunity_situation', 'foreign_situation', 'continue');

COMMIT;
