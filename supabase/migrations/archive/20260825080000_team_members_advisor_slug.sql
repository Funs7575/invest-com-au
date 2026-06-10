-- Add advisor_slug to team_members.
--
-- Lets a reviewer/author profile (/reviewers/[slug]) cross-link to that person's
-- advisor profile (/advisor/[slug]) + Trust Score when they are also a listed
-- advisor. The reviewer page already reads this field via select("*") and hides
-- the cross-link card when it is NULL, so this column simply makes the (already
-- shipped, dormant) feature ready — it still needs the reviewer→advisor mapping
-- populated per row.
--
-- Forward-only, idempotent. RLS unchanged (nullable column inherits the table's
-- existing policies). Rollback: ALTER TABLE team_members DROP COLUMN IF EXISTS advisor_slug;

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS advisor_slug text;
