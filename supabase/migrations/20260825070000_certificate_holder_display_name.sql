-- Add holder_display_name to course_certificates.
--
-- Powers the public, shareable certificate page (/certificate/[number]), which
-- must render the holder's name without joining to PII (email/user_id). The name
-- is captured at issuance from the (already-public) professional profile; existing
-- rows stay NULL and the page falls back to a generic label.
--
-- Forward-only, idempotent. RLS unchanged (column inherits the table's existing
-- per-user policies; the public page reads via the service-role client).
-- Rollback: ALTER TABLE course_certificates DROP COLUMN IF EXISTS holder_display_name;

ALTER TABLE course_certificates
  ADD COLUMN IF NOT EXISTS holder_display_name text;
