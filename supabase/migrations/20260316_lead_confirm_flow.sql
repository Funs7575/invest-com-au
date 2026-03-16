-- Migration: Lead confirmation flow
-- Adds advisor_notified_at to track when advisor was notified.
-- NULL = not yet notified; value = timestamp of notification.
-- This enables a 15-minute hold where users can confirm intent before the advisor is emailed.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS advisor_notified_at TIMESTAMPTZ NULL;

-- Index for the cron that processes unnotified leads
CREATE INDEX IF NOT EXISTS idx_leads_unnotified
  ON leads (created_at)
  WHERE advisor_notified_at IS NULL AND lead_type = 'advisor' AND professional_id IS NOT NULL;
