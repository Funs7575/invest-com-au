-- Migration: afsl_register — cached AFSL licensee data.
--
-- Powers the public /api/afsl/[number] resolver + /afsl/[number] SEO pages.
-- Sourced from ASIC's public AFS register (the JS-rendered Connect site).
--
-- Pre-launch fill path: admin CSV upload (see /admin/afsl-register).
-- Post-revenue path: weekly cron refresh against a paid vendor API
-- (Illion / CreditorWatch / D&B) via a future ?refresh= endpoint.
--
-- Why cache + not pass-through-vendor: every read pays the vendor
-- per-request, latency is 500ms+, and our public-API contract should
-- not depend on a single 3rd-party uptime. Cache flips at most weekly.
--
-- Rollback strategy: DROP TABLE IF EXISTS public.afsl_register;
--
-- The table is intentionally writeable only via service_role so the
-- admin upload endpoint and weekly cron are the only mutation paths.
-- Public read so the /api/afsl/[number] route can use the anon-key
-- client.

CREATE TABLE IF NOT EXISTS public.afsl_register (
  afsl_number TEXT PRIMARY KEY,
  licensee_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('current', 'cancelled', 'suspended', 'ceased', 'unknown')),
  licence_conditions JSONB,
  address TEXT,
  effective_date DATE,
  cancelled_date DATE,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'asic_connect',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigram-friendly index for fuzzy name search from the public lookup page.
CREATE INDEX IF NOT EXISTS idx_afsl_register_licensee_lower
  ON public.afsl_register (lower(licensee_name));

-- Filter by status (e.g. "show all current AFSL holders") is common.
CREATE INDEX IF NOT EXISTS idx_afsl_register_status
  ON public.afsl_register (status, last_verified_at DESC);

ALTER TABLE public.afsl_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read afsl_register" ON public.afsl_register;
CREATE POLICY "Public can read afsl_register"
  ON public.afsl_register
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages afsl_register" ON public.afsl_register;
CREATE POLICY "Service role manages afsl_register"
  ON public.afsl_register
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
