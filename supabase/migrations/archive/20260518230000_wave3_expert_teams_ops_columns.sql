-- ============================================================================
-- Migration: 20260518230000_wave3_expert_teams_ops_columns.sql
-- Purpose: Wave-3 squad ops infrastructure for /teams/[slug].
--
--   1. expert_teams.specialty_tags text[] — finer-grained matching tags
--      beyond team_category (e.g. "nsw_coastal", "lrba", "first_smsf").
--      Surfaced on the team profile + comparison page; brief_routing_rules
--      can match on these.
--   2. expert_teams.auto_claim_mode text — opt-in round-robin auto-claim
--      so high-volume squads can stop manually triaging. 'manual' (default)
--      preserves existing behaviour.
--   3. expert_teams.auto_claim_member_ids integer[] — rotation pool.
--   4. expert_teams.last_auto_claim_index integer — round-robin pointer.
--   5. team_brief_assignments.role text — extends the (existing claimer-only)
--      assignment surface to support 'shadow' (junior member observing the
--      brief without claim rights). Backs the mentorship UI.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + DROP CONSTRAINT IF EXISTS / ADD.
-- Rollback (destructive):
--   ALTER TABLE expert_teams DROP COLUMN IF EXISTS specialty_tags,
--     DROP COLUMN IF EXISTS auto_claim_mode,
--     DROP COLUMN IF EXISTS auto_claim_member_ids,
--     DROP COLUMN IF EXISTS last_auto_claim_index;
--   ALTER TABLE team_brief_assignments DROP COLUMN IF EXISTS role;
-- ============================================================================

BEGIN;

ALTER TABLE public.expert_teams
  ADD COLUMN IF NOT EXISTS specialty_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS auto_claim_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS auto_claim_member_ids integer[] NOT NULL DEFAULT '{}'::integer[],
  ADD COLUMN IF NOT EXISTS last_auto_claim_index integer NOT NULL DEFAULT 0;

ALTER TABLE public.expert_teams
  DROP CONSTRAINT IF EXISTS expert_teams_auto_claim_mode_check;
ALTER TABLE public.expert_teams
  ADD CONSTRAINT expert_teams_auto_claim_mode_check
  CHECK (auto_claim_mode IN ('manual', 'round_robin'));

CREATE INDEX IF NOT EXISTS idx_expert_teams_specialty_tags
  ON public.expert_teams USING GIN (specialty_tags);

ALTER TABLE public.team_brief_assignments
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'claimer';

ALTER TABLE public.team_brief_assignments
  DROP CONSTRAINT IF EXISTS team_brief_assignments_role_check;
ALTER TABLE public.team_brief_assignments
  ADD CONSTRAINT team_brief_assignments_role_check
  CHECK (role IN ('claimer', 'shadow'));

CREATE INDEX IF NOT EXISTS idx_team_brief_assignments_role
  ON public.team_brief_assignments (brief_id, role);

COMMIT;
