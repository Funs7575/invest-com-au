-- ============================================================================
-- Migration: 20260515_mm29_investor_referrals_testimonials.sql
-- Purpose: Investor referral program — mirrors the pro affiliate (MM-13)
--          but for consumers. Investors share `/ref/<token>` links; on
--          downstream signup / brief-created / brief-accepted events, both
--          the referrer and (optionally) the referred user earn credits.
--
-- Note: /testimonials is a pure /reads/-from-brief_outcomes surface, no
-- new schema needed. Public access already governed by the existing
-- brief_outcomes RLS (show_testimonial=true rows are anon-readable).
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.investor_referral_credits;
--   DROP TABLE IF EXISTS public.investor_referral_links;
--
-- Risk: low — additive only.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_referral_links (
  id              bigserial PRIMARY KEY,
  auth_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token     text NOT NULL UNIQUE,
  click_count     integer NOT NULL DEFAULT 0,
  signup_count    integer NOT NULL DEFAULT 0,
  brief_count     integer NOT NULL DEFAULT 0,
  last_clicked_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_investor_referral_links_user
  ON public.investor_referral_links (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_investor_referral_links_token
  ON public.investor_referral_links (share_token);

ALTER TABLE public.investor_referral_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own row" ON public.investor_referral_links;
CREATE POLICY "own row"
  ON public.investor_referral_links
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.investor_referral_credits (
  id                  bigserial PRIMARY KEY,
  auth_user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_event        text NOT NULL CHECK (source_event IN ('signup','brief_created','brief_accepted')),
  credits_awarded     integer NOT NULL,
  attributed_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attributed_brief_id integer,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_investor_referral_credits_owner
  ON public.investor_referral_credits (auth_user_id, created_at DESC);

ALTER TABLE public.investor_referral_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own credits" ON public.investor_referral_credits;
CREATE POLICY "own credits"
  ON public.investor_referral_credits
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

COMMIT;
