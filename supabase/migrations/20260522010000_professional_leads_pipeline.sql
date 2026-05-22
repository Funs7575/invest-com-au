-- Migration: advisor pipeline CRM columns on professional_leads.
--
-- Adds:
--   pipeline_stage TEXT — where the lead sits in the advisor's workflow.
--   next_action_at TIMESTAMPTZ — when the advisor next wants to follow up.
--
-- The lead-followup-reminders cron (/api/cron/lead-followup-reminders)
-- queries WHERE next_action_at <= now() AND pipeline_stage NOT IN ('won','lost')
-- and sends a reminder email to the advisor.
--
-- Rollback:
--   ALTER TABLE public.professional_leads DROP COLUMN IF EXISTS pipeline_stage;
--   ALTER TABLE public.professional_leads DROP COLUMN IF EXISTS next_action_at;

BEGIN;

ALTER TABLE public.professional_leads
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ;

-- Constraint added separately so we can use IF NOT EXISTS on the column
-- add but still gate bad values. Postgres doesn't support
-- ADD CONSTRAINT IF NOT EXISTS on plain ALTER TABLE … ADD COLUMN CHECK;
-- instead we drop+recreate idempotently.
ALTER TABLE public.professional_leads
  DROP CONSTRAINT IF EXISTS professional_leads_pipeline_stage_check;

ALTER TABLE public.professional_leads
  ADD CONSTRAINT professional_leads_pipeline_stage_check
    CHECK (pipeline_stage IN ('new','contacted','proposal_sent','negotiating','won','lost'));

-- Index: cron query (overdue follow-ups)
CREATE INDEX IF NOT EXISTS idx_professional_leads_next_action_overdue
  ON public.professional_leads (next_action_at)
  WHERE next_action_at IS NOT NULL;

-- Index: advisor-scoped kanban query
CREATE INDEX IF NOT EXISTS idx_professional_leads_advisor_pipeline
  ON public.professional_leads (professional_id, pipeline_stage);

COMMIT;
