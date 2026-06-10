-- ============================================================================
-- Migration: 20260723_pmp01_provider_marketplace_foundation.sql
-- Purpose: Build the Provider Marketplace foundation that the future Get
--          Matched quiz will route into. Introduces Expert Teams (cross-firm
--          collaboration teams + members + invitations), extends
--          advisor_auctions into a brief record with flow_type='accept' as
--          an alternative to the existing bid-auction flow, and adds
--          admin-managed tables for credit pricing, routing rules,
--          risk-flag patterns, plus a brief tracker event log.
--
-- Why: existing /quotes/post + /api/quotes is bid-auction only. Plan calls
-- for credit-accept-and-unlock briefs that can route to Individuals, Firms
-- or Expert Teams with provider-preference + routing-mode + structured
-- vertical payloads. Legacy auctions stay supported by flow_type='auction'.
--
-- Idempotency: ALTER TABLE … ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT
-- EXISTS / CREATE INDEX IF NOT EXISTS / ON CONFLICT DO NOTHING. Safe to
-- re-apply.
--
-- Rollback (destructive, reverse order):
--   DROP TABLE IF EXISTS public.brief_tracker_events;
--   DROP TABLE IF EXISTS public.brief_risk_patterns;
--   DROP TABLE IF EXISTS public.brief_routing_rules;
--   DROP TABLE IF EXISTS public.brief_credit_prices;
--   ALTER TABLE public.advisor_auctions
--     DROP COLUMN IF EXISTS flow_type,
--     DROP COLUMN IF EXISTS brief_template,
--     DROP COLUMN IF EXISTS brief_payload,
--     DROP COLUMN IF EXISTS provider_preference,
--     DROP COLUMN IF EXISTS routing_mode,
--     DROP COLUMN IF EXISTS target_professional_id,
--     DROP COLUMN IF EXISTS target_firm_id,
--     DROP COLUMN IF EXISTS target_team_id,
--     DROP COLUMN IF EXISTS accept_credits_cost,
--     DROP COLUMN IF EXISTS accepted_by_professional_id,
--     DROP COLUMN IF EXISTS accepted_by_team_id,
--     DROP COLUMN IF EXISTS accepted_at,
--     DROP COLUMN IF EXISTS tracker_status,
--     DROP COLUMN IF EXISTS risk_flags,
--     DROP COLUMN IF EXISTS risk_review_status,
--     DROP COLUMN IF EXISTS listing_id;
--   DROP TABLE IF EXISTS public.expert_team_invitations;
--   DROP TABLE IF EXISTS public.expert_team_members;
--   DROP TABLE IF EXISTS public.expert_teams;
--
-- Risk: medium — additive only on advisor_auctions (no row-data loss on
-- reverse), but seeded admin tables hold pricing/routing/risk-pattern
-- config; destructive rollback discards admin tuning.
-- ============================================================================

BEGIN;

-- ── 1. expert_teams ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expert_teams (
  id                       serial PRIMARY KEY,
  slug                     text   UNIQUE NOT NULL,
  name                     text   NOT NULL,
  team_category            text   NOT NULL,
  team_type                text   NOT NULL DEFAULT 'independent'
    CHECK (team_type IN ('same_firm', 'independent', 'private_referral', 'internal_firm')),
  description              text,
  niche                    text,
  location_state           text,
  service_areas            text[] DEFAULT '{}'::text[],
  owner_professional_id    integer NOT NULL REFERENCES public.professionals(id),
  lead_professional_id     integer REFERENCES public.professionals(id),
  firm_id                  integer REFERENCES public.advisor_firms(id),
  disclosure               text,
  accepted_brief_templates text[] DEFAULT '{}'::text[],
  accepts_briefs           boolean NOT NULL DEFAULT false,
  verification_status      text NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN ('draft', 'submitted', 'verified', 'rejected', 'suspended')),
  verified_at              timestamptz,
  public                   boolean NOT NULL DEFAULT false,
  rejection_reason         text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expert_teams_public
  ON public.expert_teams (public, verification_status)
  WHERE public = true;
CREATE INDEX IF NOT EXISTS idx_expert_teams_owner
  ON public.expert_teams (owner_professional_id);
CREATE INDEX IF NOT EXISTS idx_expert_teams_category
  ON public.expert_teams (team_category);
CREATE INDEX IF NOT EXISTS idx_expert_teams_verification
  ON public.expert_teams (verification_status, created_at DESC);

ALTER TABLE public.expert_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read verified teams" ON public.expert_teams;
CREATE POLICY "Public can read verified teams"
  ON public.expert_teams FOR SELECT
  USING (public = true AND verification_status = 'verified');

DROP POLICY IF EXISTS "Service role full access expert_teams" ON public.expert_teams;
CREATE POLICY "Service role full access expert_teams"
  ON public.expert_teams FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 2. expert_team_members ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expert_team_members (
  id                    serial PRIMARY KEY,
  team_id               integer NOT NULL REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  professional_id       integer NOT NULL REFERENCES public.professionals(id),
  member_role           text NOT NULL DEFAULT 'member',
  public_title          text,
  can_receive_briefs    boolean NOT NULL DEFAULT true,
  can_appear_publicly   boolean NOT NULL DEFAULT true,
  status                text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'removed')),
  accepted_at           timestamptz,
  start_date            date,
  end_date              date,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_expert_team_members_team
  ON public.expert_team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_expert_team_members_professional
  ON public.expert_team_members (professional_id);
CREATE INDEX IF NOT EXISTS idx_expert_team_members_active
  ON public.expert_team_members (team_id, status)
  WHERE status = 'active';

ALTER TABLE public.expert_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read public members of verified teams" ON public.expert_team_members;
CREATE POLICY "Public can read public members of verified teams"
  ON public.expert_team_members FOR SELECT
  USING (
    can_appear_publicly = true
    AND status = 'active'
    AND team_id IN (
      SELECT id FROM public.expert_teams
      WHERE public = true AND verification_status = 'verified'
    )
  );

DROP POLICY IF EXISTS "Service role full access expert_team_members" ON public.expert_team_members;
CREATE POLICY "Service role full access expert_team_members"
  ON public.expert_team_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 3. expert_team_invitations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expert_team_invitations (
  id                       serial PRIMARY KEY,
  team_id                  integer NOT NULL REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  email                    text NOT NULL,
  name                     text,
  invited_professional_id  integer REFERENCES public.professionals(id),
  invited_role             text DEFAULT 'member',
  invited_by               integer NOT NULL REFERENCES public.professionals(id),
  token                    text NOT NULL UNIQUE,
  status                   text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  accepted_at              timestamptz,
  expires_at               timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token
  ON public.expert_team_invitations (token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team
  ON public.expert_team_invitations (team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email
  ON public.expert_team_invitations (email);

ALTER TABLE public.expert_team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access team_invitations" ON public.expert_team_invitations;
CREATE POLICY "Service role full access team_invitations"
  ON public.expert_team_invitations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 4. advisor_auctions: extend into brief record ─────────────────────────
ALTER TABLE public.advisor_auctions
  ADD COLUMN IF NOT EXISTS flow_type text NOT NULL DEFAULT 'auction',
  ADD COLUMN IF NOT EXISTS brief_template text,
  ADD COLUMN IF NOT EXISTS brief_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_preference text,
  ADD COLUMN IF NOT EXISTS routing_mode text,
  ADD COLUMN IF NOT EXISTS target_professional_id integer REFERENCES public.professionals(id),
  ADD COLUMN IF NOT EXISTS target_firm_id integer REFERENCES public.advisor_firms(id),
  ADD COLUMN IF NOT EXISTS target_team_id integer REFERENCES public.expert_teams(id),
  ADD COLUMN IF NOT EXISTS accept_credits_cost integer,
  ADD COLUMN IF NOT EXISTS accepted_by_professional_id integer REFERENCES public.professionals(id),
  ADD COLUMN IF NOT EXISTS accepted_by_team_id integer REFERENCES public.expert_teams(id),
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracker_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS risk_flags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS risk_review_status text NOT NULL DEFAULT 'clear',
  ADD COLUMN IF NOT EXISTS listing_id integer REFERENCES public.investment_listings(id);

-- CHECK constraints added separately so we can drop+recreate idempotently
-- without ADD COLUMN failing on a re-run.
ALTER TABLE public.advisor_auctions
  DROP CONSTRAINT IF EXISTS advisor_auctions_flow_type_check;
ALTER TABLE public.advisor_auctions
  ADD CONSTRAINT advisor_auctions_flow_type_check
  CHECK (flow_type IN ('auction', 'accept'));

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

-- Inbox-style queries on the new accept flow.
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

-- ── 5. brief_credit_prices ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brief_credit_prices (
  id              serial PRIMARY KEY,
  brief_template  text NOT NULL,
  provider_type   text NOT NULL DEFAULT 'any'
    CHECK (provider_type IN ('any', 'individual', 'firm', 'expert_team')),
  credits_cost    integer NOT NULL CHECK (credits_cost >= 0),
  notes           text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text,
  UNIQUE (brief_template, provider_type)
);

ALTER TABLE public.brief_credit_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access credit_prices" ON public.brief_credit_prices;
CREATE POLICY "Service role full access credit_prices"
  ON public.brief_credit_prices FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed starting prices. Idempotent via UNIQUE (brief_template, provider_type).
INSERT INTO public.brief_credit_prices (brief_template, provider_type, credits_cost, notes, updated_by) VALUES
  ('general',                'any',          2, 'General expert enquiry',            'migration'),
  ('mortgage',               'any',          5, 'Mortgage broker brief',             'migration'),
  ('tax',                    'any',          8, 'Tax / accounting brief',            'migration'),
  ('smsf_accountant',        'any',         10, 'SMSF accountant brief',             'migration'),
  ('financial_adviser',      'any',         15, 'Financial adviser brief',           'migration'),
  ('smsf_property',          'expert_team', 25, 'SMSF Property Team brief',          'migration'),
  ('smsf_property',          'any',         15, 'SMSF Property fallback',            'migration'),
  ('foreign_investor',       'any',         30, 'Foreign Investor brief',            'migration'),
  ('expat',                  'any',         20, 'Expat investor brief',              'migration'),
  ('opportunity_assessment', 'any',         15, 'Opportunity assessment brief',      'migration'),
  ('opportunity_assessment', 'expert_team', 25, 'Opportunity with full team',        'migration'),
  ('commercial_property',    'any',         40, 'Commercial Property brief',         'migration'),
  ('business_acquisition',   'any',         50, 'Business Acquisition brief',        'migration'),
  ('listing',                'any',         15, 'Listing brief (seller-side)',       'migration'),
  ('listing_readiness',      'any',         30, 'Listing readiness check',           'migration'),
  ('second_opinion',         'any',          5, 'Second opinion brief',              'migration')
ON CONFLICT (brief_template, provider_type) DO NOTHING;

-- ── 6. brief_routing_rules ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brief_routing_rules (
  id                serial PRIMARY KEY,
  name              text NOT NULL,
  priority          integer NOT NULL DEFAULT 100,
  enabled           boolean NOT NULL DEFAULT true,
  match_conditions  jsonb NOT NULL DEFAULT '{}'::jsonb,
  route_to          jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        text
);

CREATE INDEX IF NOT EXISTS idx_brief_routing_rules_priority
  ON public.brief_routing_rules (priority)
  WHERE enabled = true;

ALTER TABLE public.brief_routing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access routing_rules" ON public.brief_routing_rules;
CREATE POLICY "Service role full access routing_rules"
  ON public.brief_routing_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed routing rules. Inserts are intentionally tolerant of repeat runs by
-- de-duplicating on `name` (unique-ish by convention rather than by index —
-- a runtime duplicate is acceptable, admin can prune).
INSERT INTO public.brief_routing_rules (name, priority, match_conditions, route_to, notes, updated_by)
SELECT * FROM (VALUES
  (
    'SMSF Property -> Expert Team first',
    10,
    '{"brief_template":"smsf_property"}'::jsonb,
    '{"prefer":"expert_team","fallback":["individual","firm"]}'::jsonb,
    'SMSF property routes to verified Expert Teams when available.',
    'migration'
  ),
  (
    'Mortgage -> Individuals + Firms',
    20,
    '{"brief_template":"mortgage"}'::jsonb,
    '{"prefer":"any","types":["mortgage_broker"]}'::jsonb,
    'Mortgage briefs go to individuals/firms with mortgage permissions.',
    'migration'
  ),
  (
    'Opportunity Assessment full team -> Due Diligence Team',
    30,
    '{"brief_template":"opportunity_assessment","help_needed":"full_specialist_team"}'::jsonb,
    '{"prefer":"expert_team","team_category":"due_diligence"}'::jsonb,
    'When the user ticks full-specialist-team, route to Due Diligence teams.',
    'migration'
  ),
  (
    'Foreign Investor -> Specialists',
    40,
    '{"brief_template":"foreign_investor"}'::jsonb,
    '{"prefer":"expert_team","fallback":["individual","firm"],"team_category":"foreign_investor"}'::jsonb,
    'Foreign investor briefs prefer Foreign Investor expert teams.',
    'migration'
  ),
  (
    'Default fallback',
    1000,
    '{}'::jsonb,
    '{"prefer":"any"}'::jsonb,
    'Catch-all when no higher-priority rule matches.',
    'migration'
  )
) AS seed(name, priority, match_conditions, route_to, notes, updated_by)
WHERE NOT EXISTS (
  SELECT 1 FROM public.brief_routing_rules r WHERE r.name = seed.name
);

-- ── 7. brief_risk_patterns ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brief_risk_patterns (
  id          serial PRIMARY KEY,
  pattern     text NOT NULL,
  category    text NOT NULL,
  severity    text NOT NULL DEFAULT 'warn'
    CHECK (severity IN ('warn', 'review', 'block')),
  enabled     boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pattern, category)
);

CREATE INDEX IF NOT EXISTS idx_risk_patterns_enabled
  ON public.brief_risk_patterns (severity)
  WHERE enabled = true;

ALTER TABLE public.brief_risk_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access risk_patterns" ON public.brief_risk_patterns;
CREATE POLICY "Service role full access risk_patterns"
  ON public.brief_risk_patterns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.brief_risk_patterns (pattern, category, severity, notes) VALUES
  ('withdraw super',           'super_withdrawal',     'review', 'Possible illegal super early-release scheme.'),
  ('early access to super',    'super_withdrawal',     'review', 'Likely illegal early-release pitch.'),
  ('super switching',          'super_switching',      'warn',   'Heightened compliance risk; ensure SOA path.'),
  ('guaranteed return',        'guaranteed_returns',   'review', 'Guaranteed-return language is a red flag.'),
  ('guaranteed returns',       'guaranteed_returns',   'review', 'Guaranteed-return language is a red flag.'),
  ('crypto leverage',          'crypto_leverage',      'review', 'Leveraged crypto exposure requires extra disclosure.'),
  ('retirement advice',        'retirement_advice',    'warn',   'Personal advice scope check.'),
  ('tax avoidance',            'tax_avoidance',        'block',  'Block — illegal tax avoidance schemes.'),
  ('foreign ownership',        'foreign_ownership',    'warn',   'FIRB / foreign ownership compliance check.'),
  ('managed investment scheme','managed_invest_scheme','warn',   'AFSL scope for MIS interests.'),
  ('wholesale only',           'wholesale_only',       'warn',   'Wholesale-investor qualification check.'),
  ('private credit',           'private_credit',       'warn',   'Private credit suitability check.'),
  ('high yield',               'high_yield',           'warn',   'High-yield wording often signals risk-mismatch.'),
  ('urgent advice',            'urgent_advice',        'warn',   'High pressure / urgency language.')
ON CONFLICT (pattern, category) DO NOTHING;

-- ── 8. brief_tracker_events ───────────────────────────────────────────────
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
