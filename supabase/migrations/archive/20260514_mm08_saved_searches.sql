-- =============================================================================
-- Migration: MM-08 — saved_searches data model
-- Date:       2026-05-14
-- Stream:     account / re-engagement (saved searches + email digest)
--
-- Why: signed-in users can save a `/advisors` or `/teams` filter combination
--   and receive a daily/weekly digest email when new providers match. The
--   table holds the filter snapshot, alert preferences, and a per-row
--   `last_match_signature` (sha256 of sorted match ids) used by the cron to
--   suppress redundant alerts when nothing new has matched since last fire.
--
-- Design decisions:
--   - `kind` constrained to 'advisors' | 'teams' | 'invest'. The cron only
--     re-runs 'advisors' and 'teams' for now — 'invest' is reserved for a
--     follow-up.
--   - `filters jsonb` holds the search-form payload verbatim (state, types,
--     budget_band, etc). Schema validation lives at the API layer so we can
--     evolve filter UI without DB migrations.
--   - `email_frequency` covers 'off' (saved but no email), 'daily',
--     'weekly'. Default 'daily' — re-engagement is the founder ROI.
--   - `last_alerted_at` + `last_match_signature` are the cron's idempotency
--     pair. The cron skips a row whose signature equals the previous run's.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + IF NOT EXISTS on indexes.
--   ENABLE/FORCE ROW LEVEL SECURITY is idempotent. DROP POLICY IF EXISTS
--   before each CREATE POLICY. Safe to re-run.
--
-- Rollback:
--   BEGIN;
--     DROP POLICY IF EXISTS "users can manage own saved_searches" ON public.saved_searches;
--     DROP POLICY IF EXISTS "service_role full access"            ON public.saved_searches;
--     ALTER TABLE public.saved_searches DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.saved_searches; -- only on a clean rebuild
--   COMMIT;
--
-- IMPORTANT — prior policy state: no prior CREATE POLICY on saved_searches
--   in any migration (table did not exist). Confirmed via grep.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id                    bigserial    PRIMARY KEY,
  user_id               uuid         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind                  text         NOT NULL
                                     CHECK (kind IN ('advisors', 'teams', 'invest')),
  label                 text         NOT NULL,
  filters               jsonb        NOT NULL DEFAULT '{}'::jsonb,
  email_frequency       text         NOT NULL DEFAULT 'daily'
                                     CHECK (email_frequency IN ('off', 'daily', 'weekly')),
  last_alerted_at       timestamptz,
  last_match_signature  text,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON public.saved_searches (user_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_kind_frequency
  ON public.saved_searches (kind, email_frequency);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches FORCE  ROW LEVEL SECURITY;

-- Users can fully manage their own rows; everyone else's are invisible.
DROP POLICY IF EXISTS "users can manage own saved_searches" ON public.saved_searches;
CREATE POLICY "users can manage own saved_searches"
  ON public.saved_searches
  FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service-role full access for the daily digest cron + admin tooling.
DROP POLICY IF EXISTS "service_role full access" ON public.saved_searches;
CREATE POLICY "service_role full access"
  ON public.saved_searches
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
