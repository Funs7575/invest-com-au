-- mm11_plan_resume_emails.sql
-- Dedup ledger for the "pick up where you left off" re-engagement email.
-- Cron /api/cron/plan-resume-digest finds get_matched_action_plans rows
-- in status='draft' that have been quiet for >3 days, then sends an
-- email to the owner — but only if we haven't already emailed them in
-- the last 7 days. This table is the dedup record.
--
-- Rollback: DROP TABLE plan_resume_emails;

CREATE TABLE IF NOT EXISTS plan_resume_emails (
  id bigserial PRIMARY KEY,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id bigint NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_resume_emails_user_sent_idx
  ON plan_resume_emails (auth_user_id, sent_at DESC);

ALTER TABLE plan_resume_emails ENABLE ROW LEVEL SECURITY;

-- Service-role-only — this table is internal cron bookkeeping, never
-- exposed to authenticated reads.
DROP POLICY IF EXISTS "plan_resume_emails_service_role" ON plan_resume_emails;
CREATE POLICY "plan_resume_emails_service_role" ON plan_resume_emails
  FOR ALL TO service_role USING (true) WITH CHECK (true);
