-- ============================================================================
-- Migration: 20260525_investor_handoffs.sql
-- Purpose: Structured advisor handoff tokens. An investor generates a short-
--          lived opaque token that embeds a snapshot of their holdings at that
--          point in time. The token is passed to /find-advisor via the
--          ?handoff= query param so an advisor (or the investor themselves on a
--          different device) can read a read-only summary of what was shared.
--
--          Key design decisions:
--          - holdings_snapshot_json is a point-in-time copy — it never updates.
--          - expires_at defaults to ~14 days; consumed_at is set once the token
--            is read on the advisor-facing side.
--          - Token is a random opaque string (crypto.randomUUID or similar) — no
--            sequential IDs that enumerate rows.
--
-- Risk: low — additive table; no existing data touched.
-- Rollback:
--   BEGIN;
--     DROP POLICY IF EXISTS "investor_handoffs owner select"  ON public.investor_handoffs;
--     DROP POLICY IF EXISTS "investor_handoffs owner insert"  ON public.investor_handoffs;
--     DROP POLICY IF EXISTS "investor_handoffs service_role"  ON public.investor_handoffs;
--     DROP INDEX  IF EXISTS idx_investor_handoffs_token;
--     DROP INDEX  IF EXISTS idx_investor_handoffs_user_id;
--     DROP TABLE  IF EXISTS public.investor_handoffs CASCADE;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_handoffs (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token                 text        NOT NULL UNIQUE,
  holdings_snapshot_json jsonb      NOT NULL DEFAULT '[]'::jsonb,
  intent                text        NOT NULL DEFAULT 'tax-prep',
  expires_at            timestamptz NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  consumed_at           timestamptz
);

CREATE INDEX IF NOT EXISTS idx_investor_handoffs_token
  ON public.investor_handoffs (token);

CREATE INDEX IF NOT EXISTS idx_investor_handoffs_user_id
  ON public.investor_handoffs (user_id);

ALTER TABLE public.investor_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_handoffs FORCE ROW LEVEL SECURITY;

-- Owner can read their own handoffs (e.g. to list them in a future UI).
DROP POLICY IF EXISTS "investor_handoffs owner select" ON public.investor_handoffs;
CREATE POLICY "investor_handoffs owner select"
  ON public.investor_handoffs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner can insert (create) a handoff for themselves.
DROP POLICY IF EXISTS "investor_handoffs owner insert" ON public.investor_handoffs;
CREATE POLICY "investor_handoffs owner insert"
  ON public.investor_handoffs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role has full access (needed for `getHandoff` in lib which uses
-- the anon token path without a JWT — see CLAUDE.md service-role scope notes).
DROP POLICY IF EXISTS "investor_handoffs service_role" ON public.investor_handoffs;
CREATE POLICY "investor_handoffs service_role"
  ON public.investor_handoffs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
