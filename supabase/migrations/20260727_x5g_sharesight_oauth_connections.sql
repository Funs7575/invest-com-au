-- ============================================================================
-- Migration: 20260727_x5g_sharesight_oauth_connections.sql
-- Purpose:   Persist per-user OAuth tokens for Sharesight portfolio import
--            (W2.11 / PR-X5g). One row per (user, provider). Sharesight is
--            the first provider; the schema is provider-agnostic so future
--            integrations (Selfwealth API, Stake API, etc.) reuse the table.
-- Audit ref: docs/plans/investor-account-end-to-end-plan.md PR-X5g
--            docs/plans/pre-launch-wave-master-prompt.md W2.11
-- Risk: low — additive table, deny-all-anon RLS, owner-only authenticated
--             access, service_role escape hatch for cron sync paths.
-- Rollback: DROP TABLE IF EXISTS public.investor_oauth_connections;
--           (DESTRUCTIVE — users must re-connect Sharesight after restore.)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_oauth_connections (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider            text NOT NULL CHECK (provider IN ('sharesight')),
  -- AES-256-GCM envelopes; never plaintext. Encrypted with INVESTOR_OAUTH_KEY.
  access_token_enc    text NOT NULL,
  refresh_token_enc   text,
  -- Absolute expiry of the access token. Refresh once `now() >= expires_at`.
  expires_at          timestamptz NOT NULL,
  scope               text,
  -- Sharesight's primary portfolio id, captured at connect time to avoid
  -- a per-sync round trip. Nullable for providers that don't have a
  -- portfolio concept.
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

-- Service role: webhook / cron / token-refresh / GDPR-export paths.
DROP POLICY IF EXISTS "service_role full access investor_oauth_connections"
  ON public.investor_oauth_connections;
CREATE POLICY "service_role full access investor_oauth_connections"
  ON public.investor_oauth_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
