-- gm05: "My Options" workspace storage (Decision Engine P5).
--
-- Adds saved_items jsonb to get_matched_action_plans: the user's shortlisted
-- advisors / listings / platforms ({kind, ref, label?, saved_at}). Saving is
-- not contacting — single-lead allocation still only happens at an explicit
-- confirm. RLS for this table was established in gm04 (owner read/update +
-- service-role all); this column rides those policies.
--
-- ROLLBACK: ALTER TABLE public.get_matched_action_plans DROP COLUMN saved_items;

ALTER TABLE public.get_matched_action_plans
  ADD COLUMN IF NOT EXISTS saved_items jsonb NOT NULL DEFAULT '[]'::jsonb;
