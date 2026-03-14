-- Add enhanced application fields for supply/demand pipeline
-- These support the admin applications dashboard with pitch messages,
-- experience tracking, and supply gap scoring

ALTER TABLE advisor_applications
  ADD COLUMN IF NOT EXISTS pitch_message text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS client_types text,
  ADD COLUMN IF NOT EXISTS languages text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS admin_priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS supply_gap_score real;

-- Also ensure professionals table has years_experience and languages columns
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}';

-- Index for admin review pipeline filtering
CREATE INDEX IF NOT EXISTS idx_advisor_applications_status_priority
  ON advisor_applications (status, admin_priority);

CREATE INDEX IF NOT EXISTS idx_advisor_applications_supply_gap
  ON advisor_applications (supply_gap_score DESC NULLS LAST)
  WHERE status = 'pending';
