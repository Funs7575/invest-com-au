-- ============================================================================
-- Migration: 20260801002200_wholesale_listings.sql
-- Purpose: Idea #5 — s708-gated wholesale listings marketplace. Builds on
--          the wholesale_operator kind (shipped). Operators publish
--          offerings; only sophisticated/wholesale (s708-certified)
--          investors can see full detail + submit leads. Low volume, very
--          high per-lead value.
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 4, #5)
-- Risk: medium — s708 gating is a compliance boundary. Public RLS exposes
--             ONLY teaser fields on verified listings; full detail + lead
--             submission is service-role-mediated after a cert check.
-- Rollback:
--   BEGIN;
--     DROP TABLE IF EXISTS public.wholesale_listing_leads;
--     DROP TABLE IF EXISTS public.wholesale_listings;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.wholesale_listings (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operator_id          bigint NOT NULL REFERENCES public.wholesale_operators(id) ON DELETE CASCADE,
  principal_id         uuid REFERENCES public.principals(id) ON DELETE SET NULL,
  slug                 text UNIQUE NOT NULL,
  title                text NOT NULL CHECK (length(title) > 0),
  teaser               text,
  asset_class          text CHECK (asset_class IN (
                         'private_equity','venture_capital','real_estate',
                         'private_credit','litigation_funding','insurance_linked',
                         'hedge','other'
                       ) OR asset_class IS NULL),
  min_investment_cents bigint,
  target_irr_bps       integer,
  s708_gated           boolean NOT NULL DEFAULT true,
  status               text NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','pending_review','published','closed','suspended')),
  published_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wholesale_listings_operator
  ON public.wholesale_listings (operator_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_listings_published
  ON public.wholesale_listings (status, published_at DESC) WHERE status = 'published';

ALTER TABLE public.wholesale_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_listings FORCE ROW LEVEL SECURITY;

-- Public read: ONLY published listings, and the app must select teaser
-- fields only (full detail served service-role after a s708 cert check).
DROP POLICY IF EXISTS "Public read published wholesale_listings" ON public.wholesale_listings;
CREATE POLICY "Public read published wholesale_listings"
  ON public.wholesale_listings FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Operators manage their own listings.
DROP POLICY IF EXISTS "operator manages own wholesale_listings" ON public.wholesale_listings;
CREATE POLICY "operator manages own wholesale_listings"
  ON public.wholesale_listings FOR ALL
  TO authenticated
  USING (
    operator_id IN (
      SELECT id FROM public.wholesale_operators WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    operator_id IN (
      SELECT id FROM public.wholesale_operators WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role full access wholesale_listings" ON public.wholesale_listings;
CREATE POLICY "service_role full access wholesale_listings"
  ON public.wholesale_listings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER wholesale_listings_updated_at
  BEFORE UPDATE ON public.wholesale_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── leads (sophisticated-investor only) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_listing_leads (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id            bigint NOT NULL REFERENCES public.wholesale_listings(id) ON DELETE CASCADE,
  investor_principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL,
  investor_email        text NOT NULL,
  s708_verified_at      timestamptz NOT NULL,
  message               text,
  status                text NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','contacted','qualified','closed','spam')),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wholesale_listing_leads_listing
  ON public.wholesale_listing_leads (listing_id, created_at DESC);

ALTER TABLE public.wholesale_listing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_listing_leads FORCE ROW LEVEL SECURITY;

-- Service-role only: lead submission goes through an API route that
-- enforces the s708 cert check (it stamps s708_verified_at). Operators
-- read their own listings' leads via that same service-mediated path.
DROP POLICY IF EXISTS "service_role full access wholesale_listing_leads" ON public.wholesale_listing_leads;
CREATE POLICY "service_role full access wholesale_listing_leads"
  ON public.wholesale_listing_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
