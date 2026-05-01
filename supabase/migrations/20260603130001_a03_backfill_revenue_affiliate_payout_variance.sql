-- ============================================================================
-- Migration: Backfill public.affiliate_payout_variance (A-03 batch 1)
-- Date:      2026-05-01 (queued under 20260603 to sort after A-02 batch 1)
-- Audit ref: docs/audits/drift-list.md (A-05 affiliate / finance family,
--            shipped via the A-03 revenue iteration grouping)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03
--
-- Purpose
--   `affiliate_payout_variance` is declared in `lib/database.types.ts`
--   (line 1549) but the migration tree never CREATEs the table. It stores
--   the per-broker reconciliation result from comparing
--   `affiliate_payout_reports` (network-reported clicks/revenue) against
--   our own first-party click/conversion tracking, with a `flagged`
--   boolean for follow-up.
--
--   Used by 2 call sites:
--     - app/api/cron/affiliate-payout-recon/route.ts  (read recent + insert)
--
--   Inserted from the recon cron once per (broker, period) pair after each
--   variance calculation pass.
--
-- Why it matters
--   Revenue forensics — variance rows are the audit trail behind every
--   "broker is under-reporting" investigation. Without it, payout
--   discrepancies have no historical record.
--
-- Schema source of truth
--   Live DB (verified 2026-05-01 via information_schema.columns) +
--   lib/database.types.ts → Database['public']['Tables']['affiliate_payout_variance'].
--   - id                  bigint      PK   nextval('affiliate_payout_variance_id_seq')
--   - report_id           bigint      NULLABLE  FK -> affiliate_payout_reports(id) ON DELETE CASCADE
--   - broker_slug         text        NOT NULL
--   - period_start        date        NOT NULL
--   - period_end          date        NOT NULL
--   - tracked_clicks      integer     NOT NULL
--   - reported_clicks     integer     NOT NULL
--   - click_delta         integer     NOT NULL  (tracked - reported)
--   - click_delta_pct     numeric     NULLABLE
--   - revenue_cents       bigint      NOT NULL
--   - flagged             boolean     NOT NULL DEFAULT false
--   - computed_at         timestamptz NOT NULL DEFAULT now()
--
-- Divergence from types
--   - Types declare `revenue_cents: number`; live DB is `bigint`. Migration
--     uses `bigint` — trust live DB. (Cents-at-scale rationale.)
--   - Types declare `click_delta_pct: number | null`; live DB is `numeric`
--     (no precision/scale specified). Migration uses `numeric` — trust
--     live DB.
--
-- FK behaviour (verified live)
--   `report_id REFERENCES affiliate_payout_reports(id) ON DELETE CASCADE`.
--   If a report row is deleted (e.g. re-upload), its derived variance
--   rows go with it — sensible because variance is a pure function of the
--   report.
--
-- RLS policy chosen — service-role-only (deny anon + authenticated by default)
--   - service_role: explicit FOR ALL allow.
--   - anon + authenticated: NO policy — RLS denies all access by default.
--
--   Justification: same as `affiliate_payout_reports` — revenue forensics,
--   server-side only, no user-facing read path. Pattern matches
--   `admin_audit_log`.
--
-- Idempotency
--   - The body uses `if not exists` on the table — no-op when it exists.
--   - CREATE INDEX IF NOT EXISTS for the FK and the partial-index lookup.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Risk: low
--   - Forward-only schema add; no data shaping.
--   - FK depends on `affiliate_payout_reports`, which is created in the
--     migration immediately preceding this one (20260603130000_…).
--   - All callers already use service-role; no behavioural change.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.affiliate_payout_variance;
--     DROP INDEX IF EXISTS idx_payout_variance_flagged;
--     DROP INDEX IF EXISTS idx_affiliate_payout_variance_report_id;
--     ALTER TABLE public.affiliate_payout_variance DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.affiliate_payout_variance;  -- destructive; clean rebuild only
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.affiliate_payout_variance (
  id                  bigserial   NOT NULL,
  report_id           bigint,
  broker_slug         text        NOT NULL,
  period_start        date        NOT NULL,
  period_end          date        NOT NULL,
  tracked_clicks      integer     NOT NULL,
  reported_clicks     integer     NOT NULL,
  click_delta         integer     NOT NULL,
  click_delta_pct     numeric,
  revenue_cents       bigint      NOT NULL,
  flagged             boolean     NOT NULL DEFAULT false,
  computed_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_payout_variance_pkey PRIMARY KEY (id),
  CONSTRAINT affiliate_payout_variance_report_id_fkey
    FOREIGN KEY (report_id)
    REFERENCES public.affiliate_payout_reports(id)
    ON DELETE CASCADE
);

-- FK index — speeds variance lookups by report and avoids the missing-FK-index
-- advisory captured in 20260426_add_missing_fk_indexes.sql for sibling tables.
CREATE INDEX IF NOT EXISTS idx_affiliate_payout_variance_report_id
  ON public.affiliate_payout_variance (report_id);

-- Partial index on flagged rows — recon dashboards page through "still
-- needs follow-up" rows in computed_at DESC order.
CREATE INDEX IF NOT EXISTS idx_payout_variance_flagged
  ON public.affiliate_payout_variance (computed_at DESC)
  WHERE flagged = true;

ALTER TABLE public.affiliate_payout_variance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payout_variance FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.affiliate_payout_variance;
CREATE POLICY "service_role full access"
  ON public.affiliate_payout_variance
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- No anon/authenticated policies — revenue ledger; all readers and writers
-- are server-side service-role. Mirrors `affiliate_payout_reports`.

COMMIT;
