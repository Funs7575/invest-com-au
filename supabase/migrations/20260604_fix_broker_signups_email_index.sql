-- ============================================================================
-- Migration: 20260604_fix_broker_signups_email_index.sql
-- Purpose: Repair the broken idx_broker_signups_slug_email index, which was
--          created by 20260413_observability_indexes.sql over a column that
--          does not exist.
--
--          broker_signups (created by 20260408_tier1_revenue_features.sql) has
--          NO `email` column — confirmed against prod and against the
--          regenerated lib/database.types.ts. The sole writer of this table,
--          app/api/webhooks/broker-signup/route.ts, is an affiliate-network
--          CONVERSION POSTBACK: it records click_id / external_ref for
--          attribution and never captures the user's email (the email lives at
--          the broker, not with us). So no email is, or can be, stored here.
--
--          Because the table never captures an email, the correct remedy is to
--          FIX THE INDEX rather than add a permanently-NULL column. We drop the
--          invalid (broker_slug, email) index and create the composite the write
--          path actually exercises: the duplicate-postback guard does an
--          equality-on-both lookup
--              .eq("external_ref", …).eq("broker_slug", …)
--          (maybeSingle) on every postback. That lookup currently has no
--          supporting composite index, so the replacement is purposeful, not
--          redundant with the existing single-column idx_signups_broker /
--          idx_signups_click indexes.
--
--          NOTE: in prod the original CREATE INDEX over (broker_slug, email)
--          would have failed (undefined column), so idx_broker_signups_slug_email
--          most likely never materialised there — DROP INDEX IF EXISTS is a
--          no-op in that case and remains safe.
--
--          SUPERSEDED (2026-06-04): the root cause is now fixed at source —
--          20260413_observability_indexes.sql creates
--          idx_broker_signups_slug_external_ref directly (over the real
--          columns) instead of the invalid (broker_slug, email) index, so a
--          fresh rebuild no longer aborts and reaches this file with the
--          correct index already in place. This migration is therefore kept as
--          an idempotent NO-OP / belt-and-braces parity file:
--            - DROP INDEX IF EXISTS idx_broker_signups_slug_email cleans up any
--              environment where the bad index somehow materialised (none known).
--            - CREATE INDEX IF NOT EXISTS idx_broker_signups_slug_external_ref
--              is a no-op because 20260413 already created it.
--          It is retained (not deleted) because it already ran on prod and
--          dropping an applied migration from the chain is poor hygiene.
--
--          RLS on broker_signups is untouched (this is index-only); the
--          "Admin read signups" / "Service insert signups" policies from
--          20260408_tier1_revenue_features.sql remain in force.
--
-- Idempotent: DROP INDEX IF EXISTS + CREATE INDEX IF NOT EXISTS. Safe to
--             re-apply.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_broker_signups_slug_external_ref;
--   -- (Do NOT recreate idx_broker_signups_slug_email — it references a column
--   --  that does not exist and would fail.)
-- ============================================================================

BEGIN;

-- 1. Drop the invalid index over the non-existent `email` column.
DROP INDEX IF EXISTS public.idx_broker_signups_slug_email;

-- 2. Recreate it on the columns the write path actually uses: the
--    duplicate-postback guard's equality-on-both (external_ref, broker_slug).
CREATE INDEX IF NOT EXISTS idx_broker_signups_slug_external_ref
  ON public.broker_signups (broker_slug, external_ref);

COMMIT;
