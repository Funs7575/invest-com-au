-- ============================================================================
-- Migration: 20260518_advisor_auctions_and_bids_backfill.sql
-- Purpose: Backfill the base `advisor_auctions` + `advisor_auction_bids`
--          tables that the runbook (docs/runbooks/apply-pmp-foundation.md)
--          claimed were created via the Supabase dashboard but never landed
--          in prod. This file mirrors the migration that was applied via
--          Supabase MCP on 2026-05-17 (tracked as
--          `advisor_auctions_and_bids_backfill` in
--          supabase_migrations.schema_migrations). The on-disk file
--          ensures a fresh-clone replay reproduces the same schema.
--
--          Schema derived from the canonical insert/select payloads in:
--            app/api/quotes/route.ts          (auction-flow insert + reads)
--            app/api/briefs/route.ts          (accept-flow insert)
--            app/api/advisor-auction/bid/*.ts (bids insert + reads)
--          plus the column additions from the PMP foundation migration
--          (supabase/migrations/20260723_pmp01_provider_marketplace_foundation.sql,
--          sections 4 + 8) folded in.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DROP
--          CONSTRAINT IF EXISTS / ON CONFLICT DO NOTHING.
-- Rollback (destructive — discards every brief + bid):
--   DROP TABLE IF EXISTS public.brief_tracker_events;
--   DROP TABLE IF EXISTS public.advisor_auction_bids;
--   DROP TABLE IF EXISTS public.advisor_auctions;
-- Risk: medium — net-new base tables; expert_teams family already exists
--          and FKs from advisor_auctions point at it.
-- ============================================================================

BEGIN;

-- ── 1. advisor_auctions (base table — auction flow + brief flow combined) ─
CREATE TABLE IF NOT EXISTS public.advisor_auctions (
  id                            serial PRIMARY KEY,
  source                        text   NOT NULL DEFAULT 'public_job',
  flow_type                     text   NOT NULL DEFAULT 'auction',
  is_public                     boolean NOT NULL DEFAULT true,
  slug                          text   UNIQUE NOT NULL,
  job_title                     text   NOT NULL,
  job_description               text,
  budget_band                   text,
  advisor_types                 text[] NOT NULL DEFAULT '{}'::text[],
  location                      text,
  contact_name                  text,
  contact_email                 text   NOT NULL,
  contact_phone                 text,
  status                        text   NOT NULL DEFAULT 'open',
  ends_at                       timestamptz NOT NULL,
  referrer_advisor_id           integer REFERENCES public.professionals(id),
  -- PMP-foundation section-4 additions:
  brief_template                text,
  brief_payload                 jsonb  NOT NULL DEFAULT '{}'::jsonb,
  provider_preference           text,
  routing_mode                  text,
  target_professional_id        integer REFERENCES public.professionals(id),
  target_firm_id                integer REFERENCES public.advisor_firms(id),
  target_team_id                integer REFERENCES public.expert_teams(id),
  accept_credits_cost           integer,
  accepted_by_professional_id   integer REFERENCES public.professionals(id),
  accepted_by_team_id           integer REFERENCES public.expert_teams(id),
  accepted_at                   timestamptz,
  tracker_status                text   NOT NULL DEFAULT 'new',
  risk_flags                    text[] NOT NULL DEFAULT '{}'::text[],
  risk_review_status            text   NOT NULL DEFAULT 'clear',
  listing_id                    integer REFERENCES public.investment_listings(id),
  created_at                    timestamptz NOT NULL DEFAULT now()
);

-- CHECK constraints split out so re-runs don't fail on duplicate ADD COLUMN.
ALTER TABLE public.advisor_auctions
  DROP CONSTRAINT IF EXISTS advisor_auctions_flow_type_check;
ALTER TABLE public.advisor_auctions
  ADD CONSTRAINT advisor_auctions_flow_type_check
  CHECK (flow_type IN ('auction', 'accept'));

ALTER TABLE public.advisor_auctions
  DROP CONSTRAINT IF EXISTS advisor_auctions_status_check;
ALTER TABLE public.advisor_auctions
  ADD CONSTRAINT advisor_auctions_status_check
  CHECK (status IN ('open','closed','expired','withdrawn','awarded'));

ALTER TABLE public.advisor_auctions
  DROP CONSTRAINT IF EXISTS advisor_auctions_provider_preference_check;
ALTER TABLE public.advisor_auctions
  ADD CONSTRAINT advisor_auctions_provider_preference_check
  CHECK (provider_preference IS NULL OR provider_preference IN
    ('any', 'individual', 'firm', 'expert_team', 'multiple'));

ALTER TABLE public.advisor_auctions
  DROP CONSTRAINT IF EXISTS advisor_auctions_routing_mode_check;
ALTER TABLE public.advisor_auctions
  ADD CONSTRAINT advisor_auctions_routing_mode_check
  CHECK (routing_mode IS NULL OR routing_mode IN
    ('smart_match', 'direct', 'multi_response'));

ALTER TABLE public.advisor_auctions
  DROP CONSTRAINT IF EXISTS advisor_auctions_tracker_status_check;
ALTER TABLE public.advisor_auctions
  ADD CONSTRAINT advisor_auctions_tracker_status_check
  CHECK (tracker_status IN
    ('new', 'contacted', 'call_booked', 'proposal_sent', 'won', 'lost', 'withdrawn'));

ALTER TABLE public.advisor_auctions
  DROP CONSTRAINT IF EXISTS advisor_auctions_risk_review_check;
ALTER TABLE public.advisor_auctions
  ADD CONSTRAINT advisor_auctions_risk_review_check
  CHECK (risk_review_status IN ('clear', 'pending_review', 'approved', 'rejected'));

-- Auction-flow public listing indexes:
CREATE INDEX IF NOT EXISTS idx_advisor_auctions_public_open
  ON public.advisor_auctions (created_at DESC)
  WHERE is_public = true AND flow_type = 'auction' AND status = 'open';

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_ends_at
  ON public.advisor_auctions (ends_at)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_advisor_types
  ON public.advisor_auctions USING GIN (advisor_types);

-- Accept-flow inbox + tracking indexes (folded in from PMP foundation s4):
CREATE INDEX IF NOT EXISTS idx_advisor_auctions_flow_status
  ON public.advisor_auctions (flow_type, status, tracker_status)
  WHERE flow_type = 'accept';

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_accepted_by_pro
  ON public.advisor_auctions (accepted_by_professional_id)
  WHERE accepted_by_professional_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_accepted_by_team
  ON public.advisor_auctions (accepted_by_team_id)
  WHERE accepted_by_team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_target_team
  ON public.advisor_auctions (target_team_id)
  WHERE target_team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_risk_review
  ON public.advisor_auctions (risk_review_status, created_at DESC)
  WHERE risk_review_status <> 'clear';

ALTER TABLE public.advisor_auctions ENABLE ROW LEVEL SECURITY;

-- Public auction-flow listings are visible anonymously (for /quotes).
DROP POLICY IF EXISTS "Public read of public open auctions" ON public.advisor_auctions;
CREATE POLICY "Public read of public open auctions"
  ON public.advisor_auctions FOR SELECT
  USING (is_public = true AND flow_type = 'auction' AND status = 'open');

-- The accept-flow (briefs) is provider-only — handled entirely via service role
-- through brief inbox / brief preview / brief accept routes.
DROP POLICY IF EXISTS "Service role full access advisor_auctions" ON public.advisor_auctions;
CREATE POLICY "Service role full access advisor_auctions"
  ON public.advisor_auctions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 2. advisor_auction_bids ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advisor_auction_bids (
  id           serial PRIMARY KEY,
  auction_id   integer NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  advisor_id   integer NOT NULL REFERENCES public.professionals(id),
  bid_amount   integer NOT NULL CHECK (bid_amount > 0),
  status       text    NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, advisor_id)
);

ALTER TABLE public.advisor_auction_bids
  DROP CONSTRAINT IF EXISTS advisor_auction_bids_status_check;
ALTER TABLE public.advisor_auction_bids
  ADD CONSTRAINT advisor_auction_bids_status_check
  CHECK (status IN ('active','withdrawn','accepted','rejected','expired'));

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_active
  ON public.advisor_auction_bids (auction_id, bid_amount DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_auction_bids_advisor
  ON public.advisor_auction_bids (advisor_id);

ALTER TABLE public.advisor_auction_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Advisors read own bids" ON public.advisor_auction_bids;
CREATE POLICY "Advisors read own bids"
  ON public.advisor_auction_bids FOR SELECT
  USING (
    advisor_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access auction_bids" ON public.advisor_auction_bids;
CREATE POLICY "Service role full access auction_bids"
  ON public.advisor_auction_bids FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 3. brief_tracker_events (section 8 of PMP foundation) ──────────────────
CREATE TABLE IF NOT EXISTS public.brief_tracker_events (
  id           bigserial PRIMARY KEY,
  brief_id     integer NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_kind   text,
  actor_id     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brief_tracker_events_brief
  ON public.brief_tracker_events (brief_id, created_at);

ALTER TABLE public.brief_tracker_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access tracker_events" ON public.brief_tracker_events;
CREATE POLICY "Service role full access tracker_events"
  ON public.brief_tracker_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
