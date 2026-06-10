-- ============================================================================
-- Migration: x5g_sharesight_oauth_connections — investor OAuth connections
-- Date:      2026-05-18 (live applied) / backfilled into git 2026-05-19
-- Plan ref:  docs/plans/pre-launch-wave-master-prompt.md (W2.11 / PR-X5g)
--
-- Purpose
--   Storage for per-user OAuth credentials used to pull holdings from
--   external portfolio platforms. v1 supports Sharesight only (CHECK
--   constraint enforces the allowlist); CDR / broker APIs will widen the
--   allowlist when they ship.
--
--   This table is consumed by lib/sharesight/sync.ts via the user-scoped
--   Supabase client (RLS scopes each row to auth.uid()). The companion
--   routes live under app/api/account/holdings/sharesight/*.
--
--   Status: this migration was applied to live Supabase via the MCP on
--   2026-05-18 BUT the file was not checked in, leading to schema drift
--   between live and a fresh-rebuild env. This file backfills the live
--   shape verbatim so test branches + local Supabase reproduce production.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access investor_oauth_connections" ON public.investor_oauth_connections;
--     DROP POLICY IF EXISTS "investor reads own oauth connections"   ON public.investor_oauth_connections;
--     DROP POLICY IF EXISTS "investor inserts own oauth connections" ON public.investor_oauth_connections;
--     DROP POLICY IF EXISTS "investor updates own oauth connections" ON public.investor_oauth_connections;
--     DROP POLICY IF EXISTS "investor deletes own oauth connections" ON public.investor_oauth_connections;
--     ALTER TABLE public.investor_oauth_connections DISABLE ROW LEVEL SECURITY;
--     DROP INDEX IF EXISTS public.idx_investor_oauth_connections_user;
--     DROP TABLE public.investor_oauth_connections;  -- DESTRUCTIVE
--   COMMIT;
--
-- RLS (matches live)
--   - service_role: explicit FOR ALL allow.
--   - authenticated SELECT/INSERT/UPDATE/DELETE scoped by auth.uid().
--   - FORCE ROW LEVEL SECURITY — denies any future hand-written query
--     that forgets to set the role; even superuser DML observes RLS.
--   - No anon access — OAuth tokens are private to the authenticated user.
--
-- Token storage
--   `access_token_enc` and `refresh_token_enc` are NEVER written in
--   plaintext. lib/sharesight/token-crypto.ts AES-256-GCM-encrypts both
--   columns; the `_enc` suffix is the convention that signals this.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing table (live env)
--   - ENABLE / FORCE ROW LEVEL SECURITY — no-op if already enabled
--   - DROP POLICY IF EXISTS + CREATE POLICY — safe to re-run
--   - CREATE INDEX IF NOT EXISTS — no-op on existing index
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_oauth_connections (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider            text NOT NULL CHECK (provider IN ('sharesight')),
  access_token_enc    text NOT NULL,
  refresh_token_enc   text,
  expires_at          timestamptz NOT NULL,
  scope               text,
  external_account_id text,
  connected_at        timestamptz NOT NULL DEFAULT now(),
  last_synced_at      timestamptz,
  last_sync_error     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investor_oauth_connections_user_provider_uniq
    UNIQUE (auth_user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_investor_oauth_connections_user
  ON public.investor_oauth_connections (auth_user_id);

ALTER TABLE public.investor_oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_oauth_connections FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investor reads own oauth connections"
  ON public.investor_oauth_connections;
CREATE POLICY "investor reads own oauth connections"
  ON public.investor_oauth_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor inserts own oauth connections"
  ON public.investor_oauth_connections;
CREATE POLICY "investor inserts own oauth connections"
  ON public.investor_oauth_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor updates own oauth connections"
  ON public.investor_oauth_connections;
CREATE POLICY "investor updates own oauth connections"
  ON public.investor_oauth_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor deletes own oauth connections"
  ON public.investor_oauth_connections;
CREATE POLICY "investor deletes own oauth connections"
  ON public.investor_oauth_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "service_role full access investor_oauth_connections"
  ON public.investor_oauth_connections;
CREATE POLICY "service_role full access investor_oauth_connections"
  ON public.investor_oauth_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
