-- ============================================================================
-- Migration: Tighten investment_listings RLS — SELECT-only for anon (B-08)
-- Date: 2026-04-30
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (P0 — RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md B-08 (option 4 follow-up to B-04)
--
-- Why: B-04 (20260601_rls_investment_listings.sql) enabled RLS on
-- investment_listings with anon INSERT (status='pending' only) and anon
-- UPDATE (column-scoped to views/enquiries) because the callers at the time
-- were the anon-key server client. This migration completes the planned
-- hardening:
--
--   /api/listings/submit/route.ts — INSERT path swapped to admin client
--   /api/listings/enquire/route.ts — UPDATE counter fallback swapped to admin client
--   increment_listing_enquiries() / increment_listing_views() — upgraded to
--     SECURITY DEFINER so anon callers can invoke the atomic increment
--     without needing an UPDATE policy.
--
-- After this migration the only anon-permitted DML on investment_listings is
-- SELECT (public catalogue). All writes go through the API layer which uses
-- the service-role admin client.
--
-- IMPORTANT — prior policy state (from 20260601_rls_investment_listings.sql):
--   "service_role full access"  — keep (service_role bypass)
--   "anon select catalogue"     — keep (public catalogue READ)
--   "anon insert pending"       — DROP (submit route now uses admin client)
--   "anon update counters"      — DROP (enquire fallback now uses admin client;
--                                       RPC uses SECURITY DEFINER — see below)
--
-- Column-level GRANT change: B-04 did
--   REVOKE UPDATE ON investment_listings FROM anon;
--   GRANT UPDATE (views, enquiries) ON investment_listings TO anon;
-- We restore the default table-wide UPDATE grant because the column-scoped
-- restriction is no longer meaningful once the update policy is dropped.
-- This is a no-op at the RLS level (no policy = no UPDATE for anon regardless)
-- but cleans up pg_privileges for future auditors.
--
-- RPC SECURITY DEFINER: increment_listing_enquiries and increment_listing_views
-- run with the caller's role by default. The primary path in the enquire route
-- is the RPC (with admin-client fallback); making the RPC SECURITY DEFINER
-- lets both anon and authenticated callers invoke the atomic counter without
-- needing an explicit UPDATE policy. search_path is pinned to prevent
-- search_path injection.
--
-- Idempotent: policies use DROP IF EXISTS + CREATE; GRANT/REVOKE and
-- CREATE OR REPLACE are idempotent by nature.
--
-- Rollback:
--   -- Restore anon INSERT + UPDATE policies:
--   CREATE POLICY "anon insert pending" ON investment_listings
--     FOR INSERT TO anon
--     WITH CHECK (status = 'pending' AND COALESCE(views,0)=0
--                 AND COALESCE(enquiries,0)=0 AND listed_by_professional_id IS NULL);
--   CREATE POLICY "anon update counters" ON investment_listings
--     FOR UPDATE TO anon USING (true) WITH CHECK (true);
--   REVOKE UPDATE ON investment_listings FROM anon;
--   GRANT UPDATE (views, enquiries) ON investment_listings TO anon;
--   -- Restore RPC to non-SECURITY-DEFINER:
--   CREATE OR REPLACE FUNCTION increment_listing_enquiries(listing_id INTEGER)
--     RETURNS VOID LANGUAGE SQL AS $$ UPDATE investment_listings
--     SET enquiries = enquiries + 1, updated_at = NOW() WHERE id = listing_id; $$;
--   CREATE OR REPLACE FUNCTION increment_listing_views(listing_id INTEGER)
--     RETURNS VOID LANGUAGE SQL AS $$ UPDATE investment_listings
--     SET views = views + 1, updated_at = NOW() WHERE id = listing_id; $$;
-- ============================================================================

BEGIN;

-- Drop the anon write policies (callers now go through admin client or SECURITY DEFINER RPC).
DROP POLICY IF EXISTS "anon insert pending"  ON investment_listings;
DROP POLICY IF EXISTS "anon update counters" ON investment_listings;

-- Restore table-wide UPDATE grant to anon (cleans up the column-scoped grant
-- from B-04). No RLS policy allows the UPDATE, so this is policy-neutral.
GRANT UPDATE ON investment_listings TO anon;

-- Upgrade atomic counter RPCs to SECURITY DEFINER so anon callers can invoke
-- them without a broad UPDATE policy on the table. search_path pinned to
-- prevent search_path injection (per audit §4 O-03 recommendation).
CREATE OR REPLACE FUNCTION increment_listing_enquiries(listing_id INTEGER)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  UPDATE investment_listings
  SET enquiries = enquiries + 1,
      updated_at = NOW()
  WHERE id = listing_id;
$$;

CREATE OR REPLACE FUNCTION increment_listing_views(listing_id INTEGER)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  UPDATE investment_listings
  SET views = views + 1,
      updated_at = NOW()
  WHERE id = listing_id;
$$;

-- TODO: human review of policy semantics — anon is now SELECT-only on
-- investment_listings. All write paths confirmed to use admin client or
-- SECURITY DEFINER RPC as of queue item B-08.

COMMIT;
