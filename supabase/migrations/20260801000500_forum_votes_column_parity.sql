-- ============================================================================
-- Migration: 20260801000500_forum_votes_column_parity.sql
-- Purpose: Repo↔prod column-name parity for public.forum_votes.
--
--          ROOT CAUSE: forum_votes is created by
--          20260426_wave_launch_readiness.sql with columns `voter_user_id`
--          (uuid) and `vote` (smallint). Prod, however, has long since renamed
--          these to `user_id` (uuid) and `value` (integer) — confirmed against
--          the live database and the regenerated lib/database.types.ts. No
--          repo migration ever performed that rename, so a from-scratch rebuild
--          of supabase/migrations/*.sql ends up with the WRONG column names.
--
--          That drift breaks every later migration / view that reads the
--          prod-correct names — notably 20260825150000_rba_polls.sql and
--          20260826000500_fix_rba_poll_accuracy_output_column.sql, whose
--          rba_poll_accuracy view selects forum_votes.user_id / forum_votes.value.
--
--          This forward migration renames the columns so a fresh rebuild
--          converges on prod. It is timestamped AFTER 20260426 (table created)
--          and BEFORE 20260825150000 (rba_polls + view read the new names),
--          which is the only valid window.
--
--          POLICY NOTE: the forum_votes RLS policies created by
--          20260427_wave_security_observability.sql and
--          20260429_o_iter6_rls_forum.sql reference `voter_user_id`. Postgres
--          automatically rewrites a column reference inside a policy's
--          USING/WITH CHECK expression when the column is RENAMEd, so those
--          policies follow the rename with no extra DDL. (This is exactly what
--          happened in prod — its forum_votes policies now reference `user_id`.)
--
-- PROD-SAFE / IDEMPOTENT: each rename is guarded by a DO block that only fires
--          when the OLD column still exists AND the NEW column does not. On prod
--          (already user_id / value) both renames are NO-OPs. On a fresh rebuild
--          (voter_user_id / vote) both renames fire. Safe to re-apply.
--
--          DO NOT re-apply manually to prod — it is a no-op there, but this file
--          exists purely for rebuild convergence; prod is already correct.
--
-- Rollback:
--   DO $$ BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.columns
--                WHERE table_schema='public' AND table_name='forum_votes'
--                  AND column_name='user_id')
--        AND NOT EXISTS (SELECT 1 FROM information_schema.columns
--                WHERE table_schema='public' AND table_name='forum_votes'
--                  AND column_name='voter_user_id') THEN
--       ALTER TABLE public.forum_votes RENAME COLUMN user_id TO voter_user_id;
--     END IF;
--   END $$;
--   DO $$ BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.columns
--                WHERE table_schema='public' AND table_name='forum_votes'
--                  AND column_name='value')
--        AND NOT EXISTS (SELECT 1 FROM information_schema.columns
--                WHERE table_schema='public' AND table_name='forum_votes'
--                  AND column_name='vote') THEN
--       ALTER TABLE public.forum_votes RENAME COLUMN value TO vote;
--     END IF;
--   END $$;
--   -- Note: rolling back would re-introduce the repo↔prod drift.
-- ============================================================================

BEGIN;

-- 1. voter_user_id → user_id (no-op on prod, which already has user_id).
DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'forum_votes'
          AND column_name = 'voter_user_id'
      )
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'forum_votes'
          AND column_name = 'user_id'
      )
  THEN
    ALTER TABLE public.forum_votes RENAME COLUMN voter_user_id TO user_id;
  END IF;
END $$;

-- 2. vote → value (no-op on prod, which already has value).
DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'forum_votes'
          AND column_name = 'vote'
      )
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'forum_votes'
          AND column_name = 'value'
      )
  THEN
    ALTER TABLE public.forum_votes RENAME COLUMN vote TO value;
  END IF;
END $$;

COMMIT;
