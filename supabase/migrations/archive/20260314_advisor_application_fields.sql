-- ============================================================
-- 20260314: Advisor application + professionals enhanced fields
-- ============================================================
--
-- Adds pitch_message, years_experience, client_types, languages,
-- admin_notes, admin_priority, supply_gap_score to
-- advisor_applications, plus mirrored years_experience and
-- languages on professionals. Powers the admin applications
-- dashboard with supply/demand pipeline scoring.
--
-- ROLLBACK STRATEGY (forward-only in prod; for dev/staging only):
--   DROP INDEX IF EXISTS idx_advisor_applications_supply_gap;
--   DROP INDEX IF EXISTS idx_advisor_applications_status_priority;
--   ALTER TABLE professionals
--     DROP COLUMN IF EXISTS languages,
--     DROP COLUMN IF EXISTS years_experience;
--   ALTER TABLE advisor_applications
--     DROP COLUMN IF EXISTS supply_gap_score,
--     DROP COLUMN IF EXISTS admin_priority,
--     DROP COLUMN IF EXISTS admin_notes,
--     DROP COLUMN IF EXISTS languages,
--     DROP COLUMN IF EXISTS client_types,
--     DROP COLUMN IF EXISTS years_experience,
--     DROP COLUMN IF EXISTS pitch_message;
--
-- Risk: low — additive columns + indexes only.
-- All operations use IF NOT EXISTS to be idempotent on re-run.

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
