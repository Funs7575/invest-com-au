-- Country Mode Phase 4: country eligibility on brokers + professionals.
--
-- Adds a JSONB `country_eligibility` column to both tables capturing which
-- ISO 3166-1 alpha-2 countries the broker/advisor accepts, blocks, or
-- requires a visa for. Phase 1 + 2 already shipped country configs at the
-- 12-country level; this column is the per-broker / per-advisor refinement
-- so /best/[slug] and the advisor directory can filter by the visitor's
-- detected country (priority chain in lib/country-mode/).
--
-- Shape (validated by CHECK constraint):
--   {
--     "allowed_countries": ["GB", "HK", "SG"],   -- explicit accept list
--     "blocked_countries": ["US"],                -- explicit reject list
--     "visa_required":     ["CN"],                -- visa/residency gated
--     "verified_at": "2026-05-08T00:00:00Z",     -- when last verified
--     "notes": null                              -- optional free-form
--   }
--
-- Empty `{}` is the default and means "no eligibility metadata yet — fall
-- back to AU-only assumption upstream". Country code arrays must be ISO
-- 3166-1 alpha-2 (two uppercase letters); the CHECK constraint enforces
-- shape, not the values themselves (catalogue lives in
-- lib/intent-context.ts).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, DROP/ADD CONSTRAINT guarded.
-- Safe to re-run.
--
-- RLS: brokers + professionals already have anon SELECT policies; the new
-- column is picked up automatically. No new policies needed.
--
-- ROLLBACK STRATEGY (forward-only in prod, but for staging / local):
--   ALTER TABLE brokers       DROP CONSTRAINT IF EXISTS brokers_country_eligibility_shape_check;
--   ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_country_eligibility_shape_check;
--   DROP INDEX IF EXISTS idx_brokers_country_eligibility;
--   DROP INDEX IF EXISTS idx_professionals_country_eligibility;
--   ALTER TABLE brokers       DROP COLUMN IF EXISTS country_eligibility;
--   ALTER TABLE professionals DROP COLUMN IF EXISTS country_eligibility;
-- Risk: any code path reading .country_eligibility 500s. Grep before drop.

-- ── brokers ──────────────────────────────────────────────────────────
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS country_eligibility JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE brokers
  DROP CONSTRAINT IF EXISTS brokers_country_eligibility_shape_check;

ALTER TABLE brokers
  ADD CONSTRAINT brokers_country_eligibility_shape_check CHECK (
    jsonb_typeof(country_eligibility) = 'object'
    AND (NOT country_eligibility ? 'allowed_countries' OR jsonb_typeof(country_eligibility->'allowed_countries') = 'array')
    AND (NOT country_eligibility ? 'blocked_countries' OR jsonb_typeof(country_eligibility->'blocked_countries') = 'array')
    AND (NOT country_eligibility ? 'visa_required'     OR jsonb_typeof(country_eligibility->'visa_required')     = 'array')
    AND (NOT country_eligibility ? 'verified_at'       OR jsonb_typeof(country_eligibility->'verified_at')       = 'string')
    AND (NOT country_eligibility ? 'notes'             OR jsonb_typeof(country_eligibility->'notes') IN ('string', 'null'))
  );

-- GIN index so `country_eligibility @> '{"allowed_countries":["GB"]}'` and
-- `country_eligibility ? 'blocked_countries'` filters stay sub-millisecond
-- once the broker table grows.
CREATE INDEX IF NOT EXISTS idx_brokers_country_eligibility
  ON brokers USING GIN (country_eligibility);

COMMENT ON COLUMN brokers.country_eligibility IS
  'Country Mode Phase 4. JSONB: { allowed_countries: ISO-alpha-2[], blocked_countries: ISO-alpha-2[], visa_required: ISO-alpha-2[], verified_at: ISO-8601 string, notes: string|null }. Empty {} means "unverified — assume AU-resident only". See docs/architecture/country-mode.md and lib/country-mode/.';

-- ── professionals ────────────────────────────────────────────────────
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS country_eligibility JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE professionals
  DROP CONSTRAINT IF EXISTS professionals_country_eligibility_shape_check;

ALTER TABLE professionals
  ADD CONSTRAINT professionals_country_eligibility_shape_check CHECK (
    jsonb_typeof(country_eligibility) = 'object'
    AND (NOT country_eligibility ? 'allowed_countries' OR jsonb_typeof(country_eligibility->'allowed_countries') = 'array')
    AND (NOT country_eligibility ? 'blocked_countries' OR jsonb_typeof(country_eligibility->'blocked_countries') = 'array')
    AND (NOT country_eligibility ? 'visa_required'     OR jsonb_typeof(country_eligibility->'visa_required')     = 'array')
    AND (NOT country_eligibility ? 'verified_at'       OR jsonb_typeof(country_eligibility->'verified_at')       = 'string')
    AND (NOT country_eligibility ? 'notes'             OR jsonb_typeof(country_eligibility->'notes') IN ('string', 'null'))
  );

CREATE INDEX IF NOT EXISTS idx_professionals_country_eligibility
  ON professionals USING GIN (country_eligibility);

COMMENT ON COLUMN professionals.country_eligibility IS
  'Country Mode Phase 4. JSONB: { allowed_countries: ISO-alpha-2[], blocked_countries: ISO-alpha-2[], visa_required: ISO-alpha-2[], verified_at: ISO-8601 string, notes: string|null }. Empty {} means unverified — fall back to existing acceptance flags. See docs/architecture/country-mode.md.';
