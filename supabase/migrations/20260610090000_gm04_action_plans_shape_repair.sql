-- gm04: repair get_matched_action_plans to the shape the code writes.
--
-- WHY: prod's table predates the (never-applied, now-archived) gm01 migration
-- — it lacks session_id/email/route/checklist/etc., so createPlan's INSERT
-- throws `column "session_id" does not exist` → the funnel degrades to
-- ephemeral mode ("database being set up" banner) and plans never persist.
-- First forward migration after the 00000000000000 baseline repair (PR #1479).
--
-- ROLLBACK: additive-only (ADD COLUMN IF NOT EXISTS / indexes / policies).
-- To revert, drop the added columns/indexes/policies by name; no data is
-- mutated and existing columns are untouched.

ALTER TABLE public.get_matched_action_plans
  ADD COLUMN IF NOT EXISTS session_id            text,
  ADD COLUMN IF NOT EXISTS email                 text,
  ADD COLUMN IF NOT EXISTS secondary_intent_slug text,
  ADD COLUMN IF NOT EXISTS route                 text,
  ADD COLUMN IF NOT EXISTS goal                  text,
  ADD COLUMN IF NOT EXISTS checklist             jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS budget_band           text,
  ADD COLUMN IF NOT EXISTS timeline              text,
  ADD COLUMN IF NOT EXISTS location_state        text,
  ADD COLUMN IF NOT EXISTS country_of_residence  text,
  ADD COLUMN IF NOT EXISTS help_needed           text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS risk_flags            text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS risk_severity         text,
  ADD COLUMN IF NOT EXISTS linked_brief_id       int,
  ADD COLUMN IF NOT EXISTS meta                  jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_action_plans_session
  ON public.get_matched_action_plans (session_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_auth_user
  ON public.get_matched_action_plans (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_plans_intent_route
  ON public.get_matched_action_plans (intent_slug, route);

-- RLS: user-data table — owner read/update via auth_user_id; everything else
-- goes through the service-role server paths (session-keyed anonymous flows).
ALTER TABLE public.get_matched_action_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own action plan" ON public.get_matched_action_plans;
CREATE POLICY "Owner reads own action plan"
  ON public.get_matched_action_plans FOR SELECT
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Owner updates own action plan" ON public.get_matched_action_plans;
CREATE POLICY "Owner updates own action plan"
  ON public.get_matched_action_plans FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Service role full access action plans" ON public.get_matched_action_plans;
CREATE POLICY "Service role full access action plans"
  ON public.get_matched_action_plans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
