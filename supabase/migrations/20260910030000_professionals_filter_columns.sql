-- Add qualifications, meeting_types, years_experience to professionals
-- if they don't already exist (idempotent).
-- Rollback: DROP INDEX professionals_qualifications_gin, professionals_meeting_types_gin;
--           ALTER TABLE professionals DROP COLUMN IF EXISTS qualifications, meeting_types, years_experience;
-- RLS: inherits existing professionals SELECT policy.

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS qualifications    TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meeting_types     TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience  INTEGER;

CREATE INDEX IF NOT EXISTS professionals_qualifications_gin
  ON professionals USING gin(qualifications);

CREATE INDEX IF NOT EXISTS professionals_meeting_types_gin
  ON professionals USING gin(meeting_types);
