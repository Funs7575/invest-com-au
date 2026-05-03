-- =============================================================================
-- Date:          2026-05-02
-- Audit ref:     docs/audits/codebase-health-2026-04-24.md §A "RLS drift"
-- Queue item:    A-03 batch 5 (revenue product family)
-- Why:           Five revenue-product tables exist in the live DB and in
--                lib/database.types.ts but have no migration history. Without
--                CREATE TABLE migrations a clean rebuild cannot reconstruct
--                the schema from the repo alone (drift). Without RLS enabled,
--                PostgREST serves rows to any role that issues a query:
--
--                • campaigns — broker bidding & budget data (rate_cents,
--                  daily_budget_cents, total_spent_cents). Broker portal reads
--                  via browser client; admin manages via browser client; cron
--                  routes (low-balance-alerts, expire-deals, auto-bid) via
--                  service_role.
--                • featured_plans — pricing catalog for featured placements.
--                  Product reference data (stripe_price_id, price_cents_monthly);
--                  no direct authenticated-user callers found — read-only public
--                  catalog.
--                • pro_deals — broker deals/promotions. Public page
--                  /pro/deals reads via server.ts (anon); admin manages via
--                  browser client; cron expire-deals via service_role.
--                • pro_deal_redemptions — user deal redemptions; user_id FK.
--                  ProDealsClient inserts via browser client (auth.uid()).
--                • course_revenue — internal revenue-split ledger per course
--                  purchase. All callers are service_role (Stripe webhook
--                  handlers, admin course page).
--
-- Idempotency:   CREATE TABLE IF NOT EXISTS throughout. DROP POLICY IF EXISTS
--                before each CREATE POLICY. ENABLE/FORCE RLS are no-ops when
--                already enabled. Safe to re-apply.
--
-- Prior policy   grep confirmed: 0 existing CREATE POLICY / ENABLE RLS
-- state:         statements on any of these five tables across all migrations.
--                No DROP POLICY lines needed for prior policies.
--
-- Rollback:      For each table:
--                  ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
--                  ALTER TABLE public.<table> NO FORCE ROW LEVEL SECURITY;
--                  DROP POLICY IF EXISTS "<policy_name>" ON public.<table>;
--                  -- (do NOT drop the table itself — it has production data)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. campaigns
--    Broker bidding + budget management. Admin reads all; broker portal reads
--    own; cron routes use service_role.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.campaigns (
  id                       BIGSERIAL PRIMARY KEY,
  broker_slug              TEXT NOT NULL,
  placement_id             BIGINT,
  name                     TEXT NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending',
  bid_strategy             TEXT NOT NULL DEFAULT 'cpc',
  inventory_type           TEXT NOT NULL,
  rate_cents               INTEGER NOT NULL,
  start_date               DATE NOT NULL,
  end_date                 DATE,
  daily_budget_cents       INTEGER,
  total_budget_cents       INTEGER,
  total_spent_cents        INTEGER NOT NULL DEFAULT 0,
  priority                 INTEGER NOT NULL DEFAULT 50,
  target_cpa_cents         INTEGER,
  auto_bid_current_cents   INTEGER,
  auto_bid_min_cents       INTEGER,
  auto_bid_max_cents       INTEGER,
  auto_bid_last_adjusted_at TIMESTAMPTZ,
  active_days              INTEGER[],
  active_hours_start       INTEGER,
  active_hours_end         INTEGER,
  review_notes             TEXT,
  reviewed_at              TIMESTAMPTZ,
  reviewed_by              TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_broker_slug ON public.campaigns (broker_slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_placement_id ON public.campaigns (placement_id);

ENABLE ROW LEVEL SECURITY ON public.campaigns;
ALTER TABLE public.campaigns FORCE ROW LEVEL SECURITY;

-- Service role: full access for cron routes (low-balance-alerts, expire-deals,
-- auto-bid engine, go/[slug] redirect logger)
DROP POLICY IF EXISTS "Service role manages campaigns" ON public.campaigns;
CREATE POLICY "Service role manages campaigns"
  ON public.campaigns FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Admin (browser client, authenticated role): full access for admin dashboard
DROP POLICY IF EXISTS "Admin can manage all campaigns" ON public.campaigns;
CREATE POLICY "Admin can manage all campaigns"
  ON public.campaigns FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Broker portal (browser client, authenticated role): read own campaigns only
-- (broker_accounts.auth_user_id links the JWT uid to the broker_slug)
DROP POLICY IF EXISTS "Broker can read own campaigns" ON public.campaigns;
CREATE POLICY "Broker can read own campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (
    broker_slug IN (
      SELECT broker_slug FROM public.broker_accounts
      WHERE auth_user_id = auth.uid()::text
    )
  );

-- TODO: human review of policy semantics — broker UPDATE/INSERT policies
-- not added here because campaign creation/editing goes through the admin
-- approval queue; broker portal currently only reads campaigns. Add a
-- "Broker can update own campaigns" policy if self-serve campaign management
-- is enabled.

-- ---------------------------------------------------------------------------
-- 2. featured_plans
--    Pricing catalog for featured placement products. No direct authenticated-
--    user callers found in codebase — read-only public reference catalog.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.featured_plans (
  id                    BIGSERIAL PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  price_cents_monthly   INTEGER NOT NULL,
  stripe_price_id       TEXT,
  active                BOOLEAN DEFAULT true,
  features              JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ENABLE ROW LEVEL SECURITY ON public.featured_plans;
ALTER TABLE public.featured_plans FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages featured plans" ON public.featured_plans;
CREATE POLICY "Service role manages featured plans"
  ON public.featured_plans FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Public catalog read (pricing page, /advisor-featured, billing chooser).
-- active = true filter mirrors what UI components would apply anyway.
DROP POLICY IF EXISTS "Public can read active featured plans" ON public.featured_plans;
CREATE POLICY "Public can read active featured plans"
  ON public.featured_plans FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- ---------------------------------------------------------------------------
-- 3. pro_deals
--    Broker promotional deals. /pro/deals page reads publicly (anon);
--    admin manages via browser client; cron expire-deals uses service_role.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pro_deals (
  id                      BIGSERIAL PRIMARY KEY,
  broker_slug             TEXT NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT,
  deal_value              TEXT,
  redemption_code         TEXT,
  redemption_instructions TEXT,
  redemption_url          TEXT,
  terms                   TEXT,
  start_date              TIMESTAMPTZ,
  end_date                TIMESTAMPTZ,
  status                  TEXT NOT NULL DEFAULT 'active',
  featured                BOOLEAN DEFAULT false,
  sort_order              INTEGER,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_deals_broker_slug ON public.pro_deals (broker_slug);
CREATE INDEX IF NOT EXISTS idx_pro_deals_status ON public.pro_deals (status);

ENABLE ROW LEVEL SECURITY ON public.pro_deals;
ALTER TABLE public.pro_deals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages pro deals" ON public.pro_deals;
CREATE POLICY "Service role manages pro deals"
  ON public.pro_deals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- /pro/deals page: server RSC reads via createClient() (server.ts, anon key).
-- Only active deals are shown; expired/draft deals remain private.
DROP POLICY IF EXISTS "Public can read active pro deals" ON public.pro_deals;
CREATE POLICY "Public can read active pro deals"
  ON public.pro_deals FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Admin management: insert/update/delete via browser client
DROP POLICY IF EXISTS "Admin can manage pro deals" ON public.pro_deals;
CREATE POLICY "Admin can manage pro deals"
  ON public.pro_deals FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- 4. pro_deal_redemptions
--    User deal redemptions — user_id FK to auth.users. ProDealsClient inserts
--    via browser client (createClient(), auth.uid()).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pro_deal_redemptions (
  id           BIGSERIAL PRIMARY KEY,
  deal_id      BIGINT NOT NULL,
  user_id      TEXT NOT NULL,
  redeemed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_deal_redemptions_user_id ON public.pro_deal_redemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_pro_deal_redemptions_deal_id ON public.pro_deal_redemptions (deal_id);

ENABLE ROW LEVEL SECURITY ON public.pro_deal_redemptions;
ALTER TABLE public.pro_deal_redemptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages deal redemptions" ON public.pro_deal_redemptions;
CREATE POLICY "Service role manages deal redemptions"
  ON public.pro_deal_redemptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Users: INSERT own redemption (ProDealsClient) + SELECT own redemptions
DROP POLICY IF EXISTS "User can manage own redemptions" ON public.pro_deal_redemptions;
CREATE POLICY "User can manage own redemptions"
  ON public.pro_deal_redemptions FOR ALL
  TO authenticated
  USING  (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 5. course_revenue
--    Internal revenue-split ledger per course purchase. All callers confirmed
--    as service_role only: Stripe webhook (checkout-session-completed,
--    charge-refunded) and admin/courses page via createAdminClient().
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.course_revenue (
  id                     BIGSERIAL PRIMARY KEY,
  course_id              BIGINT NOT NULL,
  purchase_id            BIGINT NOT NULL,
  creator_id             BIGINT NOT NULL,
  revenue_share_percent  NUMERIC NOT NULL,
  total_amount           NUMERIC NOT NULL,
  creator_amount         NUMERIC NOT NULL,
  platform_amount        NUMERIC NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'pending',
  paid_at                TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_revenue_course_id ON public.course_revenue (course_id);
CREATE INDEX IF NOT EXISTS idx_course_revenue_creator_id ON public.course_revenue (creator_id);

ENABLE ROW LEVEL SECURITY ON public.course_revenue;
ALTER TABLE public.course_revenue FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages course revenue" ON public.course_revenue;
CREATE POLICY "Service role manages course revenue"
  ON public.course_revenue FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Note: no authenticated-user policy added — admin/courses page uses
-- createAdminClient() (service_role bypass). If the page is ever refactored
-- to use an API route with the admin client, this note can be removed.

COMMIT;
