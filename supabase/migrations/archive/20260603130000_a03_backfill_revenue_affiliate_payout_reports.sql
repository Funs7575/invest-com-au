-- ============================================================================
-- Migration: Backfill public.affiliate_payout_reports (A-03 batch 1)
-- Date:      2026-05-01 (queued under 20260603 to sort after A-02 batch 1)
-- Audit ref: docs/audits/drift-list.md (A-05 affiliate / finance family,
--            shipped via the A-03 revenue iteration grouping)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03
--
-- Purpose
--   `affiliate_payout_reports` is declared in `lib/database.types.ts`
--   (line 1504) but the migration tree never CREATEs the table. It stores
--   per-broker, per-period payout reports uploaded from affiliate networks
--   (Awin / Impact / etc.) — the "what the network reported" side of the
--   reconciliation against our own click/conversion tracking.
--
--   Used by 1 call site:
--     - app/api/cron/affiliate-payout-recon/route.ts  (read for variance calc)
--
--   Writes happen via the admin client during the cron's reconciliation pass
--   (the route itself only reads here; uploads land via the admin upload
--   route which uses the service-role client).
--
-- Why it matters
--   Revenue forensics — without the report ledger, the variance cron has
--   nothing to compare tracked clicks against, and broker payout disputes
--   lose their authoritative "what the network told us" record. Bringing it
--   into the migration tree means a clean rebuild matches prod.
--
-- Schema source of truth
--   Live DB (verified 2026-05-01 via information_schema.columns) +
--   lib/database.types.ts → Database['public']['Tables']['affiliate_payout_reports'].
--   - id                       bigint      PK   nextval('affiliate_payout_reports_id_seq')
--   - broker_slug              text        NOT NULL
--   - period_start             date        NOT NULL
--   - period_end               date        NOT NULL
--   - reported_clicks          integer     NOT NULL DEFAULT 0
--   - reported_conversions     integer     NOT NULL DEFAULT 0
--   - reported_revenue_cents   bigint      NOT NULL DEFAULT 0
--   - currency                 text        NOT NULL DEFAULT 'AUD'
--   - source                   text        NULLABLE  (e.g. 'awin', 'impact')
--   - raw_payload              jsonb       NULLABLE  (full network response)
--   - uploaded_by              text        NULLABLE  (admin email)
--   - uploaded_at              timestamptz NOT NULL DEFAULT now()
--
--   UNIQUE (broker_slug, period_start, period_end) — one report per
--   broker per reporting window, observed in live DB.
--
-- Divergence from types
--   - Types declare `reported_revenue_cents: number`; live DB is `bigint`
--     (cents at scale fit). Migration uses `bigint` — trust live DB.
--   - Types declare `id: number`; live DB is `bigint` with sequence default.
--     Migration uses `bigserial` (idiomatic for nextval-backed bigint PK).
--   - Types declare `currency: string` with no nullability hint at runtime;
--     live DB has NOT NULL DEFAULT 'AUD'. Migration matches live DB.
--
-- RLS policy chosen — service-role-only (deny anon + authenticated by default)
--   - service_role: explicit FOR ALL allow.
--   - anon + authenticated: NO policy — RLS denies all access by default.
--
--   Justification: revenue ledger. The single app reader is a Vercel cron
--   that runs under the service-role client (`app/api/cron/affiliate-payout-recon`).
--   Uploads happen via admin tooling. There is no user-facing read path —
--   broker payout figures are commercially sensitive (per-network rates,
--   raw payloads can include partner-specific identifiers) and must never
--   leak to anon/authenticated. Pattern matches `lead_pricing_log` and
--   `admin_audit_log`: append-only / admin-only revenue surfaces stay
--   server-side. Revenue tables are exempted from the RLS isolation gate
--   (no user_id column to isolate on).
--
-- Idempotency
--   - The body uses `if not exists` on the table — no-op when it exists.
--   - CREATE UNIQUE INDEX IF NOT EXISTS on the natural key.
--   - CREATE INDEX IF NOT EXISTS on the broker/period DESC lookup pattern.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Risk: low
--   - Forward-only schema add; no data shaping.
--   - All callers already use service-role; no behavioural change.
--   - FK target for `affiliate_payout_variance.report_id` is created here
--     so the next migration in this batch can attach safely.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.affiliate_payout_reports;
--     DROP INDEX IF EXISTS idx_affiliate_payout_reports_slug_period;
--     DROP INDEX IF EXISTS affiliate_payout_reports_broker_period_uniq;
--     ALTER TABLE public.affiliate_payout_reports DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.affiliate_payout_reports;  -- destructive; clean rebuild only
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.affiliate_payout_reports (
  id                       bigserial   NOT NULL,
  broker_slug              text        NOT NULL,
  period_start             date        NOT NULL,
  period_end               date        NOT NULL,
  reported_clicks          integer     NOT NULL DEFAULT 0,
  reported_conversions     integer     NOT NULL DEFAULT 0,
  reported_revenue_cents   bigint      NOT NULL DEFAULT 0,
  currency                 text        NOT NULL DEFAULT 'AUD',
  source                   text,
  raw_payload              jsonb,
  uploaded_by              text,
  uploaded_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_payout_reports_pkey PRIMARY KEY (id)
);

-- Natural key: one upload per broker per reporting window.
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_payout_reports_broker_period_uniq
  ON public.affiliate_payout_reports (broker_slug, period_start, period_end);

-- Lookup pattern: latest report per broker (admin dashboard + recon cron).
CREATE INDEX IF NOT EXISTS idx_affiliate_payout_reports_slug_period
  ON public.affiliate_payout_reports (broker_slug, period_end DESC);

ALTER TABLE public.affiliate_payout_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payout_reports FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.affiliate_payout_reports;
CREATE POLICY "service_role full access"
  ON public.affiliate_payout_reports
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- No anon/authenticated policies — revenue ledger; all readers and writers
-- are server-side service-role (cron + admin upload). Mirrors the
-- admin_audit_log pattern.

COMMIT;
