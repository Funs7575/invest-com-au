-- ============================================================================
-- Migration: 20260602010000_forum_reports.sql
-- Purpose: Capture community "Report" submissions (P1-4). The Report button on
--          forum posts/threads POSTs action:"report" to
--          /api/community/moderate, but that route only accepted moderator
--          actions and was moderator-gated, so a normal user's report was
--          silently rejected (the client still showed "Reported"). This table
--          records reports so moderators can review them via the admin client.
-- Risk: low — additive table, owner-scoped RLS. No existing data touched.
-- Rollback:
--   DROP TABLE IF EXISTS public.forum_reports;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.forum_reports (
  id                bigserial PRIMARY KEY,
  target_type       text NOT NULL CHECK (target_type IN ('post', 'thread')),
  target_id         bigint NOT NULL,
  reporter_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason            text CHECK (reason IS NULL OR char_length(reason) <= 500),
  status            text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'reviewed', 'dismissed', 'action_taken')),
  resolved_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  -- One live report per user per target — re-reporting refreshes the row.
  UNIQUE (target_type, target_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_reports_status_created
  ON public.forum_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_reports_target
  ON public.forum_reports (target_type, target_id);

ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reports FORCE ROW LEVEL SECURITY;

-- Reporters can see + create their own reports. Moderators review via the
-- service-role admin client (consistent with how /api/community/moderate
-- already performs moderator reads/writes).
DROP POLICY IF EXISTS "forum_reports owner select" ON public.forum_reports;
CREATE POLICY "forum_reports owner select"
  ON public.forum_reports FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "forum_reports owner insert" ON public.forum_reports;
CREATE POLICY "forum_reports owner insert"
  ON public.forum_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "forum_reports service_role" ON public.forum_reports;
CREATE POLICY "forum_reports service_role"
  ON public.forum_reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
