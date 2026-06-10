-- ============================================================================
-- Migration: 20260515_mm26_outbound_webhooks_and_nz.sql
-- Purpose: Two additive marketplace primitives:
--   1. Outbound webhook endpoints + delivery log with HMAC signing.
--   2. NZ market support — extend professionals and intent_taxonomy with
--      `available_in_countries text[]` so the country router and Get
--      Matched engine can scope by jurisdiction.
--
-- Idempotency: CREATE TABLE / ADD COLUMN / CREATE INDEX guards.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.outbound_webhook_deliveries;
--   DROP TABLE IF EXISTS public.outbound_webhook_endpoints;
--   ALTER TABLE public.professionals DROP COLUMN IF EXISTS available_in_countries;
--   ALTER TABLE public.intent_taxonomy DROP COLUMN IF EXISTS available_in_countries;
--
-- Risk: low — additive only; default values preserve AU-only behaviour.
-- ============================================================================

BEGIN;

-- ── Outbound webhooks ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outbound_webhook_endpoints (
  id                   bigserial PRIMARY KEY,
  owner_kind           text NOT NULL CHECK (owner_kind IN ('professional','team','admin')),
  owner_id             text NOT NULL,
  url                  text NOT NULL,
  signing_secret       text NOT NULL,
  event_subscriptions  text[] NOT NULL DEFAULT '{}',
  enabled              boolean NOT NULL DEFAULT true,
  last_success_at      timestamptz,
  last_failure_at      timestamptz,
  failure_count        integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_owe_owner ON public.outbound_webhook_endpoints (owner_kind, owner_id);

ALTER TABLE public.outbound_webhook_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners see own endpoints" ON public.outbound_webhook_endpoints;
CREATE POLICY "owners see own endpoints"
  ON public.outbound_webhook_endpoints
  FOR SELECT
  TO authenticated
  USING (
    (owner_kind = 'professional' AND owner_id IN (
      SELECT id::text FROM public.professionals WHERE auth_user_id = auth.uid()
    ))
    OR (owner_kind = 'team' AND owner_id IN (
      SELECT t.id::text
      FROM public.expert_teams t
      JOIN public.expert_team_members m ON m.team_id = t.id
      JOIN public.professionals p ON p.id = m.professional_id
      WHERE p.auth_user_id = auth.uid() AND m.status = 'active'
    ))
  );

CREATE TABLE IF NOT EXISTS public.outbound_webhook_deliveries (
  id                bigserial PRIMARY KEY,
  endpoint_id       bigint NOT NULL REFERENCES public.outbound_webhook_endpoints(id) ON DELETE CASCADE,
  event_type        text NOT NULL,
  payload           jsonb NOT NULL,
  signed_payload    text NOT NULL,
  signature         text NOT NULL,
  response_status   integer,
  response_body     text,
  delivered_at      timestamptz,
  retry_count       integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_owd_endpoint_created
  ON public.outbound_webhook_deliveries (endpoint_id, created_at DESC);

ALTER TABLE public.outbound_webhook_deliveries ENABLE ROW LEVEL SECURITY;
-- service_role-only access (no anon or authenticated policy).

-- ── NZ market scoping ──────────────────────────────────────────────────────
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS available_in_countries text[] NOT NULL DEFAULT ARRAY['AU'];

ALTER TABLE public.intent_taxonomy
  ADD COLUMN IF NOT EXISTS available_in_countries text[] NOT NULL DEFAULT ARRAY['AU'];

CREATE INDEX IF NOT EXISTS idx_professionals_countries
  ON public.professionals USING GIN (available_in_countries);

CREATE INDEX IF NOT EXISTS idx_intent_taxonomy_countries
  ON public.intent_taxonomy USING GIN (available_in_countries);

-- Seed two NZ-specific intents (won't conflict with existing AU ones).
INSERT INTO public.intent_taxonomy (slug, label, description, default_route, risk_level, enabled, sort_order, available_in_countries)
VALUES
  ('nz_kiwisaver',     'KiwiSaver advice',              'Advice on KiwiSaver fund selection, contributions, withdrawals.', 'individual', 'low',  true, 100, ARRAY['NZ']),
  ('nz_property_buy',  'Buy NZ residential property',   'Buying a home or investment property in New Zealand.',           'expert_team','low', true, 101, ARRAY['NZ'])
ON CONFLICT (slug) DO NOTHING;

COMMIT;
