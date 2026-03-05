-- Migration: Add property_weight and robo_weight to quiz_weights
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- Step 1: Add the new columns
ALTER TABLE quiz_weights 
  ADD COLUMN IF NOT EXISTS property_weight integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS robo_weight integer DEFAULT 0;

-- Step 2: Update existing rows with researched weights
-- These values are based on actual platform characteristics researched from
-- official pricing pages, Finder, Passive Investing Australia, and ETF Stream.

-- Share brokers: property=0, robo=0 (not relevant)
UPDATE quiz_weights SET property_weight = 0, robo_weight = 0 
WHERE broker_slug IN (
  'interactive-brokers','cmc-markets','stake','moomoo','selfwealth',
  'commsec','superhero','tiger-brokers','ig','saxo','nabtrade',
  'anz-share-investing','webull'
);

-- Crypto exchanges: property=0, robo=0 (not relevant)
UPDATE quiz_weights SET property_weight = 0, robo_weight = 0 
WHERE broker_slug IN (
  'swyftx','coinspot','binance','kraken','btc-markets',
  'coinstash','independent-reserve'
);

-- Robo-advisors: high robo scores, some property via REIT ETF allocations
UPDATE quiz_weights SET property_weight = 2, robo_weight = 10 WHERE broker_slug = 'stockspot';
UPDATE quiz_weights SET property_weight = 2, robo_weight = 9 WHERE broker_slug = 'raiz';
UPDATE quiz_weights SET property_weight = 0, robo_weight = 8 WHERE broker_slug = 'spaceship';
UPDATE quiz_weights SET property_weight = 3, robo_weight = 9 WHERE broker_slug = 'sixpark';
UPDATE quiz_weights SET property_weight = 0, robo_weight = 7 WHERE broker_slug = 'pearler';
UPDATE quiz_weights SET property_weight = 2, robo_weight = 6 WHERE broker_slug = 'vanguard-personal-investor';

-- Super funds: moderate property (unlisted property in balanced options)
UPDATE quiz_weights SET property_weight = 4, robo_weight = 7 WHERE broker_slug = 'australian-super';
UPDATE quiz_weights SET property_weight = 3, robo_weight = 6 WHERE broker_slug = 'hostplus';
UPDATE quiz_weights SET property_weight = 2, robo_weight = 6 WHERE broker_slug = 'rest-super';
UPDATE quiz_weights SET property_weight = 3, robo_weight = 5 WHERE broker_slug = 'aware-super';
UPDATE quiz_weights SET property_weight = 0, robo_weight = 8 WHERE broker_slug = 'spaceship-super';

-- Property platforms: high property scores
UPDATE quiz_weights SET property_weight = 10, robo_weight = 4 WHERE broker_slug = 'brickx';
UPDATE quiz_weights SET property_weight = 9, robo_weight = 2 WHERE broker_slug = 'domacom';
UPDATE quiz_weights SET property_weight = 8, robo_weight = 1 WHERE broker_slug = 'venturecrowd';

-- Research tools: property=0, robo=0 (not relevant)
UPDATE quiz_weights SET property_weight = 0, robo_weight = 0 
WHERE broker_slug IN ('simply-wall-st','tradingview','market-index');

-- CFD/Forex: property=0, robo=0 (not relevant)
UPDATE quiz_weights SET property_weight = 0, robo_weight = 0 
WHERE broker_slug IN ('pepperstone','cmc-markets-cfds','ic-markets','fp-markets');

-- Step 3: Verify the migration
SELECT broker_slug, beginner_weight, low_fee_weight, us_shares_weight, 
       smsf_weight, crypto_weight, advanced_weight, property_weight, robo_weight
FROM quiz_weights 
ORDER BY broker_slug;
