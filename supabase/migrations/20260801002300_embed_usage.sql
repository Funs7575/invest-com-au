-- ============================================================================
-- Migration: 20260801002300_embed_usage.sql
-- Purpose: Idea #6 — metered B2B SaaS for embed/white-label widget
--          customers. Builds on the embed_customer kind + api_key_hash
--          (shipped). Records per-request usage so we can enforce the
--          monthly quota + bill on metered usage.
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 4, #6)
-- Risk: low — additive append-only events table + a monthly counter on
--             embed_customers. service-role only (the widget API runs
--             server-side with the service client).
-- Rollback:
--   BEGIN;
--     ALTER TABLE public.embed_customers DROP COLUMN IF EXISTS usage_this_period;
--     ALTER TABLE public.embed_customers DROP COLUMN IF EXISTS usage_period_start;
--     DROP TABLE IF EXISTS public.embed_usage_events;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.embed_usage_events (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id   bigint NOT NULL REFERENCES public.embed_customers(id) ON DELETE CASCADE,
  endpoint      text NOT NULL,
  status_code   integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embed_usage_events_customer
  ON public.embed_usage_events (customer_id, created_at DESC);

ALTER TABLE public.embed_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_usage_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access embed_usage_events" ON public.embed_usage_events;
CREATE POLICY "service_role full access embed_usage_events"
  ON public.embed_usage_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Customers read their own usage events (for the dashboard).
DROP POLICY IF EXISTS "embed customer reads own usage" ON public.embed_usage_events;
CREATE POLICY "embed customer reads own usage"
  ON public.embed_usage_events FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.embed_customers WHERE auth_user_id = auth.uid()
    )
  );

-- Rolling monthly counter on the customer row for fast quota checks
-- (the events table is the source of truth; this is the hot-path cache).
ALTER TABLE public.embed_customers
  ADD COLUMN IF NOT EXISTS usage_this_period integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now());

COMMIT;
