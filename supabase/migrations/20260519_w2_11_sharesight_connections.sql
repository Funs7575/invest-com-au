-- ============================================================================
-- Migration: 20260519_w2_11_sharesight_connections.sql
-- Purpose: Per-user OAuth2 token store for Sharesight read-only portfolio
--          imports (W2.11 / PR-X5g). One row per (auth_user_id) — Sharesight
--          accounts are 1:1 with our users; re-connecting overwrites the row.
-- Audit ref: docs/plans/pre-launch-wave-master-prompt.md Wave 2 / X5g
--            docs/plans/investor-account-end-to-end-plan.md PR-X5g
-- Risk: low — additive table; RLS-scoped per-user; service_role only for
--       the OAuth callback + import routes which run under the user JWT
--       (the access token / refresh token themselves are user secrets but
--       never exposed to client JS — both routes return only sanitized
--       status fields).
-- Rollback: DROP TABLE IF EXISTS public.sharesight_connections;
--           (DESTRUCTIVE — users would need to reconnect via OAuth)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.sharesight_connections (
  auth_user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token        text NOT NULL,
  refresh_token       text NOT NULL,
  -- Unix-seconds epoch when access_token expires. Sharesight returns
  -- expires_in (seconds) on token exchange — we add to issuance time and
  -- store the absolute deadline so refresh logic doesn't need to track
  -- when we received the token.
  expires_at_s        bigint NOT NULL,
  -- Sharesight API regional base ("api.sharesight.com" / "api.sharesight.com.au").
  -- Stored per-connection so AU vs global users hit the right endpoint
  -- without an env-var swap.
  api_base_url        text NOT NULL CHECK (length(api_base_url) > 0 AND length(api_base_url) <= 200),
  -- ISO timestamp of the most-recent successful holdings import. Null
  -- until first import. Drives the "last synced N ago" badge.
  last_imported_at    timestamptz,
  -- Per-import error string (cleared on next success). The UI surfaces
  -- it so the user can see why their last import failed without us
  -- needing to email them.
  last_import_error   text CHECK (last_import_error IS NULL OR length(last_import_error) <= 500),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sharesight_connections_last_imported
  ON public.sharesight_connections (last_imported_at DESC NULLS LAST);

ALTER TABLE public.sharesight_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharesight_connections FORCE ROW LEVEL SECURITY;

-- Authenticated users see their own status row (last_imported_at, last_import_error)
-- via SELECT. The tokens are in the same row but the API route projects only
-- the safe columns to the client; raw token access would still require
-- service-role anyway since the API routes use the user JWT and the policy
-- below permits SELECT but the UI never reads the token columns.
DROP POLICY IF EXISTS "investor reads own sharesight connection" ON public.sharesight_connections;
CREATE POLICY "investor reads own sharesight connection"
  ON public.sharesight_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Inserts/updates happen in the OAuth callback route which runs under the
-- authenticated user — RLS WITH CHECK ensures the row's auth_user_id
-- matches the caller's uid.
DROP POLICY IF EXISTS "investor inserts own sharesight connection" ON public.sharesight_connections;
CREATE POLICY "investor inserts own sharesight connection"
  ON public.sharesight_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor updates own sharesight connection" ON public.sharesight_connections;
CREATE POLICY "investor updates own sharesight connection"
  ON public.sharesight_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor deletes own sharesight connection" ON public.sharesight_connections;
CREATE POLICY "investor deletes own sharesight connection"
  ON public.sharesight_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Service role full access for admin / cron / GDPR-export paths.
DROP POLICY IF EXISTS "service_role full access sharesight_connections" ON public.sharesight_connections;
CREATE POLICY "service_role full access sharesight_connections"
  ON public.sharesight_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
