-- Migration: professionals_auth_user_id
-- Adds auth_user_id to the professionals table so advisors who are also
-- forum users can be identified and shown a VerifiedAdvisorBadge on their posts.
--
-- Rollback:
--   ALTER TABLE professionals DROP COLUMN IF EXISTS auth_user_id;
--   DROP INDEX IF EXISTS professionals_auth_user_id_unique;

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS professionals_auth_user_id_unique
  ON professionals(auth_user_id)
  WHERE auth_user_id IS NOT NULL;
