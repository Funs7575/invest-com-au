-- ============================================================================
-- Migration: listing_advisor_opt_ins + public consumer job postings
-- Date: 2026-04-29
-- Branch: claude/advisor-platform-comparison-5vAIE
--
-- Why: Two new revenue surfaces on top of existing infrastructure.
--
--   (1) When a user posts an investment listing or property enquiry, they
--       can tick boxes saying "I'm open to be contacted by these advisor
--       types about this." Each tick fans out into a `leads` row through
--       the existing /api/submit-lead pipeline so confirm-lead-notify and
--       enforce-lead-sla crons treat them as normal advisor leads.
--
--   (2) Public Airtasker-style flow: a consumer posts a job, advisors bid
--       on it. Reuses the existing `advisor_auctions` + `advisor_auction_bids`
--       tables (defined in /migrations/20260411_sponsorship_marketplace.sql)
--       by adding consumer-facing columns. The same /api/advisor-auction/bid
--       endpoint still works.
--
-- Idempotent: all DDL uses IF NOT EXISTS / DROP-CREATE patterns.
--
-- Rollback:
--   DROP TABLE IF EXISTS listing_advisor_opt_ins;
--   ALTER TABLE advisor_auctions
--     DROP COLUMN IF EXISTS source,
--     DROP COLUMN IF EXISTS created_by_user_id,
--     DROP COLUMN IF EXISTS contact_email,
--     DROP COLUMN IF EXISTS contact_name,
--     DROP COLUMN IF EXISTS job_title,
--     DROP COLUMN IF EXISTS job_description,
--     DROP COLUMN IF EXISTS budget_band,
--     DROP COLUMN IF EXISTS advisor_types,
--     DROP COLUMN IF EXISTS is_public,
--     DROP COLUMN IF EXISTS slug;
-- ============================================================================

BEGIN;

-- ─── Part 1: listing_advisor_opt_ins ──────────────────────────────────────
-- Records the user's opt-in checkboxes when posting a listing.
-- One row per (listing-or-enquiry, advisor_type) pair.

CREATE TABLE IF NOT EXISTS listing_advisor_opt_ins (
  id BIGSERIAL PRIMARY KEY,
  -- Source of the opt-in: which form created it
  source TEXT NOT NULL CHECK (source IN ('investment_listing', 'property_enquiry', 'quiz_post', 'job_posting')),
  -- Foreign key to the originating record. Nullable because not every source
  -- has a corresponding row (quiz post-screen captures opt-ins before any
  -- listing exists). Caller is responsible for setting whichever applies.
  investment_listing_id INTEGER REFERENCES investment_listings(id) ON DELETE CASCADE,
  property_enquiry_id INTEGER,
  quiz_lead_id INTEGER,
  job_posting_id INTEGER,
  -- The advisor type the user opted in for. Mirrors ProfessionalType in lib/types.ts.
  advisor_type TEXT NOT NULL,
  -- Contact details (denormalised so we don't need to join back through the
  -- listing — keeps the lead-creation cron simple and resilient to listing
  -- deletion).
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  user_location_state TEXT,
  -- Free-text context that goes into the lead message.
  context_note TEXT,
  -- Lead lifecycle: did this opt-in get fanned out into the leads table yet?
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'matched', 'failed', 'unsubscribed')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listing_opt_ins_source ON listing_advisor_opt_ins(source);
CREATE INDEX IF NOT EXISTS idx_listing_opt_ins_status ON listing_advisor_opt_ins(status);
CREATE INDEX IF NOT EXISTS idx_listing_opt_ins_email ON listing_advisor_opt_ins(contact_email);
CREATE INDEX IF NOT EXISTS idx_listing_opt_ins_listing ON listing_advisor_opt_ins(investment_listing_id);

-- Idempotency: prevent duplicate opt-in rows when a user double-submits a
-- form. Uses (contact_email, source, source-id-tuple, advisor_type).
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_opt_ins_dedup ON listing_advisor_opt_ins(
  contact_email,
  source,
  COALESCE(investment_listing_id, 0),
  COALESCE(property_enquiry_id, 0),
  COALESCE(quiz_lead_id, 0),
  COALESCE(job_posting_id, 0),
  advisor_type
);

-- RLS: PII-bearing table. Service-role only.
ALTER TABLE listing_advisor_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_advisor_opt_ins FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON listing_advisor_opt_ins;
CREATE POLICY "service_role full access" ON listing_advisor_opt_ins
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Part 2: extend advisor_auctions for public consumer jobs ─────────────
-- The existing advisor_auctions table only carries lead_id + lead_type — no
-- consumer-facing fields. We add columns so a consumer-posted job is also a
-- row in this table, with `source = 'public_job'`.

ALTER TABLE advisor_auctions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'lead_match'
    CHECK (source IN ('lead_match', 'public_job')),
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS job_description TEXT,
  ADD COLUMN IF NOT EXISTS budget_band TEXT,
  ADD COLUMN IF NOT EXISTS advisor_types TEXT[],
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Make lead_id nullable for public jobs (originally NOT NULL).
ALTER TABLE advisor_auctions ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE advisor_auctions ALTER COLUMN lead_type DROP NOT NULL;

-- Slug uniqueness for public job URLs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_auctions_slug ON advisor_auctions(slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_source ON advisor_auctions(source);
CREATE INDEX IF NOT EXISTS idx_advisor_auctions_public ON advisor_auctions(is_public, status)
  WHERE is_public = true;

-- RLS for advisor_auctions: public jobs need a SELECT policy so unauth users
-- can read their own job by slug, and any anonymous user can browse the
-- public job board. Bids are still admin-only — see existing
-- /api/advisor-auction/bid handler.
ALTER TABLE advisor_auctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON advisor_auctions;
CREATE POLICY "service_role full access" ON advisor_auctions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public can read public jobs" ON advisor_auctions;
CREATE POLICY "public can read public jobs" ON advisor_auctions
  FOR SELECT TO anon, authenticated
  USING (is_public = true AND source = 'public_job');

-- Bids on public jobs are also publicly readable (advisor name + amount only;
-- the API layer is responsible for selecting only the columns it wants to
-- expose).
ALTER TABLE advisor_auction_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON advisor_auction_bids;
CREATE POLICY "service_role full access" ON advisor_auction_bids
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public can read bids on public jobs" ON advisor_auction_bids;
CREATE POLICY "public can read bids on public jobs" ON advisor_auction_bids
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM advisor_auctions a
      WHERE a.id = advisor_auction_bids.auction_id
        AND a.is_public = true
        AND a.source = 'public_job'
    )
  );

COMMIT;
