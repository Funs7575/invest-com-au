-- ============================================================================
-- Migration: C-02 step 4 — professional_reviews: advisor self-scoped SELECT
-- Date: 2026-04-30
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md C-02 (step 4)
--
-- Why:
--   The advisor dashboard (app/api/advisor-auth/data/route.ts) queries
--   professional_reviews filtered to status='approved'. Pending and rejected
--   reviews are invisible to the advisor who owns them when queried via the
--   Supabase Auth client (createClient()), because the only SELECT policy on
--   professional_reviews is "Public can view approved reviews" which gates on
--   status = 'approved' (TO {public}).
--
--   This migration adds "Advisor can view own reviews" (TO authenticated) so
--   Supabase Auth advisors can see all their reviews regardless of status,
--   enabling future removal of the .eq("status","approved") filter once the
--   data route is switched from admin client to auth client.
--
-- Prior policy state on professional_reviews (live DB at migration time):
--   "Public can view approved reviews" — SELECT, TO {public},
--                                        USING (status = 'approved')
--   "Insert professional reviews"      — INSERT, TO {anon,authenticated}
--   (RLS already enabled — see 20260309_advisor_reviews_and_views.sql)
--
-- The new policy stacks additively with the existing public policy; it does
-- not replace it. Unauthenticated callers (e.g. the public advisor profile
-- page) continue to see only approved reviews via the existing policy.
--
-- Verified callers of professional_reviews SELECT (grep app/ lib/):
--   - app/api/advisor-auth/data/route.ts  SELECT via createAdminClient(),
--                                         .eq("status","approved") — admin
--                                         client bypasses RLS (unchanged)
--   All other callers use admin or are filtered to status='approved'.
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE is idempotent; RLS was already
-- enabled by 20260309_advisor_reviews_and_views.sql (no ENABLE needed here).
--
-- Rollback:
--   DROP POLICY IF EXISTS "Advisor can view own reviews" ON professional_reviews;
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Advisor can view own reviews" ON professional_reviews;
CREATE POLICY "Advisor can view own reviews"
  ON professional_reviews
  FOR SELECT
  TO authenticated
  USING (
    professional_id = (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

COMMIT;
