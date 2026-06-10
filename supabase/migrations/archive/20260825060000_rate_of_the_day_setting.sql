-- Migration: 20260825060000_rate_of_the_day_setting.sql
-- Purpose: Seed the rate_of_the_day_broker_slug key in site_settings.
--
-- The homepage HomeRateOfTheDay component reads this key to render an
-- editorial "standout rate" strip. Set value to a broker slug (e.g.
-- 'macquarie-savings') to activate; set to '' to hide the strip.
--
-- Rollback: DELETE FROM site_settings WHERE key = 'rate_of_the_day_broker_slug';

BEGIN;

INSERT INTO site_settings (key, value, updated_at)
VALUES ('rate_of_the_day_broker_slug', '', now())
ON CONFLICT (key) DO NOTHING;

COMMIT;
