-- ============================================================================
-- Migration: Add structured-answer columns to public.quiz_leads
-- Date:      2026-05-02
-- Audit ref: docs/audits/quiz-cross-sell-audit.md (deep-dive 2026-05-02)
--
-- Purpose
--   The quiz funnel collects rich profile data — goal, mode, experience,
--   amount, priority, complexity, advisor_type, property sub-type, and
--   location/visa/country fields for international users — but only stores
--   a flattened string[] in `answers (jsonb)` plus the legacy text columns
--   `experience_level`, `investment_range`, `trading_interest` (which were
--   built for a 4-question quiz).
--
--   This means downstream consumers (drip cron, /best pre-filtering, future
--   personalisation surfaces) can't query by goal/amount/complexity without
--   parsing JSON. It also means inferred_vertical is set from
--   `tradingInterest` only — leaving super, property, home, automate,
--   advisor and international users mis-categorised or NULL.
--
--   This migration adds queryable structured columns mirroring the
--   UnifiedAnswers shape in app/quiz/page.tsx so the drip cron can render
--   vertical-aware templates and future flows can read the user's goal
--   directly.
--
-- Forward-only / additive
--   Pure ALTER TABLE ADD COLUMN IF NOT EXISTS — no data shaping, no
--   constraint changes. Existing rows get NULL for the new columns; new
--   inserts populate them via the updated /api/quiz-lead route.
--
-- RLS unchanged
--   `quiz_leads` already has service_role-only RLS (see
--   20260603120001_a02_backfill_lead_quiz_leads.sql). All callers use the
--   admin client; deny-anon-by-default is preserved.
--
-- Risk: low
--   - Idempotent ADD COLUMN IF NOT EXISTS for every column.
--   - No NOT NULL constraints — old rows remain valid.
--   - Type generation (lib/database.types.ts) is regenerated separately;
--     route handlers use admin client which doesn't enforce column types
--     at runtime, so the migration can land before regen.
--
-- Rollback
--   BEGIN;
--     ALTER TABLE public.quiz_leads
--       DROP COLUMN IF EXISTS goal,
--       DROP COLUMN IF EXISTS mode,
--       DROP COLUMN IF EXISTS experience,
--       DROP COLUMN IF EXISTS amount,
--       DROP COLUMN IF EXISTS priority,
--       DROP COLUMN IF EXISTS complexity,
--       DROP COLUMN IF EXISTS advisor_type,
--       DROP COLUMN IF EXISTS property_sub,
--       DROP COLUMN IF EXISTS location,
--       DROP COLUMN IF EXISTS investor_country,
--       DROP COLUMN IF EXISTS visa_status,
--       DROP COLUMN IF EXISTS investor_goal_intl;
--   COMMIT;
-- ============================================================================

BEGIN;

ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS goal               text,
  ADD COLUMN IF NOT EXISTS mode               text,
  ADD COLUMN IF NOT EXISTS experience         text,
  ADD COLUMN IF NOT EXISTS amount             text,
  ADD COLUMN IF NOT EXISTS priority           text,
  ADD COLUMN IF NOT EXISTS complexity         text,
  ADD COLUMN IF NOT EXISTS advisor_type       text,
  ADD COLUMN IF NOT EXISTS property_sub       text,
  ADD COLUMN IF NOT EXISTS location           text,
  ADD COLUMN IF NOT EXISTS investor_country   text,
  ADD COLUMN IF NOT EXISTS visa_status        text,
  ADD COLUMN IF NOT EXISTS investor_goal_intl text;

-- Indexes for the columns the drip cron + /best pre-filter will read most.
-- `inferred_vertical` already exists; we add an index now that real values
-- (super/property/crypto/...) will populate it instead of just trading_interest.
CREATE INDEX IF NOT EXISTS quiz_leads_inferred_vertical_idx
  ON public.quiz_leads (inferred_vertical)
  WHERE inferred_vertical IS NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_leads_goal_idx
  ON public.quiz_leads (goal)
  WHERE goal IS NOT NULL;

-- Drip cron filters by drip_step + captured_at + unsubscribed; a partial
-- index on the active drip-eligible window keeps the daily scan fast even
-- as quiz_leads grows.
CREATE INDEX IF NOT EXISTS quiz_leads_drip_active_idx
  ON public.quiz_leads (captured_at)
  WHERE unsubscribed IS NOT TRUE AND converted_at IS NULL;

COMMIT;
