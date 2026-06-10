-- Date: 2026-05-10
-- Audit ref: KK-04 iter 4 (docs/audits/REMEDIATION_QUEUE.md)
-- Queue item: KK-04 — Automated internal link injection, per-article override
-- Why: Editors need to tune keyword-link density per article without touching
--      code. A nullable integer column lets the admin UI set an exact cap
--      that takes precedence over the category-derived default from
--      lib/keyword-linking.ts linkDensityForCategory(). NULL = use default.
-- Idempotent: ALTER COLUMN is safe to replay; constraint re-creation uses
--             DROP IF EXISTS + ADD CONSTRAINT to stay idempotent.
-- Rollback:
--   ALTER TABLE public.articles DROP COLUMN IF EXISTS link_density_override;

BEGIN;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS link_density_override smallint;

-- Guard against out-of-range values (0 = inject no links, 20 = generous upper
-- bound well above any realistic density target).
ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_link_density_override_range;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_link_density_override_range
    CHECK (link_density_override IS NULL OR (link_density_override >= 0 AND link_density_override <= 20));

COMMIT;
