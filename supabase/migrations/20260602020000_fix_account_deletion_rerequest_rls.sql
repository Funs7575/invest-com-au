-- ============================================================================
-- Migration: 20260602020000_fix_account_deletion_rerequest_rls.sql
-- Purpose: Fix M1 — re-requesting account deletion after a cancel returned 500.
--   POST /api/account/delete upserts (onConflict user_id) the row back to
--   status='scheduled', but the UPDATE policy's USING clause required the
--   EXISTING row to already be status='scheduled'. A previously-'cancelled'
--   row therefore failed the USING check → RLS denial → 500, so a user who
--   cancelled and then changed their mind could not re-schedule deletion.
--   Relax USING to also match 'cancelled' rows so the scheduled<->cancelled
--   toggle works both ways. WITH CHECK is unchanged (the resulting status is
--   still constrained to scheduled/cancelled), and fulfilled/redacted rows
--   remain untouchable by the owner.
-- Risk: low — relaxes an over-tight USING on a self-owned row; no data change.
-- Rollback:
--   DROP POLICY IF EXISTS account_deletion_requests_self_cancel ON public.account_deletion_requests;
--   CREATE POLICY account_deletion_requests_self_cancel ON public.account_deletion_requests
--     FOR UPDATE USING (user_id = auth.uid() AND status = 'scheduled')
--     WITH CHECK (user_id = auth.uid() AND status = ANY (ARRAY['scheduled'::text,'cancelled'::text]));
-- ============================================================================

DROP POLICY IF EXISTS account_deletion_requests_self_cancel ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_self_cancel
  ON public.account_deletion_requests
  FOR UPDATE
  USING (user_id = auth.uid() AND status = ANY (ARRAY['scheduled'::text, 'cancelled'::text]))
  WITH CHECK (user_id = auth.uid() AND status = ANY (ARRAY['scheduled'::text, 'cancelled'::text]));
