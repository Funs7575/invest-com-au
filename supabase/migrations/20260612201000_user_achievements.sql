-- Migration: user_achievements — Consumer Quests & Achievements (idea #19).
--
-- An earned-achievement system for investors: tiered quests bound to real
-- account ACTIONS (saving a profile, adding holdings, setting a goal,
-- creating a rate alert, adding a watchlist item, bookmarking, finishing
-- the quiz, posting a brief, importing a portfolio CSV). Each completed
-- quest walks the user through a feature that creates SAVED STATE — every
-- award literally deepens the per-user data moat. Quests reward SETUP
-- actions only; they never reward investment performance.
--
-- One row per (user_id, quest_id). The award path is server-side and
-- idempotent: awardIfEligible() in lib/quests-server.ts does an
-- INSERT ... ON CONFLICT (user_id, quest_id) DO NOTHING, so re-firing the
-- same trigger (a user adding a 4th holding, re-saving a profile) never
-- stacks duplicates and never errors.
--
-- quest_id is TEXT and code-defined (lib/quests.ts is the registry) rather
-- than a DB enum, so adding/retiring a quest is a code change with no
-- schema migration — mirrors how advisor_badges.badge_type is a free-text
-- code-defined key.
--
-- Feature gating: the whole feature is dormant behind the `consumer_quests`
-- feature flag (fail-closed). isFlagEnabled() is checked INSIDE
-- awardIfEligible() and around the dashboard badge shelf, so this table can
-- ship ahead of the entry points being enabled — with the flag off nothing
-- reads or writes it and the host actions (profile save, holdings insert,
-- …) are completely unaffected even while the table is absent in prod.
--
-- RLS: awards are written SERVER-SIDE only (service-role, after the host
-- action succeeds), so users get a read-only owner SELECT policy
-- (auth.uid() = user_id) to render their own badge shelf, plus a
-- service_role ALL policy for the award writes + any cron/digest reads
-- that fan out across users with no JWT available. There is deliberately
-- no authenticated INSERT/UPDATE/DELETE policy — users cannot self-grant
-- or tamper with achievements.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.user_achievements;

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  -- Code-defined quest key (see lib/quests.ts). Free text, not an enum, so
  -- the registry can evolve without a migration.
  quest_id text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  -- Optional award context (e.g. { "holdings_count": 3 } for three-holdings,
  -- { "brief_id": 42 } for first-brief-posted). Never load-bearing — the
  -- badge shelf renders from the registry + the row's existence alone.
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, quest_id)
);

-- The badge shelf reads all of a user's awards newest-first.
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON public.user_achievements (user_id, awarded_at DESC);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Owner read: a signed-in user can see their own earned achievements.
DROP POLICY IF EXISTS "user_achievements_own_read" ON public.user_achievements;
CREATE POLICY "user_achievements_own_read"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Service role: award writes (post-action, fire-and-forget) + cross-user
-- reads for the digest/cron surfaces. No authenticated write policy exists,
-- so awards can only be granted server-side.
DROP POLICY IF EXISTS "user_achievements_service_all" ON public.user_achievements;
CREATE POLICY "user_achievements_service_all"
  ON public.user_achievements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
