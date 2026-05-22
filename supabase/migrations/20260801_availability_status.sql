-- Add availability_status to the professionals table.
-- This column lets advisors self-report whether they are currently
-- accepting new clients, on a waitlist, or not taking clients.
--
-- Rollback: ALTER TABLE professionals DROP COLUMN availability_status;

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'open'
    CHECK (availability_status IN ('open', 'waitlist', 'closed'));

COMMENT ON COLUMN professionals.availability_status IS
  'Self-reported advisor availability. '
  '''open'' = accepting new clients; '
  '''waitlist'' = accepting but queue may delay; '
  '''closed'' = not taking new clients.';
