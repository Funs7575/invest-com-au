-- ============================================================================
-- Migration: 20260801002100_squad_tiers.sql
-- Purpose: Idea #4 — paid squad marketplace tiers. Squads (expert_teams)
--          are first-class workspaces with brief routing; this adds a
--          subscription + a placement-boost weight the brief-routing sort
--          reads, so featured/top squads surface higher.
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 2, #4)
-- Risk: medium — the boost feeds the brief-routing sort. The lib reads it
--             additively (default 1.0 = no change) and it's bounded; the
--             ranker integration is gated behind a feature flag.
-- Rollback:
--   BEGIN;
--     DROP TABLE IF EXISTS public.squad_placement_boost;
--     DROP TABLE IF EXISTS public.squad_subscriptions;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.squad_subscriptions (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id                 integer NOT NULL UNIQUE REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  tier                    text NOT NULL DEFAULT 'free'
                          CHECK (tier IN ('free','featured','top')),
  status                  text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('trialing','active','past_due','canceled','incomplete')),
  stripe_subscription_id  text UNIQUE,
  current_period_end      timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_squad_subscriptions_tier
  ON public.squad_subscriptions (tier) WHERE tier <> 'free';

CREATE TABLE IF NOT EXISTS public.squad_placement_boost (
  team_id      integer PRIMARY KEY REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  boost_weight numeric(4,2) NOT NULL DEFAULT 1.00
               CHECK (boost_weight >= 0.5 AND boost_weight <= 3.0),
  active       boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.squad_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.squad_placement_boost ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_placement_boost FORCE ROW LEVEL SECURITY;

-- Boost is public-read (it influences public brief routing); subscriptions
-- are team-private + service_role-managed.
DROP POLICY IF EXISTS "Public read squad_placement_boost" ON public.squad_placement_boost;
CREATE POLICY "Public read squad_placement_boost"
  ON public.squad_placement_boost FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS "service_role full access squad_placement_boost" ON public.squad_placement_boost;
CREATE POLICY "service_role full access squad_placement_boost"
  ON public.squad_placement_boost FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access squad_subscriptions" ON public.squad_subscriptions;
CREATE POLICY "service_role full access squad_subscriptions"
  ON public.squad_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER squad_subscriptions_updated_at
  BEFORE UPDATE ON public.squad_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- squad_placement_boost.updated_at also needs the maintaining trigger
-- (it has the column + DEFAULT but would otherwise go stale on UPDATE).
CREATE TRIGGER squad_placement_boost_updated_at
  BEFORE UPDATE ON public.squad_placement_boost
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
