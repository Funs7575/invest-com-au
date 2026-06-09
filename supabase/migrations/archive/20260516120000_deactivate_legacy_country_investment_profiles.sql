-- Phase 4 of Country Mode: deactivate stale country_investment_profiles rows.
--
-- Background: app/foreign-investment/[country]/page.tsx (the legacy DB-backed
-- renderer) was deleted in the same PR. The 12 IntentCountryCode hubs are
-- now served exclusively by config-driven standalone routes
-- (app/foreign-investment/<slug>/page.tsx + lib/foreign-investment-country-data.ts).
--
-- Routing precedence already meant the standalone files shadowed the dynamic
-- route for these slugs; this migration brings the data layer into line by
-- marking the legacy rows inactive so any future read picks up zero rows
-- rather than a divergent thin shape. See:
--   docs/rfcs/2026-05-08-country-mode-renderer-unification.md
--
-- Idempotent: WHERE clause limits to active=true rows for the 12 ISO codes,
-- so re-running is a no-op once rows are already inactive.
--
-- ROLLBACK:
--   UPDATE public.country_investment_profiles
--   SET active = true
--   WHERE country_code IN (
--     'US','GB','CN','IN','JP','SG','HK','KR','MY','NZ','AE','SA'
--   );
-- Risk: even after rollback the dynamic route is gone, so no surface would
-- read these rows. Rollback is only useful if a future admin tool wants the
-- rows back as draft/seed content.

UPDATE public.country_investment_profiles
SET active = false
WHERE active IS DISTINCT FROM false
  AND country_code IN (
    'US', 'GB', 'CN', 'IN', 'JP', 'SG', 'HK', 'KR', 'MY', 'NZ', 'AE', 'SA'
  );
