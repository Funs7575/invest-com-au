-- ============================================================================
-- Migration: Backfill public.lead_pricing_log (A-02 batch 1)
-- Date:      2026-04-30 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/drift-list.md (A-02 lead family)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `lead_pricing_log` is declared in `lib/database.types.ts` (line 7367)
--   but the migration tree never CREATEs the table. It is the
--   append-only audit log of changes to the lead_pricing table — one row
--   per (advisor_type, field_changed) edit, with old_value/new_value and
--   the changed_by attribution.
--
--   Used by 4 call sites:
--     - app/admin/pricing/page.tsx              (read recent + insert on edit)
--     - app/api/admin/notify-price-change/route (insert on price change)
--
-- Why it matters
--   Companion to lead_pricing — without this log, pricing-change auditability
--   (compliance + revenue forensics) is lost. Bringing the schema into the
--   tree means a clean rebuild will produce the same audit surface.
--
-- Schema source of truth
--   lib/database.types.ts → Database['public']['Tables']['lead_pricing_log'].
--   - id              serial      PK
--   - advisor_type    text        NOT NULL
--   - field_changed   text        NOT NULL  (e.g. 'price_cents', 'min_price_cents')
--   - old_value       text        NULLABLE  (stored as text; coerced from numerics
--                                            in the admin route handler)
--   - new_value       text        NULLABLE
--   - changed_at      timestamptz NULLABLE  (default now() at insert)
--   - changed_by      text        NULLABLE  (admin email)
--   No FK relationships declared; the log is referentially independent so
--   that purges of the underlying lead_pricing rows do not lose audit history.
--
-- RLS policy chosen — service-role-only (deny anon + authenticated by default)
--   - service_role: explicit FOR ALL allow.
--   - anon + authenticated: NO policy — RLS denies all access by default.
--
--   Justification: every reader and writer goes through the admin client
--   (admin/pricing/page.tsx is server-side admin-gated; notify-price-change
--   is admin-internal). No user-facing UI reads this log. Pattern matches
--   admin_audit_log: append-only audit trails default to service-role-only
--   and are exempted from the RLS isolation gate
--   (scripts/check-rls-isolation.mjs ISOLATION_EXEMPT).
--
-- Idempotency
--   - The body uses `if not exists` on the table — no-op when it exists.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Risk: low
--   - Forward-only schema add; no data shaping.
--   - Append-only — no UPDATE/DELETE paths to break.
--   - All callers use admin client; deny-anon does not change behaviour.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.lead_pricing_log;
--     ALTER TABLE public.lead_pricing_log DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.lead_pricing_log;  -- destructive; clean rebuild only
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_pricing_log (
  id              bigserial   NOT NULL,
  advisor_type    text        NOT NULL,
  field_changed   text        NOT NULL,
  old_value       text,
  new_value       text,
  changed_at      timestamptz DEFAULT now(),
  changed_by      text,
  CONSTRAINT lead_pricing_log_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS lead_pricing_log_changed_at_idx
  ON public.lead_pricing_log (changed_at DESC);

ALTER TABLE public.lead_pricing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pricing_log FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.lead_pricing_log;
CREATE POLICY "service_role full access"
  ON public.lead_pricing_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- No anon/authenticated policies — append-only admin audit log; all readers
-- and writers are server-side admin-client. Mirrors the admin_audit_log
-- pattern (already on the RLS isolation gate's ISOLATION_EXEMPT list).

COMMIT;
