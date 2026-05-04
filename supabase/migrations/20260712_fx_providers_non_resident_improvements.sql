-- =============================================================
-- Date: 2026-05-04
-- Audit ref: conversion-gap audit (non-resident funnel)
-- Why: No FX transfer providers exist in the brokers table despite
--      being the primary conversion path on /foreign-investment/*
--      pages. Additionally, several well-known non-resident-friendly
--      share brokers are incorrectly flagged as accepts_non_residents=false,
--      and the foreign_investor_notes column is referenced in code but
--      missing from the schema.
-- Rollback: DROP COLUMN foreign_investor_notes; DELETE FROM brokers
--           WHERE slug IN ('wise','ofx','worldfirst','torfx','remitly',
--           'currencyfair','airwallex');
--           UPDATE brokers SET accepts_non_residents=false WHERE
--           slug IN ('interactive-brokers','saxo','moomoo','stake');
-- =============================================================

BEGIN;

-- 1. Add foreign_investor_notes column (referenced in code, missing from schema)
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS foreign_investor_notes TEXT;

-- 2. Fix accepts_non_residents flags for well-known non-resident platforms
UPDATE brokers
SET accepts_non_residents = true,
    foreign_investor_notes = CASE slug
      WHEN 'interactive-brokers' THEN
        'Accepts clients from 200+ countries with no Australian address required. The gold standard for non-resident global investing — access ASX, US, European, and Asian markets in one account. Lowest margin rates in Australia.'
      WHEN 'saxo' THEN
        'Accepts non-Australian residents. Strong multi-asset platform (ASX, US, ETFs, options). Minimum deposit applies. Suited to active or high-net-worth non-resident investors.'
      WHEN 'moomoo' THEN
        'Accepts non-resident applications. Strong research and charting tools. Access to ASX and US markets. Popular with expat investors from Hong Kong, Singapore, and the US.'
      WHEN 'stake' THEN
        'Accepts New Zealand and Singapore-based investors. Clean US-first platform with ASX access. Popular with expats and Kiwi investors. No minimum deposit.'
      ELSE foreign_investor_notes
    END
WHERE slug IN ('interactive-brokers', 'saxo', 'moomoo', 'stake');

-- Set notes for existing non-resident brokers that are already flagged correctly
UPDATE brokers SET foreign_investor_notes =
  'Singapore-based robo-adviser accepting non-Australian residents. No local address required. Managed ETF portfolios in AUD.'
WHERE slug = 'syfe' AND foreign_investor_notes IS NULL;

UPDATE brokers SET foreign_investor_notes =
  'Portfolio tracking tool that accepts non-residents. Connects to ASX and international brokers. Essential for non-resident investors tracking Australian holdings.'
WHERE slug = 'sharesight' AND foreign_investor_notes IS NULL;

UPDATE brokers SET foreign_investor_notes =
  'Accepts international investors via Australian AFSL. Access to ASX and global markets with CFDs. High leverage available.'
WHERE slug = 'admirals' AND foreign_investor_notes IS NULL;

UPDATE brokers SET foreign_investor_notes =
  'Accepts non-residents across most jurisdictions. ASX and global CFD/forex access. ASIC regulated.'
WHERE slug = 'city-index' AND foreign_investor_notes IS NULL;

UPDATE brokers SET foreign_investor_notes =
  'ASIC-regulated, accepts non-resident clients. Good entry point for non-residents wanting CFD/forex exposure to Australian markets.'
WHERE slug = 'go-markets' AND foreign_investor_notes IS NULL;

UPDATE brokers SET foreign_investor_notes =
  'Accepts non-residents from 150+ countries. Multi-asset CFD/forex platform. ASIC regulated in Australia.'
WHERE slug = 'vantage' AND foreign_investor_notes IS NULL;

UPDATE brokers SET foreign_investor_notes =
  'Accepts international users. No Australian address required. World''s largest crypto exchange by volume.'
WHERE slug = 'binance-australia' AND foreign_investor_notes IS NULL;

UPDATE brokers SET foreign_investor_notes =
  'Accepts non-resident crypto traders. ASIC-regulated Australian entity. Access to 300+ crypto assets.'
WHERE slug = 'okx-australia' AND foreign_investor_notes IS NULL;

-- 3. Seed FX transfer providers (platform_type = 'fx_provider')
INSERT INTO brokers (
  name, slug, color, platform_type, status,
  accepts_non_residents, affiliate_url, rating, tagline, cta_text, benefit_cta,
  regulated_by, year_founded, headquarters, min_deposit,
  pros, cons
) VALUES
(
  'Wise', 'wise', '#9FE870', 'fx_provider', 'active',
  true, 'https://wise.com/au/', 4.8,
  'Mid-market exchange rate for international money transfers',
  'Send Money with Wise →', 'Mid-market Rate + Low Fees',
  'ASIC (Australia), FCA (UK), FinCEN (USA)', 2011, 'London, UK', 'No minimum',
  '["Mid-market (real) exchange rate — no hidden margin","Transparent per-transfer fee (~0.3–1.5%)","Multi-currency account — hold 40+ currencies","Fast transfers (often same-day to Australia)","Excellent for regular transfers under $200K","No subscription required"]',
  '["Not accepted for property settlement — must use AU bank account","Per-transfer fee model can add up on high-frequency small transfers"]'
),
(
  'OFX', 'ofx', '#1B3A6B', 'fx_provider', 'active',
  true, 'https://www.ofx.com/en-au/', 4.6,
  'No transfer fees on amounts over $1,000 — ideal for large transfers',
  'Compare OFX Rates →', 'No Fees, Expert Dealers',
  'ASIC (Australia), FinCEN (USA), FCA (UK)', 1998, 'Sydney, Australia', 'AUD 1,000',
  '["Zero fees on transfers over $1,000","Competitive rates on large amounts ($100K+)","Forward contracts — lock in today''s rate for future settlement","Dedicated OFX dealers for large property transfers","ASIC-regulated, Australian company","Phone support for complex transfers"]',
  '["$1,000 minimum transfer","Rate margin less competitive for amounts under $10K","Less transparent rates upfront compared to Wise"]'
),
(
  'WorldFirst', 'worldfirst', '#E30613', 'fx_provider', 'active',
  true, 'https://www.worldfirst.com/au/', 4.4,
  'No-fee transfers with dedicated account managers for large amounts',
  'Transfer with WorldFirst →', 'No Fees, Account Managers',
  'ASIC (Australia), FCA (UK)', 2004, 'London, UK', 'AUD 1,000',
  '["No transfer fees","Dedicated personal account managers","Excellent for business and high-net-worth investors","Part of Ant Group (Alibaba) — reliable infrastructure","Forward contracts available","Strong for HKD, SGD, CNH corridors"]',
  '["Better suited to business than retail","Rate transparency less upfront","$1,000 minimum transfer","Less consumer-friendly UI than Wise"]'
),
(
  'TorFX', 'torfx', '#005EB8', 'fx_provider', 'active',
  true, 'https://www.torfx.com/au/', 4.5,
  'Award-winning FX service with personal account managers — no transfer fees',
  'Transfer with TorFX →', 'No Fees + Personal Dealer',
  'ASIC (Australia), FCA (UK)', 2004, 'Penzance, UK', 'No minimum',
  '["No transfer fees","Personal dedicated account manager","Multiple award-winner for FX service","Forward contracts and regular payment plans","Good for large one-off transfers (property deposits)","Rate-match guarantee offered"]',
  '["Less brand recognition than Wise/OFX","Better value for larger amounts — less competitive on small transfers","Phone-based onboarding (not fully digital)"]'
),
(
  'Remitly', 'remitly', '#004EB3', 'fx_provider', 'active',
  true, 'https://www.remitly.com/au/en/', 4.2,
  'Fast consumer transfers, ideal for regular personal amounts',
  'Send with Remitly →', 'Fast & Reliable Transfers',
  'ASIC (Australia)', 2011, 'Seattle, USA', 'No minimum',
  '["Fast — often same-day or next-day","Competitive for personal amounts under $10K","Popular for India, Philippines, Vietnam, China corridors","App-first with clean UX","Promotions for first-time transfers"]',
  '["Lower transfer limits — not suitable for property-scale transfers","Less competitive for amounts over $50K","Not designed for investment use cases"]'
),
(
  'CurrencyFair', 'currencyfair', '#00A550', 'fx_provider', 'active',
  true, 'https://www.currencyfair.com/', 4.3,
  'Peer-to-peer currency exchange — near mid-market rates',
  'Transfer with CurrencyFair →', 'Near Mid-market Rate',
  'Central Bank of Ireland, ASIC (Australia)', 2009, 'Dublin, Ireland', 'No minimum',
  '["Near mid-market rates via P2P matching engine","Transparent pricing — no hidden margins","Good for EUR, GBP, AUD corridors","Suitable for regular scheduled transfers","Flat fee model for smaller transfers"]',
  '["Less liquidity on less-common currency pairs","Not as fast as Wise for urgent transfers","Smaller operation than OFX/Wise"]'
),
(
  'Airwallex', 'airwallex', '#1A1A2E', 'fx_provider', 'active',
  true, 'https://www.airwallex.com/au/', 4.4,
  'Australian-built global payments — ideal for business investors and high volume',
  'Open Airwallex Account →', 'Low-cost Global Payments',
  'ASIC (Australia), FCA (UK)', 2015, 'Melbourne, Australia', 'No minimum',
  '["ASIC-regulated Australian company","Multi-currency accounts in 23+ currencies","Competitive FX rates for business transfers","API access for automated transfers","Excellent for property investors managing multiple currencies","Growing consumer offering"]',
  '["Primarily designed for businesses — retail features still maturing","Onboarding more complex than Wise","Best value for high-volume or business use cases"]'
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
