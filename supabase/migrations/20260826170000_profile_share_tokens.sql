-- ============================================================================
-- Migration: 20260826170000_profile_share_tokens.sql
-- Purpose: Investor profile share tokens. An investor generates a short-lived
--          opaque token that embeds a read-only snapshot of their goals, quiz
--          results, watchlist, and latest health score. The token is shared
--          with an advisor (via URL) so they can view the investor's profile
--          without needing account access.
--
--          Key design decisions:
--          - snapshot_json is a point-in-time copy — never updated.
--          - Token is 192-bit random hex (24 bytes via gen_random_bytes).
--          - expires_at defaults to 30 days (longer than handoffs — advisor
--            may not action immediately).
--          - consumed_at is stamped on first read; further reads still succeed
--            but flag the token as viewed so the investor can see it was opened.
--          - No anon SELECT policy — token IS the auth factor; service_role
--            reads it. Investor can read their own past shares.
--
-- Risk: low — additive table only.
-- Rollback:
--   BEGIN;
--     DROP POLICY IF EXISTS "profile_share_tokens owner select" ON public.profile_share_tokens;
--     DROP POLICY IF EXISTS "profile_share_tokens owner insert" ON public.profile_share_tokens;
--     DROP POLICY IF EXISTS "profile_share_tokens owner delete" ON public.profile_share_tokens;
--     DROP POLICY IF EXISTS "profile_share_tokens service_role" ON public.profile_share_tokens;
--     DROP INDEX  IF EXISTS idx_profile_share_tokens_token;
--     DROP INDEX  IF EXISTS idx_profile_share_tokens_user_id;
--     DROP TABLE  IF EXISTS public.profile_share_tokens CASCADE;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_share_tokens (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 192-bit opaque token (24 random bytes encoded as 48 hex chars).
  token        text        NOT NULL UNIQUE,
  -- Point-in-time snapshot of the investor's goals/quiz/watchlist/health.
  snapshot_json jsonb      NOT NULL DEFAULT '{}'::jsonb,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Stamped once on first read so the investor can see it was opened.
  consumed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_profile_share_tokens_token
  ON public.profile_share_tokens (token);

CREATE INDEX IF NOT EXISTS idx_profile_share_tokens_user_id
  ON public.profile_share_tokens (user_id, created_at DESC);

ALTER TABLE public.profile_share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_share_tokens FORCE ROW LEVEL SECURITY;

-- Owner can read their own tokens (to list past shares + see consumed_at).
DROP POLICY IF EXISTS "profile_share_tokens owner select" ON public.profile_share_tokens;
CREATE POLICY "profile_share_tokens owner select"
  ON public.profile_share_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner can insert (create) a token for themselves only.
DROP POLICY IF EXISTS "profile_share_tokens owner insert" ON public.profile_share_tokens;
CREATE POLICY "profile_share_tokens owner insert"
  ON public.profile_share_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owner can revoke (delete) their own tokens.
DROP POLICY IF EXISTS "profile_share_tokens owner delete" ON public.profile_share_tokens;
CREATE POLICY "profile_share_tokens owner delete"
  ON public.profile_share_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role has full access (needed for anonymous token read path — the
-- consumer presents the opaque token as auth factor; no JWT is available.
-- Mirrors the investor_handoffs service_role policy).
DROP POLICY IF EXISTS "profile_share_tokens service_role" ON public.profile_share_tokens;
CREATE POLICY "profile_share_tokens service_role"
  ON public.profile_share_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
