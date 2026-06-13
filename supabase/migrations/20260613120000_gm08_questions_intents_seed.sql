-- ============================================================================
-- Migration: 20260613120000_gm08_questions_intents_seed.sql
--
-- RENAMED 2026-06-13 from 20260611160000_gm08_questions_intents_seed.sql to
-- resolve a version collision: 20260611160000 was also used by
-- 20260611160000_advisor_standing_orders.sql. Supabase keys the ledger on the
-- 14-digit version, so the duplicate caused this seed to be silently skipped on
-- push (only one 20260611160000 entry can exist). Re-timestamped to a unique,
-- later version so it applies cleanly. Content is unchanged and idempotent, so
-- re-applying is a no-op even if a prior partial apply occurred. Before pushing,
-- run `supabase migration list` to confirm file↔ledger sync (DB Migration Rules).
--
-- Purpose: Seed `get_matched_questions` and `intent_taxonomy` to mirror the
--          code-defined canonical sets in lib/getmatched/fallbacks.ts
--          (FALLBACK_QUESTIONS + FALLBACK_INTENTS), one-for-one, INCLUDING the
--          new step-3 sub-questions added in this PR (grow_sub, income_sub,
--          trade_sub, automate_sub, royalties_sub).
--
--          Prod currently runs entirely on the code fallbacks because both
--          tables are unseeded — getQuestions()/getEnabledIntents() catch the
--          empty result and return the FALLBACK_* constants. This migration
--          makes the DB rows behaviourally identical so the DB-first path in
--          questions.ts / intents.ts returns the same flow.
--
-- Idempotent: pure DML. INSERT ... ON CONFLICT (slug) DO UPDATE on the natural
--             key (slug) for both tables, so re-running refreshes copy without
--             duplicating rows. No schema changes. Re-runnable safely.
--
-- RLS: unchanged. Both tables already have RLS enabled with policies in the
--      baseline ("Public can read enabled questions/intents" SELECT +
--      "Service role full access" FOR ALL). This migration only writes data.
--
-- Rollback (destructive — only if you intend to revert to code-fallback-only):
--   DELETE FROM public.get_matched_questions WHERE slug IN (
--     'starting_point','goal','property_sub','crypto_sub','super_sub',
--     'alt_assets_sub','pre_ipo_sub','help_sub','browse_sub','listing_sub',
--     'grow_sub','income_sub','trade_sub','automate_sub','royalties_sub',
--     'help_preference','experience','complexity','location_state',
--     'country_of_residence','visa_status','budget','timeline');
--   DELETE FROM public.intent_taxonomy WHERE slug IN (
--     'grow','income','crypto','trade','automate','super','property','home',
--     'alt_assets','royalties','pre_ipo','help','browse','compare_platform',
--     'start_investing','smsf_property','buy_property','opportunity_assessment',
--     'business_acquisition','commercial_property','foreign_investor',
--     'expat_investing','financial_advice','tax_help','mortgage_help',
--     'legal_help','second_opinion','listing_owner','listing_readiness',
--     'not_sure');
--
-- Risk: low — additive/idempotent DML on existing tables; reads key by slug.
-- ============================================================================

BEGIN;

-- ── 1. Intent taxonomy (mirrors FALLBACK_INTENTS, 30 slugs) ───────────────
INSERT INTO public.intent_taxonomy
  (slug, label, description, default_route, default_brief_template, risk_level, enabled, sort_order, meta)
VALUES
  ('grow',                  'Start investing / Long-term growth',  'ETFs, shares, or building wealth over time.',                       'compare',        NULL,                            'low',    true, 10,  '{}'::jsonb),
  ('income',                'Earn income or dividends',            'Regular income from investments.',                                  'compare',        NULL,                            'low',    true, 20,  '{}'::jsonb),
  ('crypto',                'Buy or hold crypto',                  'Bitcoin, Ethereum, altcoins, plus CGT help when you sell.',         'compare',        NULL,                            'low',    true, 30,  '{}'::jsonb),
  ('trade',                 'Active trading / CFDs',               'Frequent trades, CFDs, or short-term strategies.',                  'compare',        NULL,                            'low',    true, 40,  '{}'::jsonb),
  ('automate',              'Hands-off / robo-investing',          'Set and forget — robo-advisors do the rebalancing.',                'compare',        NULL,                            'low',    true, 50,  '{}'::jsonb),
  ('super',                 'Super / SMSF',                        'Optimise super, set up an SMSF, or use super for property.',        'individual',     'financial_adviser',             'medium', true, 60,  '{}'::jsonb),
  ('property',              'Property',                            'Buy investment property, browse listings, or use REITs / SMSF.',    'individual',     'mortgage',                      'low',    true, 70,  '{}'::jsonb),
  ('home',                  'Buy a home or get a loan',            'First home, refinance, or investment loan.',                        'individual',     'mortgage',                      'low',    true, 80,  '{}'::jsonb),
  ('alt_assets',            'Alternative / collectible assets',    'Whisky, wine, art, watches, classic cars, coins.',                  'browse',         NULL,                            'low',    true, 90,  '{}'::jsonb),
  ('royalties',             'Royalties / income-producing assets', 'Music, mining, IP royalties; vending / ATM income.',                'browse',         NULL,                            'low',    true, 100, '{}'::jsonb),
  ('pre_ipo',               'Pre-IPO / wholesale deals',           'Late-stage private equity, IPO calendar, s708 deals.',              'browse',         NULL,                            'medium', true, 110, '{}'::jsonb),
  ('help',                  'Get expert help',                     'I''d like professional guidance.',                                  'individual',     'financial_adviser',             'high',   true, 120, '{}'::jsonb),
  ('browse',                'Browse / not sure yet',               'Look around — show me what''s possible.',                           'browse',         NULL,                            'low',    true, 130, '{}'::jsonb),
  ('compare_platform',      'Compare investing platforms',         'Compare brokers, super funds, robo-advisors or property platforms.','compare',        NULL,                            'low',    true, 200, '{}'::jsonb),
  ('start_investing',       'Start investing',                     'New to investing — figure out the right first step.',               'compare',        NULL,                            'low',    true, 210, '{}'::jsonb),
  ('smsf_property',         'Invest through SMSF',                 'Property or shares inside a self-managed super fund.',              'expert_team',    'smsf_property',                 'medium', true, 220, '{}'::jsonb),
  ('buy_property',          'Buy investment property',             'Residential investment property.',                                  'individual',     'mortgage',                      'low',    true, 230, '{}'::jsonb),
  ('opportunity_assessment','Assess an opportunity',               'Get help reviewing a specific deal or listing.',                    'expert_team',    'opportunity_assessment',        'medium', true, 240, '{}'::jsonb),
  ('business_acquisition',  'Buy a business',                      'Acquire an Australian business.',                                   'expert_team',    'business_acquisition',          'medium', true, 250, '{}'::jsonb),
  ('commercial_property',   'Commercial property',                 'Buy, lease or invest in commercial property.',                      'expert_team',    'commercial_property',           'medium', true, 260, '{}'::jsonb),
  ('foreign_investor',      'Invest from overseas',                'Non-resident or overseas investor into Australia.',                 'expert_team',    'foreign_investor',              'high',   true, 270, '{}'::jsonb),
  ('expat_investing',       'Australian expat investing',          'Australian living overseas investing back home.',                   'individual',     'expat',                         'medium', true, 280, '{}'::jsonb),
  ('financial_advice',      'Get financial advice',                'Licensed financial planning advice.',                               'individual',     'financial_adviser',             'high',   true, 290, '{}'::jsonb),
  ('tax_help',              'Get tax / accounting help',           'Tax planning or returns.',                                          'individual',     'tax',                           'medium', true, 300, '{}'::jsonb),
  ('mortgage_help',         'Get lending / mortgage help',         'Home, investment or commercial finance.',                           'individual',     'mortgage',                      'low',    true, 310, '{}'::jsonb),
  ('legal_help',            'Get legal / conveyancing help',       'Property settlement, contracts, structuring.',                      'individual',     'general',                       'medium', true, 320, '{}'::jsonb),
  ('second_opinion',        'Get a second opinion',                'Have advice or a deal independently reviewed.',                     'second_opinion', 'second_opinion',                'medium', true, 330, '{}'::jsonb),
  ('listing_owner',         'Post / list an opportunity',          'Seller of a business, property or other deal.',                     'listing_brief',  'listing',                       'low',    true, 340, '{}'::jsonb),
  ('listing_readiness',     'Prepare a listing',                   'Get your opportunity ready to list.',                               'listing_brief',  'listing_readiness',             'low',    true, 350, '{}'::jsonb),
  ('not_sure',              'Not sure yet',                        'Browse and figure it out as you go.',                               'browse',         NULL,                            'low',    true, 999, '{}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  default_route = EXCLUDED.default_route,
  default_brief_template = EXCLUDED.default_brief_template,
  risk_level = EXCLUDED.risk_level,
  enabled = EXCLUDED.enabled,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ── 2. Questions (mirrors FALLBACK_QUESTIONS, 23 questions) ───────────────
-- Step 1: starting_point
INSERT INTO public.get_matched_questions
  (slug, step, kind, prompt, subtitle, options, shown_if, maps_to, risk_weight, mode, enabled, sort_order)
VALUES
  ('starting_point', 1, 'select',
   'What''s your situation?',
   'We tailor the rest of the plan to where you''re starting from.',
   '[
     {"value":"australia","label":"I live in Australia","sub":"Australian resident or citizen","emoji":"🇦🇺"},
     {"value":"overseas","label":"I''m outside Australia","sub":"Based overseas, investing into Australia","emoji":"🌏"},
     {"value":"expat","label":"Australian expat","sub":"Aussie living overseas","emoji":"✈️"},
     {"value":"business","label":"Acting for a business","sub":"Company, trust, SMSF or partnership","emoji":"🏢"},
     {"value":"listing_owner","label":"I have something to sell","sub":"Business, property, or other listing","emoji":"🏷️"}
   ]'::jsonb,
   '{}'::jsonb, 'starting_point', 0, 'both', true, 10),

  -- Step 2: goal
  ('goal', 2, 'select',
   'What are you trying to do?',
   'Pick the closest match. We''ll narrow it down next.',
   '[
     {"value":"grow","label":"Start investing / Long-term growth","sub":"ETFs, shares, or building wealth over time","emoji":"📈","intent_hint":"grow"},
     {"value":"income","label":"Earn income or dividends","sub":"Regular income from investments","emoji":"💰","intent_hint":"income"},
     {"value":"crypto","label":"Buy or hold crypto","sub":"Bitcoin, Ethereum, altcoins","emoji":"₿","intent_hint":"crypto"},
     {"value":"trade","label":"Active trading / CFDs","sub":"Frequent trades, CFDs, short-term strategies","emoji":"⚡","intent_hint":"trade"},
     {"value":"automate","label":"Hands-off / robo-investing","sub":"Set and forget, robo-advisors","emoji":"🤖","intent_hint":"automate"},
     {"value":"super","label":"Super / SMSF","sub":"Optimise super, set up SMSF, super for property","emoji":"🏦","intent_hint":"super"},
     {"value":"property","label":"Property","sub":"Buy, browse listings, REITs or use SMSF","emoji":"🏠","intent_hint":"property"},
     {"value":"home","label":"Buy a home or get a loan","sub":"First home, refinance, investment loan","emoji":"🔑","intent_hint":"home"},
     {"value":"alt_assets","label":"Alternative / collectibles","sub":"Whisky, wine, art, watches, cars, coins","emoji":"🥃","intent_hint":"alt_assets"},
     {"value":"royalties","label":"Royalties / income-producing assets","sub":"Music, mining, IP royalties; vending / ATM","emoji":"📜","intent_hint":"royalties"},
     {"value":"pre_ipo","label":"Pre-IPO / wholesale deals","sub":"Late-stage private equity, s708 deals","emoji":"🚀","intent_hint":"pre_ipo"},
     {"value":"help","label":"Get expert help","sub":"I''d like professional guidance","emoji":"🤝","intent_hint":"help"},
     {"value":"browse","label":"Browse / not sure yet","sub":"Look around — show me what''s possible","emoji":"👀","intent_hint":"browse"}
   ]'::jsonb,
   '{}'::jsonb, 'intent', 0, 'both', true, 20),

  -- Step 3: property_sub
  ('property_sub', 3, 'select',
   'How do you want to invest in property?',
   NULL,
   '[
     {"value":"physical","label":"Buy physical property","sub":"Direct ownership — house, apartment, or investment property","emoji":"🏠","route_hint":"individual"},
     {"value":"reit","label":"REITs or fractional property","sub":"Property funds, listed property trusts, BrickX-style","emoji":"📊","vertical":"property","route_hint":"compare"},
     {"value":"smsf","label":"Use super for property (SMSF)","sub":"Self-managed super fund property strategy","emoji":"🏦","route_hint":"expert_team","intent_hint":"smsf_property"},
     {"value":"browse","label":"Browse opportunities first","sub":"Show me what''s available on /invest","emoji":"👀","vertical":"property","route_hint":"browse"}
   ]'::jsonb,
   '{"intent":["property"]}'::jsonb, 'property_sub', 0, 'both', true, 30),

  -- Step 3: crypto_sub
  ('crypto_sub', 3, 'select',
   'What''s your crypto situation?',
   NULL,
   '[
     {"value":"first_buy","label":"First time buying","sub":"Just want to get started safely","emoji":"🌱","vertical":"crypto","route_hint":"compare"},
     {"value":"hodl","label":"Long-term hold","sub":"Buy and store securely for years","emoji":"💎","vertical":"crypto","route_hint":"compare"},
     {"value":"active","label":"Active trader","sub":"Frequent trades, leverage, technical analysis","emoji":"⚡","vertical":"crypto","route_hint":"compare"},
     {"value":"tax","label":"Need crypto tax help","sub":"CGT, transactions, structuring","emoji":"📋","route_hint":"individual","intent_hint":"tax_help"}
   ]'::jsonb,
   '{"intent":["crypto"]}'::jsonb, 'crypto_sub', 0, 'both', true, 30),

  -- Step 3: super_sub
  ('super_sub', 3, 'select',
   'What''s your super situation?',
   NULL,
   '[
     {"value":"compare_funds","label":"Compare super funds","sub":"Find a better-performing or lower-fee fund","emoji":"📊","vertical":"super","route_hint":"compare"},
     {"value":"smsf_setup","label":"Set up an SMSF","sub":"Self-managed super fund — DIY pension control","emoji":"🛠️","route_hint":"expert_team","intent_hint":"smsf_property"},
     {"value":"smsf_property","label":"Use my SMSF for property","sub":"SMSF-borrowing strategy + property selection","emoji":"🏠","route_hint":"expert_team","intent_hint":"smsf_property"},
     {"value":"pre_retire","label":"Pre-retirement planning","sub":"Within 5 years of retirement — get it right","emoji":"🌅","route_hint":"individual","intent_hint":"financial_advice"}
   ]'::jsonb,
   '{"intent":["super"]}'::jsonb, 'super_sub', 0, 'both', true, 30),

  -- Step 3: alt_assets_sub
  ('alt_assets_sub', 3, 'select',
   'Which alternative asset?',
   NULL,
   '[
     {"value":"whisky","label":"Whisky / wine","emoji":"🥃","vertical":"alt","route_hint":"browse"},
     {"value":"art","label":"Art","emoji":"🖼️","vertical":"alt","route_hint":"browse"},
     {"value":"watches","label":"Watches","emoji":"⌚","vertical":"alt","route_hint":"browse"},
     {"value":"cars","label":"Classic cars","emoji":"🚗","vertical":"alt","route_hint":"browse"},
     {"value":"coins","label":"Coins / collectibles","emoji":"🪙","vertical":"alt","route_hint":"browse"},
     {"value":"browse_all","label":"Show me everything","emoji":"👀","vertical":"alt","route_hint":"browse"}
   ]'::jsonb,
   '{"intent":["alt_assets"]}'::jsonb, 'alt_assets_sub', 0, 'both', true, 30),

  -- Step 3: pre_ipo_sub
  ('pre_ipo_sub', 3, 'select',
   'How do you want to engage with pre-IPO deals?',
   NULL,
   '[
     {"value":"invest_now","label":"Invest as a wholesale investor","sub":"I qualify under s708 — show me deals","emoji":"🚀","vertical":"pre_ipo","route_hint":"browse"},
     {"value":"browse_calendar","label":"Browse the IPO calendar","sub":"Upcoming listings and recent IPOs","emoji":"📅","vertical":"pre_ipo","route_hint":"browse"},
     {"value":"get_verified","label":"Become wholesale-verified","sub":"s708 sophisticated investor verification","emoji":"✅","route_hint":"individual","intent_hint":"financial_advice"}
   ]'::jsonb,
   '{"intent":["pre_ipo"]}'::jsonb, 'pre_ipo_sub', 0, 'both', true, 30),

  -- Step 3: help_sub
  ('help_sub', 3, 'select',
   'What kind of help do you want?',
   NULL,
   '[
     {"value":"financial_planner","label":"Financial planner","sub":"Investment strategy, retirement, tax","emoji":"📊","route_hint":"individual","intent_hint":"financial_advice"},
     {"value":"mortgage_broker","label":"Mortgage broker","sub":"Home, investment, or commercial loans","emoji":"🏠","route_hint":"individual","intent_hint":"mortgage_help"},
     {"value":"tax_agent","label":"Tax agent / accountant","sub":"Tax returns, CGT, structuring","emoji":"📋","route_hint":"individual","intent_hint":"tax_help"},
     {"value":"smsf_accountant","label":"SMSF accountant","sub":"Set up and run a self-managed super fund","emoji":"🏦","route_hint":"individual","intent_hint":"smsf_property"},
     {"value":"buyers_agent","label":"Buyer''s agent","sub":"Find + negotiate property purchases","emoji":"🔍","route_hint":"individual","intent_hint":"buy_property"},
     {"value":"lawyer","label":"Lawyer / conveyancer","sub":"Settlement, contracts, structuring","emoji":"⚖️","route_hint":"individual","intent_hint":"legal_help"},
     {"value":"not_sure_help","label":"Not sure — guide me","sub":"Show me the options","emoji":"🤔","route_hint":"guide"}
   ]'::jsonb,
   '{"intent":["help"]}'::jsonb, 'help_sub', 0, 'both', true, 30),

  -- Step 3: browse_sub
  ('browse_sub', 3, 'select',
   'What do you want to browse?',
   NULL,
   '[
     {"value":"shares","label":"Share-investing platforms","sub":"Compare brokers side-by-side","emoji":"📈","vertical":"shares","route_hint":"compare"},
     {"value":"property","label":"Property listings","sub":"Investment property opportunities","emoji":"🏠","vertical":"property","route_hint":"browse"},
     {"value":"opportunities","label":"Private opportunities","sub":"Pre-IPO, alt assets, deals","emoji":"🔍","vertical":"opportunity","route_hint":"browse"},
     {"value":"advisors","label":"Advisors / experts","sub":"Browse verified Australian professionals","emoji":"🤝","route_hint":"individual"},
     {"value":"all","label":"Just show me everything","sub":"Browse the whole site","emoji":"🌐","route_hint":"guide"}
   ]'::jsonb,
   '{"intent":["browse"]}'::jsonb, 'browse_sub', 0, 'both', true, 30),

  -- Step 3: listing_sub
  ('listing_sub', 3, 'select',
   'What are you listing?',
   NULL,
   '[
     {"value":"business","label":"A business","sub":"Sell a company or trade","emoji":"🏢","route_hint":"listing_brief"},
     {"value":"property","label":"Investment property","sub":"Sell or list residential / commercial","emoji":"🏠","route_hint":"listing_brief"},
     {"value":"alt_asset","label":"Alternative asset","sub":"Wine, whisky, art, watches, coins","emoji":"🥃","route_hint":"listing_brief"},
     {"value":"deal","label":"Investment opportunity / deal","sub":"Pre-IPO, syndicate, royalty","emoji":"🚀","route_hint":"listing_brief"},
     {"value":"not_sure","label":"Not sure — guide me","sub":"Help me prep before listing","emoji":"🤔","route_hint":"listing_brief","intent_hint":"listing_readiness"}
   ]'::jsonb,
   '{"starting_point":["listing_owner"]}'::jsonb, 'listing_sub', 0, 'both', true, 30),

  -- Step 3: grow_sub (NEW)
  ('grow_sub', 3, 'select',
   'How do you want to start growing your money?',
   NULL,
   '[
     {"value":"just_starting","label":"Just getting started","sub":"New to investing — keep it simple","emoji":"🌱","vertical":"shares","route_hint":"compare"},
     {"value":"etfs_longterm","label":"ETFs for the long term","sub":"Low-cost index funds, buy and hold","emoji":"📈","vertical":"shares","route_hint":"compare"},
     {"value":"pick_shares","label":"Pick my own shares","sub":"Build a portfolio of individual companies","emoji":"🎯","vertical":"shares","route_hint":"compare"},
     {"value":"guide_me","label":"Not sure — guide me","sub":"Show me the right first step","emoji":"🤔","route_hint":"guide"}
   ]'::jsonb,
   '{"intent":["grow"]}'::jsonb, 'grow_sub', 0, 'both', true, 30),

  -- Step 3: income_sub (NEW)
  ('income_sub', 3, 'select',
   'Where do you want your income to come from?',
   NULL,
   '[
     {"value":"dividend_shares","label":"Dividend shares","sub":"Franked dividends from Australian companies","emoji":"💰","vertical":"shares","route_hint":"compare"},
     {"value":"income_etfs","label":"Income ETFs or LICs","sub":"Diversified income funds & listed investment companies","emoji":"📊","vertical":"shares","route_hint":"compare"},
     {"value":"property_income","label":"Property income (REITs)","sub":"Rent-style income from listed property trusts","emoji":"🏠","vertical":"property","route_hint":"compare"},
     {"value":"royalty_income","label":"Royalty-style assets","sub":"Music, IP, mining or vending income streams","emoji":"📜","route_hint":"browse","intent_hint":"royalties"}
   ]'::jsonb,
   '{"intent":["income"]}'::jsonb, 'income_sub', 0, 'both', true, 30),

  -- Step 3: trade_sub (NEW)
  ('trade_sub', 3, 'select',
   'What do you want to trade?',
   NULL,
   '[
     {"value":"shares_etfs","label":"Shares & ETFs","sub":"Day-trading or short-term equity positions","emoji":"📈","vertical":"trade","route_hint":"compare"},
     {"value":"cfds_forex","label":"CFDs & forex","sub":"Contracts for difference and currency pairs","emoji":"💱","vertical":"trade","route_hint":"compare"},
     {"value":"options","label":"Options","sub":"Calls, puts and options strategies","emoji":"⚙️","vertical":"trade","route_hint":"compare"},
     {"value":"crypto_trading","label":"Crypto trading","sub":"Active trading on crypto exchanges","emoji":"₿","vertical":"crypto","route_hint":"compare"}
   ]'::jsonb,
   '{"intent":["trade"]}'::jsonb, 'trade_sub', 0, 'both', true, 30),

  -- Step 3: automate_sub (NEW)
  ('automate_sub', 3, 'select',
   'How hands-off do you want to be?',
   NULL,
   '[
     {"value":"full_robo","label":"Full robo-advisor","sub":"Automated portfolio, rebalanced for you","emoji":"🤖","vertical":"robo","route_hint":"compare"},
     {"value":"round_ups","label":"Round-ups / micro-investing","sub":"Invest spare change automatically","emoji":"🪙","vertical":"robo","route_hint":"compare"},
     {"value":"managed_portfolio","label":"Managed portfolios","sub":"Professionally managed model portfolios","emoji":"📦","vertical":"robo","route_hint":"compare"},
     {"value":"compare_robo","label":"Compare robo-advisors","sub":"Show me the options side-by-side","emoji":"📊","vertical":"robo","route_hint":"compare"}
   ]'::jsonb,
   '{"intent":["automate"]}'::jsonb, 'automate_sub', 0, 'both', true, 30),

  -- Step 3: royalties_sub (NEW)
  ('royalties_sub', 3, 'select',
   'Which kind of royalty or income asset?',
   NULL,
   '[
     {"value":"music_ip","label":"Music / IP royalties","sub":"Song catalogues, patents, licensing income","emoji":"🎵","vertical":"royalties","route_hint":"browse"},
     {"value":"mining","label":"Mining royalties","sub":"Resource and commodity royalty streams","emoji":"⛏️","vertical":"royalties","route_hint":"browse"},
     {"value":"vending_atm","label":"Vending / ATM income","sub":"Machine route or ATM income assets","emoji":"🏧","vertical":"royalties","route_hint":"browse"},
     {"value":"browse_all","label":"Show me everything","sub":"Browse all royalty opportunities","emoji":"👀","vertical":"royalties","route_hint":"browse"}
   ]'::jsonb,
   '{"intent":["royalties"]}'::jsonb, 'royalties_sub', 0, 'both', true, 30),

  -- Step 4: help_preference
  ('help_preference', 4, 'select',
   'How much help do you want?',
   'You can change this later.',
   '[
     {"value":"info_only","label":"Just give me information","sub":"I''ll figure it out myself","emoji":"📚","route_hint":"guide"},
     {"value":"browse","label":"Show me opportunities to browse","sub":"Take me to listings / deals","emoji":"👀","route_hint":"browse"},
     {"value":"compare","label":"Compare platforms side-by-side","sub":"Show me a scored shortlist","emoji":"📊","route_hint":"compare"},
     {"value":"individual","label":"Connect me with an expert","sub":"One verified professional","emoji":"🤝","route_hint":"individual"},
     {"value":"firm","label":"Connect me with a firm","sub":"Larger team / brokerage","emoji":"🏢","route_hint":"firm"},
     {"value":"expert_team","label":"Connect me with an expert team","sub":"Multi-discipline team (accountant + adviser + broker)","emoji":"👥","route_hint":"expert_team"},
     {"value":"investor_brief","label":"Create a brief — let pros come to me","sub":"Verified pros respond to your masked brief","emoji":"📝","route_hint":"investor_brief"},
     {"value":"not_sure_help","label":"Not sure — guide me","sub":"Recommend based on my answers","emoji":"🤔"}
   ]'::jsonb,
   '{}'::jsonb, 'help_preference', 0, 'both', true, 40),

  -- Step 5: experience (DIY branch)
  ('experience', 5, 'select',
   'How experienced are you with this?',
   NULL,
   '[
     {"value":"beginner","label":"Complete beginner","sub":"Just getting started","emoji":"🌱"},
     {"value":"intermediate","label":"Some experience","sub":"Invested before — want to improve","emoji":"📚"},
     {"value":"pro","label":"Advanced / pro","sub":"I know what I''m doing","emoji":"🎯"}
   ]'::jsonb,
   '{"help_preference":["info_only","browse","compare"]}'::jsonb, 'experience', 0, 'both', true, 50),

  -- Step 5: complexity (advisor branch)
  ('complexity', 5, 'select',
   'How complex is your situation?',
   NULL,
   '[
     {"value":"simple","label":"Simple","sub":"Just getting started, straightforward","emoji":"🟢"},
     {"value":"moderate","label":"Moderate","sub":"Some assets — want to make good decisions","emoji":"🟡"},
     {"value":"complex","label":"Complex","sub":"Tax, SMSF, property, business, or multiple goals","emoji":"🔴"}
   ]'::jsonb,
   '{"help_preference":["individual","firm","expert_team","investor_brief"]}'::jsonb, 'complexity', 1, 'both', true, 50),

  -- Step 5: location_state
  ('location_state', 5, 'select',
   'Where are you based?',
   'Helps us match professionals licensed and experienced in your state.',
   '[
     {"value":"NSW","label":"New South Wales","emoji":"🌉"},
     {"value":"VIC","label":"Victoria","emoji":"🏛️"},
     {"value":"QLD","label":"Queensland","emoji":"🌴"},
     {"value":"WA","label":"Western Australia","emoji":"🌅"},
     {"value":"SA","label":"South Australia","emoji":"🍷"},
     {"value":"TAS","label":"Tasmania","emoji":"⛰️"},
     {"value":"ACT","label":"ACT","emoji":"🏢"},
     {"value":"NT","label":"Northern Territory","emoji":"🐊"},
     {"value":"any","label":"Anywhere / online is fine","sub":"Happy to work with someone remotely","emoji":"💻"}
   ]'::jsonb,
   '{"starting_point":["australia"],"help_preference":["individual","firm","expert_team","investor_brief","not_sure"]}'::jsonb,
   'location_state', 0, 'both', true, 42),

  -- Step 5: country_of_residence
  ('country_of_residence', 5, 'select',
   'Which country are you based in?',
   'We match professionals who work with investors from your country.',
   '[
     {"value":"uk","label":"United Kingdom","emoji":"🇬🇧"},
     {"value":"usa","label":"United States","emoji":"🇺🇸"},
     {"value":"china","label":"China","emoji":"🇨🇳"},
     {"value":"india","label":"India","emoji":"🇮🇳"},
     {"value":"singapore","label":"Singapore","emoji":"🇸🇬"},
     {"value":"hong_kong","label":"Hong Kong","emoji":"🇭🇰"},
     {"value":"uae","label":"UAE / Middle East","emoji":"🇦🇪"},
     {"value":"malaysia","label":"Malaysia","emoji":"🇲🇾"},
     {"value":"new_zealand","label":"New Zealand","emoji":"🇳🇿"},
     {"value":"japan","label":"Japan","emoji":"🇯🇵"},
     {"value":"south_korea","label":"South Korea","emoji":"🇰🇷"},
     {"value":"saudi_arabia","label":"Saudi Arabia","emoji":"🇸🇦"},
     {"value":"other","label":"Another country","emoji":"🌍"}
   ]'::jsonb,
   '{"starting_point":["overseas","expat"]}'::jsonb, 'country_of_residence', 0, 'both', true, 44),

  -- Step 5: visa_status
  ('visa_status', 5, 'select',
   'What''s your relationship with Australia?',
   'Visa status changes which specialists fit (e.g. departing-resident super).',
   '[
     {"value":"non_resident","label":"No Australian ties","sub":"Never lived there, no visa","emoji":"🌐"},
     {"value":"temp_visa","label":"Temporary visa holder","sub":"457/482, student, working holiday","emoji":"📋"},
     {"value":"new_pr","label":"New permanent resident","sub":"Recently got PR, not yet a citizen","emoji":"🏡"},
     {"value":"not_sure","label":"Not sure / other","sub":"We''ll keep the matching broad","emoji":"🤔"}
   ]'::jsonb,
   '{"starting_point":["overseas"]}'::jsonb, 'visa_status', 0, 'both', true, 46),

  -- Step 6: budget
  ('budget', 6, 'select',
   'How much are you looking to invest?',
   'Bands only — keeps things private.',
   '[
     {"value":"under_10k","label":"Under A$10k","emoji":"🌱"},
     {"value":"10k_100k","label":"A$10k – A$100k","emoji":"📈"},
     {"value":"100k_500k","label":"A$100k – A$500k","emoji":"🏗️"},
     {"value":"500k_1m","label":"A$500k – A$1m","emoji":"🏛️"},
     {"value":"1m_plus","label":"A$1m+","emoji":"👑"},
     {"value":"prefer_not","label":"Prefer not to say","emoji":"🤫"}
   ]'::jsonb,
   '{}'::jsonb, 'budget_band', 0, 'both', true, 60),

  -- Step 7: timeline
  ('timeline', 7, 'select',
   'When are you looking to act?',
   NULL,
   '[
     {"value":"now","label":"Now","emoji":"⚡"},
     {"value":"1_3_months","label":"1–3 months","emoji":"📅"},
     {"value":"3_6_months","label":"3–6 months","emoji":"📆"},
     {"value":"6_12_months","label":"6–12 months","emoji":"🗓️"},
     {"value":"researching","label":"Just researching","emoji":"📚"}
   ]'::jsonb,
   '{}'::jsonb, 'timeline', 0, 'both', true, 70)
ON CONFLICT (slug) DO UPDATE SET
  step = EXCLUDED.step,
  kind = EXCLUDED.kind,
  prompt = EXCLUDED.prompt,
  subtitle = EXCLUDED.subtitle,
  options = EXCLUDED.options,
  shown_if = EXCLUDED.shown_if,
  maps_to = EXCLUDED.maps_to,
  risk_weight = EXCLUDED.risk_weight,
  mode = EXCLUDED.mode,
  enabled = EXCLUDED.enabled,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

COMMIT;
