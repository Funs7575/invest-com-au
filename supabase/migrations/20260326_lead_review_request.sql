-- Migration: Track review request emails sent from advisor portal
ALTER TABLE professional_leads
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN professional_leads.review_requested_at IS 'Timestamp when the advisor sent a review request email to the user. NULL = not yet sent.';
