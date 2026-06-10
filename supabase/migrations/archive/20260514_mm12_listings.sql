-- =============================================================================
-- Migration: MM-12 — listings (owner-driven reverse-flow primitive)
-- Date:       2026-05-14
-- Stream:     marketplace / reverse flow
--
-- Why: today the marketplace flows in one direction — investors post Match
--   Requests (`advisor_auctions`) and pros respond. The inverse — listing
--   owners (sellers of property, businesses, syndicates, single assets)
--   posting an opportunity that *investors* can find via Get Matched — was
--   never primitive. The router has a deferred `listing_brief` route that
--   currently bounces to `/briefs/new?template=listing_readiness`, which
--   collects "help me get ready to list" but never produces a real
--   discoverable listing.
--
--   This migration introduces the `listings` table for that primitive.
--   It is intentionally separate from `investment_listings` (the legacy
--   paid catalog, vertical-keyed, set up under 20260402_investment_listings.sql)
--   so we can iterate on owner-flow moderation, lifecycle and matching
--   without disturbing the catalog. A future migration may unify them once
--   the workflows converge.
--
-- Design decisions:
--   - `kind` is a 4-value enum (property, business, syndicate, asset_other)
--     instead of free-form vertical so the front-end can keep its three-step
--     wizard simple. Drift handled via CHECK constraint not enum type so we
--     can add values without an ALTER TYPE migration.
--   - `status` is the lifecycle: draft → pending_review → approved/rejected,
--     plus terminal `archived`. Admin moderation lives at /admin/listings/
--     moderation. Public browse only shows `approved`.
--   - `payload jsonb` is a free-form bag for kind-specific details (zoning,
--     turnover, deal structure, etc.). Schema validation lives at the API
--     layer so we can evolve UI without DB migrations. Same pattern as
--     `advisor_auctions.brief_payload`.
--   - `view_count` + `match_request_count` are lightweight engagement
--     counters incremented from helper code, not triggers — keeps the
--     hot path snappy and the counters out of the RLS policy graph.
--   - `slug text UNIQUE NOT NULL` — generated from the title with a
--     timestamp tail (see `lib/listings/create.ts`); collisions retry once.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + IF NOT EXISTS on indexes.
--   ENABLE/FORCE ROW LEVEL SECURITY is idempotent. DROP POLICY IF EXISTS
--   before each CREATE POLICY. Safe to re-run.
--
-- Rollback (destructive — only on a clean rebuild, table may contain real
-- owner-submitted opportunities):
--   BEGIN;
--     DROP POLICY IF EXISTS "anon reads approved listings"   ON public.listings;
--     DROP POLICY IF EXISTS "owner reads own listings"       ON public.listings;
--     DROP POLICY IF EXISTS "owner updates own draft listings" ON public.listings;
--     DROP POLICY IF EXISTS "service_role full access"       ON public.listings;
--     ALTER TABLE public.listings DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.listings; -- only on a clean rebuild
--   COMMIT;
--
-- Risk: low — additive table, no foreign references from other tables yet.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.listings (
  id                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   text         NOT NULL UNIQUE,
  owner_user_id          uuid         REFERENCES auth.users (id) ON DELETE SET NULL,
  owner_email            text         NOT NULL,
  title                  text         NOT NULL,
  kind                   text         NOT NULL
                                      CHECK (kind IN ('property', 'business', 'syndicate', 'asset_other')),
  asking_price_cents     bigint,
  currency               text         NOT NULL DEFAULT 'AUD',
  location_state         text,
  description            text,
  payload                jsonb        NOT NULL DEFAULT '{}'::jsonb,
  status                 text         NOT NULL DEFAULT 'draft'
                                      CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  moderation_notes       text,
  view_count             integer      NOT NULL DEFAULT 0,
  match_request_count    integer      NOT NULL DEFAULT 0,
  created_at             timestamptz  NOT NULL DEFAULT now(),
  updated_at             timestamptz  NOT NULL DEFAULT now(),
  approved_at            timestamptz,
  rejected_at            timestamptz
);

CREATE INDEX IF NOT EXISTS idx_listings_status
  ON public.listings (status);

CREATE INDEX IF NOT EXISTS idx_listings_owner_user_id
  ON public.listings (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_listings_slug
  ON public.listings (slug);

CREATE INDEX IF NOT EXISTS idx_listings_kind_status
  ON public.listings (kind, status);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings FORCE  ROW LEVEL SECURITY;

-- Public read: anonymous browse sees only `approved` rows. Other statuses
-- are owner / admin surfaces and must not leak to the index.
DROP POLICY IF EXISTS "anon reads approved listings" ON public.listings;
CREATE POLICY "anon reads approved listings"
  ON public.listings
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- Owner read: an authenticated owner reads all of their own listings
-- regardless of status (so the tracker page can show drafts + pending).
DROP POLICY IF EXISTS "owner reads own listings" ON public.listings;
CREATE POLICY "owner reads own listings"
  ON public.listings
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

-- Owner update: only mutate own listings while still draft. Submission to
-- pending_review goes through a service-role API endpoint so we can stamp
-- audit fields. Once moderated, owners go back through admin to amend.
DROP POLICY IF EXISTS "owner updates own draft listings" ON public.listings;
CREATE POLICY "owner updates own draft listings"
  ON public.listings
  FOR UPDATE TO authenticated
  USING     (owner_user_id = auth.uid() AND status = 'draft')
  WITH CHECK (owner_user_id = auth.uid() AND status = 'draft');

-- Service-role full access — admin moderation, link-to-brief counter
-- bumps, and cron jobs all run through this policy.
DROP POLICY IF EXISTS "service_role full access" ON public.listings;
CREATE POLICY "service_role full access"
  ON public.listings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
