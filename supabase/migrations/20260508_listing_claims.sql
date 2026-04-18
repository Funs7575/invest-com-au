-- ============================================================
-- listing_claims — capture "claim this listing" requests from
-- broker and advisor profile pages. Admin reviews the claim
-- and confirms the claimant's identity / credentials before
-- transferring ownership.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.listing_claims (
  id           SERIAL PRIMARY KEY,
  claim_type   TEXT NOT NULL CHECK (claim_type IN ('broker', 'advisor', 'listing')),
  target_slug  TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  company_role TEXT,
  phone        TEXT,
  message      TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_claims_target
  ON public.listing_claims (claim_type, target_slug);
CREATE INDEX IF NOT EXISTS idx_listing_claims_status
  ON public.listing_claims (status, created_at DESC);
