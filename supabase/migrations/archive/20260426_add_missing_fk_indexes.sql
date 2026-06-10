-- ============================================================
-- Add 4 missing foreign-key indexes (audit F-4.5.4 / P2)
--
-- Source: 04-26 audit §4.5 (Supabase performance advisor —
-- `unindexed_foreign_keys` lint, 4 findings).
--
-- Repo-side parity for the 4 indexes the founder applied LIVE on
-- 2026-04-26 via Supabase MCP (migration name on the live DB:
-- `add_missing_fk_indexes_2026_04_26`). This file ensures the
-- supabase/migrations/ source-of-truth catches up to live so:
--
--   1. Fresh dev environments rebuild correctly from migrations.
--   2. CI's pending stream-A drift reconciliation doesn't re-flag
--      these tables as drifted.
--   3. Any future rollback-from-source has the index definitions.
--
-- Idempotent (`IF NOT EXISTS`). Safe to re-apply on the live DB —
-- will be a no-op since the indexes already exist with these exact
-- names (verified via pg_indexes query 2026-04-26).
--
-- Performance impact: each index speeds up FK joins + cascading
-- delete checks; together they close all 4
-- `unindexed_foreign_keys` advisor findings.
--
-- Rollback (operator-only):
--   DROP INDEX IF EXISTS public.idx_affiliate_payout_variance_report_id;
--   DROP INDEX IF EXISTS public.idx_broker_review_invites_user_review_id;
--   DROP INDEX IF EXISTS public.idx_international_leads_professional_lead_id;
--   DROP INDEX IF EXISTS public.idx_sponsored_placement_bookings_broker_id;
-- ============================================================

-- 1. affiliate_payout_variance.report_id → affiliate_payout_reports
CREATE INDEX IF NOT EXISTS idx_affiliate_payout_variance_report_id
  ON public.affiliate_payout_variance USING btree (report_id);

-- 2. broker_review_invites.user_review_id → user_reviews
CREATE INDEX IF NOT EXISTS idx_broker_review_invites_user_review_id
  ON public.broker_review_invites USING btree (user_review_id);

-- 3. international_leads.professional_lead_id → professional_leads
CREATE INDEX IF NOT EXISTS idx_international_leads_professional_lead_id
  ON public.international_leads USING btree (professional_lead_id);

-- 4. sponsored_placement_bookings.broker_id → brokers
CREATE INDEX IF NOT EXISTS idx_sponsored_placement_bookings_broker_id
  ON public.sponsored_placement_bookings USING btree (broker_id);
