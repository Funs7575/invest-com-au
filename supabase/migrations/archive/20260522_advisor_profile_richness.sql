-- Migration: 20260522_advisor_profile_richness.sql
-- Adds rich profile fields to professionals: specializations, languages,
-- min_client_assets, and service/certification detail tables.
-- Rollback:
--   DROP TABLE IF EXISTS public.advisor_certifications CASCADE;
--   DROP TABLE IF EXISTS public.advisor_services CASCADE;
--   ALTER TABLE public.professionals
--     DROP COLUMN IF EXISTS languages_spoken,
--     DROP COLUMN IF EXISTS min_client_assets_band,
--     DROP COLUMN IF EXISTS specializations,
--     DROP COLUMN IF EXISTS profile_completion_pct;

BEGIN;

-- Simple columns on professionals
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS languages_spoken    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_client_assets_band TEXT
    CHECK (min_client_assets_band IN ('any', '100k', '250k', '500k', '1m', '2m', '5m', '10m+')),
  ADD COLUMN IF NOT EXISTS specializations     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_completion_pct INTEGER NOT NULL DEFAULT 0
    CHECK (profile_completion_pct BETWEEN 0 AND 100);

-- advisor_services: services offered with optional pricing
CREATE TABLE IF NOT EXISTS public.advisor_services (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  description     TEXT CHECK (char_length(description) <= 500),
  price_type      TEXT NOT NULL DEFAULT 'contact'
    CHECK (price_type IN ('fixed', 'hourly', 'on_application', 'contact')),
  price_from_cents INTEGER,
  price_to_cents   INTEGER,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_services_professional
  ON public.advisor_services (professional_id, sort_order);

ALTER TABLE public.advisor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_services FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor_services_public_read"    ON public.advisor_services;
DROP POLICY IF EXISTS "advisor_services_owner_write"    ON public.advisor_services;
DROP POLICY IF EXISTS "advisor_services_service_role"   ON public.advisor_services;

CREATE POLICY "advisor_services_public_read"
  ON public.advisor_services FOR SELECT
  USING (is_active = true);

CREATE POLICY "advisor_services_owner_write"
  ON public.advisor_services FOR ALL
  TO authenticated
  USING (professional_id IN (
    SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (professional_id IN (
    SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "advisor_services_service_role"
  ON public.advisor_services TO service_role
  USING (true) WITH CHECK (true);

-- advisor_certifications: qualifications and professional memberships
CREATE TABLE IF NOT EXISTS public.advisor_certifications (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 150),
  issuer          TEXT NOT NULL CHECK (char_length(issuer) BETWEEN 2 AND 150),
  credential_id   TEXT,
  issued_at       DATE,
  expires_at      DATE,
  cert_url        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_certifications_professional
  ON public.advisor_certifications (professional_id, issued_at DESC);

ALTER TABLE public.advisor_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_certifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor_certifications_public_read"  ON public.advisor_certifications;
DROP POLICY IF EXISTS "advisor_certifications_owner_write"  ON public.advisor_certifications;
DROP POLICY IF EXISTS "advisor_certifications_service_role" ON public.advisor_certifications;

CREATE POLICY "advisor_certifications_public_read"
  ON public.advisor_certifications FOR SELECT
  USING (is_active = true);

CREATE POLICY "advisor_certifications_owner_write"
  ON public.advisor_certifications FOR ALL
  TO authenticated
  USING (professional_id IN (
    SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (professional_id IN (
    SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "advisor_certifications_service_role"
  ON public.advisor_certifications TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
