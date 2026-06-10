-- Migration: product_user_verified — community "I use this" verification (PR 4.3).
--
-- Users claim they actively use a product (broker, ETF, advisor). Aggregate
-- counts appear as a social-proof badge on product cards. One verification
-- per (user, product_type, product_ref) — enforced by a UNIQUE constraint.
--
-- product_user_verified_counts VIEW computes live tallies for any type+ref.
-- The application reads this view for badge display.
--
-- Rollback strategy:
--   DROP VIEW IF EXISTS public.product_user_verified_counts;
--   DROP TABLE IF EXISTS public.product_user_verified;

BEGIN;

CREATE TABLE IF NOT EXISTS public.product_user_verified (
  id            bigserial PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_type  text NOT NULL
    CHECK (product_type IN ('broker', 'etf', 'advisor', 'property')),
  product_ref   text NOT NULL,  -- slug / identifier
  verified_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_type, product_ref)
);

CREATE INDEX IF NOT EXISTS product_user_verified_type_ref_idx
  ON public.product_user_verified (product_type, product_ref);

CREATE INDEX IF NOT EXISTS product_user_verified_user_idx
  ON public.product_user_verified (user_id);

ALTER TABLE public.product_user_verified ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_user_verified FORCE ROW LEVEL SECURITY;

-- Users can see all verifications (drives the aggregate badge count)
-- and manage their own.
DROP POLICY IF EXISTS "product_user_verified_public_read" ON public.product_user_verified;
CREATE POLICY "product_user_verified_public_read"
  ON public.product_user_verified
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "product_user_verified_own_insert" ON public.product_user_verified;
CREATE POLICY "product_user_verified_own_insert"
  ON public.product_user_verified
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "product_user_verified_own_delete" ON public.product_user_verified;
CREATE POLICY "product_user_verified_own_delete"
  ON public.product_user_verified
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "product_user_verified_service_all" ON public.product_user_verified;
CREATE POLICY "product_user_verified_service_all"
  ON public.product_user_verified
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Count view ────────────────────────────────────────────────────────────────
-- Live aggregate: how many users have verified each product.

CREATE OR REPLACE VIEW public.product_user_verified_counts AS
SELECT
  product_type,
  product_ref,
  COUNT(*)::integer AS verified_count
FROM public.product_user_verified
GROUP BY product_type, product_ref;

COMMIT;
