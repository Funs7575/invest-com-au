-- ============================================================================
-- Migration: 20260907020000_gm03_intent_provider_noun.sql
-- Purpose: Add `provider_noun` to intent_taxonomy — a plural, directory-grade
--          noun for each intent, used by the /marketplace/[intent]/[state] SEO
--          pages. Intent `label`s are imperative chip copy ("Assess an
--          opportunity") that render as broken English in "Best {x} in {state}"
--          headings; `provider_noun` ("opportunity assessment specialists")
--          slots in cleanly. Mirrors lib/getmatched/intent-presentation.ts
--          (PROVIDER_NOUNS); admins can override per-intent here afterwards.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + UPDATEs keyed by slug, guarded so a
--             re-run never clobbers an admin override. Safe to re-apply.
-- RLS: unchanged — column added to an existing table that already has RLS
--      ("Public can read enabled intents" SELECT + service_role FOR ALL from
--      20260724_gm01_get_matched_router.sql).
--
-- Rollback: ALTER TABLE public.intent_taxonomy DROP COLUMN IF EXISTS provider_noun;
-- Risk: low — additive nullable column + idempotent content backfill.
-- ============================================================================

BEGIN;

ALTER TABLE public.intent_taxonomy
  ADD COLUMN IF NOT EXISTS provider_noun text;

UPDATE public.intent_taxonomy AS t
SET provider_noun = v.noun,
    updated_at = now()
FROM (VALUES
  -- 13 retail goals (gm02)
  ('grow',                  'investing specialists'),
  ('income',                'income & dividend specialists'),
  ('crypto',                'crypto investing specialists'),
  ('trade',                 'trading & CFD specialists'),
  ('automate',              'robo-investing specialists'),
  ('super',                 'super & SMSF specialists'),
  ('property',              'property investment specialists'),
  ('home',                  'mortgage brokers'),
  ('alt_assets',            'alternative asset specialists'),
  ('royalties',             'royalty & income-asset specialists'),
  ('pre_ipo',               'pre-IPO & wholesale deal specialists'),
  ('help',                  'financial experts'),
  ('browse',                'investment specialists'),
  -- niche / advisor / brief slugs (gm01)
  ('compare_platform',      'investing platform specialists'),
  ('start_investing',       'specialists for new investors'),
  ('smsf_property',         'SMSF property specialists'),
  ('buy_property',          'buyer''s agents'),
  ('opportunity_assessment','opportunity assessment specialists'),
  ('business_acquisition',  'business acquisition advisers'),
  ('commercial_property',   'commercial property specialists'),
  ('foreign_investor',      'foreign investment (FIRB) specialists'),
  ('expat_investing',       'expat investment specialists'),
  ('financial_advice',      'financial advisers'),
  ('tax_help',              'tax accountants'),
  ('mortgage_help',         'mortgage brokers'),
  ('legal_help',            'property & investment lawyers'),
  ('second_opinion',        'independent review specialists'),
  ('listing_owner',         'business & asset sale specialists'),
  ('listing_readiness',     'listing preparation specialists'),
  ('not_sure',              'investment specialists'),
  -- NZ intents (mm26)
  ('nz_kiwisaver',          'KiwiSaver advisers'),
  ('nz_property_buy',       'NZ property specialists')
) AS v(slug, noun)
WHERE t.slug = v.slug
  AND (t.provider_noun IS NULL OR t.provider_noun = '');

COMMIT;
