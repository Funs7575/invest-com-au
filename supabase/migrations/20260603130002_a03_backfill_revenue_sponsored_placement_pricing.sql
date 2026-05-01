-- ============================================================================
-- Migration: Backfill public.sponsored_placement_pricing (A-03 batch 1)
-- Date:      2026-05-01 (queued under 20260603 to sort after A-02 batch 1)
-- Audit ref: docs/audits/drift-list.md (A-06 marketplace family,
--            shipped via the A-03 revenue iteration grouping)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03
--
-- Purpose
--   `sponsored_placement_pricing` is declared in `lib/database.types.ts`
--   (line 10659) but the migration tree never CREATEs the table. It is
--   the rate card for sponsored placement slots — one row per (tier,
--   duration_days) combination, with the price in cents, the Stripe
--   price_id for checkout, and a max-concurrent slot count for capacity.
--
--   Used by 2 call sites:
--     - app/advertise/featured-placement/page.tsx     (public read of the rate card)
--     - app/api/advertise/create-checkout/route.ts    (read price for Stripe checkout)
--
-- Why it matters
--   Revenue surface — drives the `/advertise/featured-placement` page and
--   the Stripe Checkout creation flow. Pricing is shown publicly on the
--   marketing page, but writes are admin-only.
--
-- Schema source of truth
--   Live DB (verified 2026-05-01 via information_schema.columns) +
--   lib/database.types.ts → Database['public']['Tables']['sponsored_placement_pricing'].
--   - id                bigint      PK   nextval('sponsored_placement_pricing_id_seq')
--   - tier              text        NOT NULL  CHECK (tier IN ('featured_partner','editors_pick','deal_of_month'))
--   - duration_days     integer     NOT NULL  CHECK (duration_days > 0)
--   - amount_cents      bigint      NOT NULL  CHECK (amount_cents > 0)
--   - currency          text        NOT NULL DEFAULT 'AUD'
--   - stripe_price_id   text        NULLABLE
--   - max_concurrent    integer     NOT NULL DEFAULT 3
--   - description       text        NULLABLE
--   - active            boolean     NOT NULL DEFAULT true
--   - sort_order        integer     NOT NULL DEFAULT 0
--   - created_at        timestamptz NOT NULL DEFAULT now()
--
--   UNIQUE (tier, duration_days) — one price per (tier, duration) pair.
--
-- Divergence from types
--   - Types declare `amount_cents: number`; live DB is `bigint`. Migration
--     uses `bigint` — trust live DB.
--   - Live DB has CHECK constraints on `tier`, `duration_days > 0`,
--     `amount_cents > 0` not visible in the type. Migration ports them
--     verbatim from live.
--
-- RLS policy chosen — read-public-config / write-admin
--   - service_role: explicit FOR ALL allow.
--   - authenticated: SELECT permitted (active rows only — see policy below).
--   - anon: SELECT permitted (active rows only).
--   - INSERT/UPDATE/DELETE: NOT granted to anon/authenticated. Rate card
--     edits flow through admin tooling using the service-role client.
--
--   Justification: this is a rate card, not PII. The marketing page
--   (`/advertise/featured-placement`) renders prices to anonymous visitors
--   via the user-cookie Supabase client. Same pattern as `lead_pricing`
--   in A-02 batch 1 — public-read of pricing config is the existing
--   behaviour, and granting read here means we don't need to refactor the
--   marketing page to use the admin client just to fetch list prices.
--   The `WHERE active = true` in the SELECT policy keeps draft/retired
--   tiers internal-only (admin tooling reads via service-role and sees
--   everything).
--
-- Idempotency
--   - The body uses `if not exists` on the table — no-op when it exists.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--   - The CHECK constraints are inlined in the table definition so they
--     attach atomically with the create; no separate ADD CONSTRAINT step
--     to guard.
--
-- Risk: low
--   - Forward-only schema add; no data shaping.
--   - Public read of active rows mirrors today's behaviour (the
--     marketing page already reads the table via the user-cookie client).
--   - No write paths exposed to anon/authenticated.
--
-- Flagged ambiguity
--   - `stripe_price_id` is left nullable here to match live DB and types,
--     but a row with no `stripe_price_id` cannot drive Stripe Checkout.
--     The create-checkout route should defensively skip such rows; not in
--     scope for this backfill.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"  ON public.sponsored_placement_pricing;
--     DROP POLICY IF EXISTS "public read active pricing" ON public.sponsored_placement_pricing;
--     ALTER TABLE public.sponsored_placement_pricing DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.sponsored_placement_pricing;  -- destructive; clean rebuild only
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.sponsored_placement_pricing (
  id                bigserial   NOT NULL,
  tier              text        NOT NULL,
  duration_days     integer     NOT NULL,
  amount_cents      bigint      NOT NULL,
  currency          text        NOT NULL DEFAULT 'AUD',
  stripe_price_id   text,
  max_concurrent    integer     NOT NULL DEFAULT 3,
  description       text,
  active            boolean     NOT NULL DEFAULT true,
  sort_order        integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sponsored_placement_pricing_pkey PRIMARY KEY (id),
  CONSTRAINT sponsored_placement_pricing_tier_check
    CHECK (tier IN ('featured_partner', 'editors_pick', 'deal_of_month')),
  CONSTRAINT sponsored_placement_pricing_duration_days_check
    CHECK (duration_days > 0),
  CONSTRAINT sponsored_placement_pricing_amount_cents_check
    CHECK (amount_cents > 0),
  CONSTRAINT sponsored_placement_pricing_tier_duration_days_key
    UNIQUE (tier, duration_days)
);

ALTER TABLE public.sponsored_placement_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsored_placement_pricing FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.sponsored_placement_pricing;
CREATE POLICY "service_role full access"
  ON public.sponsored_placement_pricing
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Public read of active rate card — same pattern as lead_pricing (A-02
-- batch 1). The marketing page renders prices to anonymous visitors;
-- writes go through admin/service-role only.
DROP POLICY IF EXISTS "public read active pricing" ON public.sponsored_placement_pricing;
CREATE POLICY "public read active pricing"
  ON public.sponsored_placement_pricing
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- No anon/authenticated INSERT/UPDATE/DELETE: rate card edits flow through
-- admin tooling using the service-role client.

COMMIT;
