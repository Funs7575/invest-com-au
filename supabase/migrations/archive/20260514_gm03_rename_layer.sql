-- ============================================================================
-- Migration: 20260514_gm03_rename_layer.sql
-- Purpose: Retail-friendly relabel of consumer-facing template strings.
--          Updates `get_matched_result_templates` so the headline / why_text /
--          primary_cta / secondary_ctas / checklist labels match the new
--          consumer copy in `lib/consumer-copy.ts`. Internal DB columns
--          (route names, intent slugs, brief template slugs) stay unchanged.
--
-- Idempotent: UPDATE … WHERE statements are safe to re-run.
--
-- Rollback: re-run the seed UPDATE from 20260724_gm01 to revert to the
-- original wording.
--
-- Risk: low — content-only, no schema changes.
-- ============================================================================

BEGIN;

UPDATE public.get_matched_result_templates
SET
  primary_cta = '{"label":"Browse Pro Squads","href":"/advisors#expert-teams"}'::jsonb,
  secondary_ctas = '[
    {"label":"Get Quotes from a Pro Squad","href":"/briefs/new"},
    {"label":"Who do I need on my squad?","href":"/articles"}
  ]'::jsonb,
  why_text = 'Your situation usually involves more than one professional. A verified Pro Squad coordinates the work so you don''t — accountant, adviser, broker all in one team.',
  headline = 'Verified Pro Squad',
  updated_at = now()
WHERE route = 'expert_team' AND intent_slug IS NULL;

UPDATE public.get_matched_result_templates
SET
  primary_cta = '{"label":"Browse verified experts","href":"/advisors?provider_type=individual"}'::jsonb,
  secondary_ctas = '[
    {"label":"Or consider a firm","href":"/advisors?provider_type=firm"},
    {"label":"Get Quotes from Verified Experts","href":"/briefs/new"}
  ]'::jsonb,
  updated_at = now()
WHERE route = 'individual' AND intent_slug IS NULL;

UPDATE public.get_matched_result_templates
SET
  primary_cta = '{"label":"Browse firms","href":"/advisors?provider_type=firm"}'::jsonb,
  secondary_ctas = '[
    {"label":"View firm reviews","href":"/advisors"},
    {"label":"Get Quotes from Firms","href":"/briefs/new"}
  ]'::jsonb,
  updated_at = now()
WHERE route = 'firm' AND intent_slug IS NULL;

UPDATE public.get_matched_result_templates
SET
  primary_cta = '{"label":"Get Quotes","href":"/briefs/new"}'::jsonb,
  headline = 'Get Quotes from Verified Pros',
  why_text = 'You''re ready to be contacted by a verified Australian professional. We''ll route your masked Match Request to the right pros — you stay anonymous until you choose to share your details.',
  updated_at = now()
WHERE route = 'investor_brief' AND intent_slug IS NULL;

UPDATE public.get_matched_result_templates
SET
  primary_cta = '{"label":"Sell with Us","href":"/briefs/new?template=listing_readiness"}'::jsonb,
  headline = 'Sell with Us',
  why_text = 'You''re on the seller side. A successful listing usually needs a few moving parts — legal, financial, valuation, marketing. List your deal with us and we''ll route it to the right verified Australian professionals.',
  updated_at = now()
WHERE route = 'listing_brief' AND intent_slug IS NULL;

UPDATE public.get_matched_result_templates
SET
  primary_cta = '{"label":"Get a Second Opinion","href":"/briefs/new?template=second_opinion"}'::jsonb,
  headline = 'Get a Second Opinion',
  why_text = 'You want an independent review of advice or a deal. Verified Australian professionals can review it under their own licence and terms.',
  updated_at = now()
WHERE route = 'second_opinion' AND intent_slug IS NULL;

COMMIT;
