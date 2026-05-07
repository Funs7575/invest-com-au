-- =============================================================
-- Date: 2026-05-07
-- Audit ref: IA refactor — Compare / Browse / Experts / Match / Request
-- Why: /invest/funds/[slug] gains an Eligibility & disclosure band
--      with up to 8 conditional pills. Three of them surface fields
--      that don't yet exist on fund_listings: pds_url, im_url,
--      expression_of_interest_only. Adding nullable columns first
--      lets the detail-page render code ship safely (optional-chained
--      reads — pre-migration deploys just don't render those pills).
-- Rollback:
--   ALTER TABLE public.fund_listings
--     DROP COLUMN IF EXISTS pds_url,
--     DROP COLUMN IF EXISTS im_url,
--     DROP COLUMN IF EXISTS expression_of_interest_only;
-- RLS: fund_listings RLS policies are unchanged. New columns inherit
--      the existing policy set (anon SELECT on status='active' rows;
--      service-role full access).
-- =============================================================

ALTER TABLE public.fund_listings
  ADD COLUMN IF NOT EXISTS pds_url TEXT,
  ADD COLUMN IF NOT EXISTS im_url TEXT,
  ADD COLUMN IF NOT EXISTS expression_of_interest_only BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.fund_listings.pds_url IS
  'Public URL to the fund Product Disclosure Statement, when available. Surfaced as a "PDS available" eligibility pill on the detail page.';
COMMENT ON COLUMN public.fund_listings.im_url IS
  'Public URL to the fund Information Memorandum, when available. Surfaced as an "IM available" eligibility pill on the detail page.';
COMMENT ON COLUMN public.fund_listings.expression_of_interest_only IS
  'When true, the fund accepts expressions of interest only (no direct subscription). Surfaces an "Expression of interest only" pill and gates the detail-page CTA copy.';
