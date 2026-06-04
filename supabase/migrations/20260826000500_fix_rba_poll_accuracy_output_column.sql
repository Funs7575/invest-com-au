-- ============================================================================
-- Migration: 20260826000500_fix_rba_poll_accuracy_output_column.sql
-- Purpose: Repo↔prod parity for the public.rba_poll_accuracy view.
--
--          Prod's rba_poll_accuracy emits `voter_user_id` (aliased from
--          forum_votes.user_id), and the app consumes exactly that column:
--            - app/rba-poll/page.tsx          → .select("voter_user_id, …")
--            - app/api/rba-polls/leaderboard/route.ts → .select("voter_user_id, …")
--
--          But the repo's 20260825150000_rba_polls.sql defines the view to emit
--          `user_id` (not the `voter_user_id` alias prod and the app use). The
--          canonical forum_votes table — per the regenerated
--          lib/database.types.ts which mirrors prod — has columns `user_id` and
--          `value`. So a fresh rebuild from 20260825150000_rba_polls.sql would
--          emit the wrong output column name (`user_id` instead of
--          `voter_user_id`), breaking both consumers.
--
--          This forward migration redefines the view to match prod: it selects
--          forum_votes.user_id aliased to `voter_user_id`, compares
--          forum_votes.value to rba_polls.outcome, and re-grants SELECT.
--
--          ORDERING: this file is deliberately timestamped 20260826000500 —
--          AFTER 20260825150000_rba_polls.sql (which CREATEs public.rba_polls,
--          referenced in the JOIN below) and AFTER
--          20260801000500_forum_votes_column_parity.sql (which renames
--          forum_votes.voter_user_id→user_id and vote→value). Both are required
--          for this CREATE VIEW to resolve. The original 20260604 timestamp
--          sorted this file BEFORE rba_polls existed and aborted a fresh apply
--          with "relation public.rba_polls does not exist". As the last writer
--          of the view, this migration is the source of truth for a rebuild.
--
--          PARITY NOTE: prod ALREADY has this exact view definition — do NOT
--          re-apply this migration to the live database. It exists purely so a
--          from-scratch rebuild of supabase/migrations/*.sql converges on the
--          prod-correct view.
--
-- Idempotent: DROP VIEW IF EXISTS + CREATE VIEW + GRANT (re-grant is a no-op if
--             already granted). Safe to re-apply.
--
-- Rollback:
--   DROP VIEW IF EXISTS public.rba_poll_accuracy;
--   -- then re-run 20260825150000_rba_polls.sql's view block to restore the
--   -- prior (repo) definition. Note prod parity would be lost on rollback.
-- ============================================================================

BEGIN;

DROP VIEW IF EXISTS public.rba_poll_accuracy;

CREATE VIEW public.rba_poll_accuracy AS
SELECT
  fv.user_id AS voter_user_id,
  count(*)::int AS polls_participated,
  sum(CASE WHEN fv.value = rp.outcome THEN 1 ELSE 0 END)::int AS correct_predictions,
  CASE
    WHEN count(*) = 0 THEN 0.0
    ELSE round(
      100.0 * sum(CASE WHEN fv.value = rp.outcome THEN 1 ELSE 0 END)::numeric
        / count(*)::numeric,
      1
    )
  END AS accuracy_pct
FROM public.forum_votes fv
JOIN public.rba_polls rp
  ON rp.id = fv.target_id
 AND fv.target_type = 'rba_poll'
WHERE rp.status = 'revealed'
  AND rp.outcome IS NOT NULL
GROUP BY fv.user_id;

GRANT SELECT ON public.rba_poll_accuracy TO anon, authenticated, service_role;

COMMIT;
