-- Forward-fix-up migration for A-MISSING-TABLE-2.
-- Original definition lives at supabase/migrations/20260427_wave_security_observability.sql:144-173
-- but never applied to live (verified 2026-05-08 via `to_regclass` returning NULL).
-- Applied via Supabase MCP on 2026-05-08 against project guggzyqceattncjwvgyc.
-- This file checked in for repo parity; all blocks are idempotent so re-running is safe.
--
-- ROLLBACK STRATEGY:
--   DROP POLICY IF EXISTS "data_export_requests_self_insert" ON public.data_export_requests;
--   DROP POLICY IF EXISTS "data_export_requests_self_read" ON public.data_export_requests;
--   ALTER TABLE public.data_export_requests DISABLE ROW LEVEL SECURITY;
--   DROP INDEX IF EXISTS public.idx_data_export_requests_status;
--   DROP INDEX IF EXISTS public.idx_data_export_requests_user;
--   DROP TABLE IF EXISTS public.data_export_requests;
-- Risk: reverses GDPR/APP data-export tracking; SLA + admin processing dashboard go dark.

CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL,
  email           TEXT NOT NULL,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at    TIMESTAMPTZ,
  download_url    TEXT,
  expires_at      TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON public.data_export_requests (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON public.data_export_requests (status, requested_at);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "data_export_requests_self_read" ON public.data_export_requests;
CREATE POLICY "data_export_requests_self_read"
  ON public.data_export_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "data_export_requests_self_insert" ON public.data_export_requests;
CREATE POLICY "data_export_requests_self_insert"
  ON public.data_export_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());
