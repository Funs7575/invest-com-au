-- ============================================================================
-- Migration: fund_reviews — verified user reviews for fund_listings (W3.18)
-- Date:      2026-05-10
-- Plan ref:  docs/plans/pre-launch-wave-master-prompt.md (W3.18)
--
-- Purpose
--   Mirrors public.user_reviews (brokers) and public.professional_reviews
--   (advisors) for the third entity type in the editorial-review pattern:
--   funds. Email-verified submission, auto-moderation on verify, manual
--   override via /admin/fund-reviews. Display on /invest/funds/[slug].
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"    ON public.fund_reviews;
--     DROP POLICY IF EXISTS "Public read approved fund reviews" ON public.fund_reviews;
--     DROP POLICY IF EXISTS "Insert fund reviews"         ON public.fund_reviews;
--     ALTER TABLE public.fund_reviews DISABLE ROW LEVEL SECURITY;
--     DROP TABLE public.fund_reviews;  -- DESTRUCTIVE — discards all reviews
--   COMMIT;
--
-- RLS
--   - service_role: explicit FOR ALL allow (audit visibility; the route
--     uses createAdminClient() so RLS is bypassed regardless — the policy
--     makes intent visible in pg_policies for auditors).
--   - anon + authenticated SELECT WHERE status = 'approved': consumed by
--     the fund detail page server component.
--   - anon + authenticated INSERT with validation: defence-in-depth so a
--     fresh-rebuild env enforces the same shape as the application route.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing table
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled
--   - DROP POLICY IF EXISTS + CREATE POLICY — safe to re-run
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.fund_reviews (
  id                     serial      PRIMARY KEY,
  fund_id                integer     NOT NULL REFERENCES public.fund_listings(id),
  fund_slug              text        NOT NULL,
  display_name           text        NOT NULL,
  email                  text        NOT NULL,
  rating                 integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                  text        NOT NULL,
  body                   text        NOT NULL,
  pros                   text,
  cons                   text,
  -- Per-dimension scores (1-5, optional). Funds-specific dimensions:
  --   performance — perceived returns vs target
  --   communication — manager reporting cadence / clarity
  --   fees — total cost-of-ownership
  --   manager — confidence in the team
  performance_rating     integer     CHECK (performance_rating IS NULL OR performance_rating BETWEEN 1 AND 5),
  communication_rating   integer     CHECK (communication_rating IS NULL OR communication_rating BETWEEN 1 AND 5),
  fees_rating            integer     CHECK (fees_rating IS NULL OR fees_rating BETWEEN 1 AND 5),
  manager_rating         integer     CHECK (manager_rating IS NULL OR manager_rating BETWEEN 1 AND 5),
  hold_period_months     integer     CHECK (hold_period_months IS NULL OR hold_period_months >= 1),
  status                 text        NOT NULL DEFAULT 'pending'
                                       CHECK (status IN ('pending','verified','approved','rejected')),
  verification_token     text,
  verified_at            timestamptz,
  moderation_note        text,
  ip_hash                text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_reviews_fund_id     ON public.fund_reviews (fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_reviews_fund_slug   ON public.fund_reviews (fund_slug);
CREATE INDEX IF NOT EXISTS idx_fund_reviews_email       ON public.fund_reviews (email);
CREATE INDEX IF NOT EXISTS idx_fund_reviews_status      ON public.fund_reviews (status);
CREATE INDEX IF NOT EXISTS idx_fund_reviews_fund_approved
  ON public.fund_reviews (fund_id, created_at DESC)
  WHERE status = 'approved';

ALTER TABLE public.fund_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_reviews FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"          ON public.fund_reviews;
DROP POLICY IF EXISTS "Public read approved fund reviews" ON public.fund_reviews;
DROP POLICY IF EXISTS "Insert fund reviews"               ON public.fund_reviews;

CREATE POLICY "service_role full access"
  ON public.fund_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read approved fund reviews"
  ON public.fund_reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "Insert fund reviews"
  ON public.fund_reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(trim(email)) > 0
    AND display_name IS NOT NULL AND length(trim(display_name)) > 0
    AND fund_id IS NOT NULL
    AND rating BETWEEN 1 AND 5
  );

COMMIT;
