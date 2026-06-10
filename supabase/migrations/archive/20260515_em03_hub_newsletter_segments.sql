-- =============================================================================
-- Date:         2026-05-15
-- Audit ref:    EM-03 — pre-launch email list building infrastructure
-- Queue item:   em-03-hub-newsletter-infra
-- Why:          Seed one newsletter_segments row per active hub so that the
--               HubNewsletterCapture component and the segment-aware subscribe
--               flow can route signups to the correct list. Without these rows
--               the API rejects segment slugs that don't exist in the table,
--               meaning hub-specific email capture returns 400 errors.
-- Idempotent:   Yes — INSERT ... ON CONFLICT DO NOTHING; safe to re-run.
-- Rollback:     DELETE FROM newsletter_segments WHERE slug IN (...)
--               using the list below. Rows in newsletter_subscriptions that
--               reference these slugs have ON DELETE SET NULL (checked: no FK).
-- Prior state:  Three segments existed pre-migration: 'advisor-insight',
--               'deals', 'weekly'. This migration adds hub-specific rows only.
-- =============================================================================

INSERT INTO public.newsletter_segments (slug, display_name, description)
VALUES
  ('smsf-hub',              'SMSF investors',           'Members interested in self-managed super, contributions, pension phase, and trustee obligations.'),
  ('dividends-hub',         'Dividend investors',        'Members focused on ASX income investing, franking credits, and dividend growth strategies.'),
  ('wholesale-hub',         'Wholesale investors',       'Sophisticated and wholesale investors exploring private markets, unlisted assets, and structured products.'),
  ('private-markets-hub',   'Private markets',           'Members exploring private equity, venture capital, unlisted property, and infrastructure.'),
  ('startup-hub',           'Startup investors',         'Angel investors, VC followers, and founders exploring early-stage equity.'),
  ('first-home-buyer-hub',  'First home buyers',         'Aspiring owners navigating deposits, grants, FHSS, and stamp-duty concessions.'),
  ('property-hub',          'Property investors',        'Residential and commercial property investors across all states.'),
  ('super-hub',             'Super savers',              'Members optimising contributions, fund selection, and retirement projections.'),
  ('redundancy-hub',        'Redundancy recipients',     'Workers navigating ETP rollovers, tax minimisation, and reinvestment after a job loss.'),
  ('inheritance-hub',       'Inheritance recipients',    'Members managing a windfall — estate planning, CGT, and asset allocation.'),
  ('insurance-hub',         'Insurance seekers',         'Members researching life, income-protection, TPD, and trauma cover options.'),
  ('foreign-investment-hub','International investors',   'Expats and cross-border investors managing FIRB, currency, and tax treaty obligations.')
ON CONFLICT (slug) DO NOTHING;
