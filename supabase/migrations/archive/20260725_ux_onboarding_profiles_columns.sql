-- =============================================================================
-- Migration: UX onboarding — extend public.profiles with onboarding columns
-- Date:       2026-05-14
-- Audit ref:  /onboarding "Something went wrong on our end" 500
--
-- Why: app/api/user-profile/route.ts was written against a non-existent
--   `user_profiles` table. The actual user-profile table is `public.profiles`
--   (auto-populated for every signup by the on_auth_user_created trigger).
--   The PUT path of /api/user-profile upserts into the wrong table → returns
--   500 → onboarding's "Finish" button silently does nothing on success and
--   surfaces the literal API error string in DevTools / network tab.
--
--   The personalised-digest cron also targets the missing table and silently
--   selects zero users, so weekly digest emails have never been sent.
--
-- Design decisions:
--   - Extend the existing `profiles` table rather than introducing a parallel
--     `user_profiles`. One profile row per user is cohesive with the existing
--     stripe_customer_id / email_* columns already on it.
--   - All new columns nullable. `onboarding_completed` defaults to false so
--     existing rows correctly appear as not-onboarded.
--   - `interested_in` is TEXT[] to match the API's array slice (max 8 values)
--     and the cron's array-membership read pattern.
--   - No CHECK constraints — the API enforces enums via Zod and the route
--     filters arrays via the VALID_INTERESTS allow-list, so DB-side enums
--     would just couple deploys without adding safety.
--   - Adds an INSERT policy: the auth trigger seeds a row on signup, so
--     normal upserts hit the UPDATE path. The INSERT policy covers the
--     edge case where a user exists in auth.users without a profiles row
--     (e.g. trigger backfilled differently) so the upsert can self-heal.
--
-- Rollback: drop the added columns and the INSERT policy.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url            TEXT,
  ADD COLUMN IF NOT EXISTS investing_experience  TEXT,
  ADD COLUMN IF NOT EXISTS investment_goals      TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_size        TEXT,
  ADD COLUMN IF NOT EXISTS interested_in         TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_broker      TEXT,
  ADD COLUMN IF NOT EXISTS state                 TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed  BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.profiles'::regclass
      AND polname  = 'Users insert own profile'
  ) THEN
    CREATE POLICY "Users insert own profile"
      ON public.profiles
      FOR INSERT
      WITH CHECK ((SELECT auth.uid()) = id);
  END IF;
END $$;
