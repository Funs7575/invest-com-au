-- ============================================================================
-- Migration: Backfill public.lead_pricing (A-02 batch 1)
-- Date:      2026-04-30 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/drift-list.md (A-02 lead family)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `lead_pricing` is declared in `lib/database.types.ts` (line 7328) but the
--   migration tree never CREATEs the table. It is the canonical
--   pricing config for lead allocation: per advisor_type, the current
--   per-lead price (cents), min/max bounds, free trial allowance, and the
--   monthly featured-listing fee. Read by the marketplace allocation logic
--   and the advisor dashboard; written only from the admin pricing page.
--
--   Used by 5 call sites:
--     - app/admin/pricing/page.tsx           (admin: read + UPSERT)
--     - app/api/advisor-enquiry/route.ts     (read price for matched type)
--     - app/api/advisor-dashboard/route.ts   (read advisor's tier price)
--     - app/api/partner/leads/route.ts       (read price for partner postback)
--     - app/admin/notify-price-change route  (writes lead_pricing_log only)
--
-- Why it matters
--   Pricing changes have direct revenue impact; the table is referentially
--   the source of truth used by allocation/billing/advisor portal. Bringing
--   it into the migration tree means a clean rebuild will match prod.
--
-- Schema source of truth
--   lib/database.types.ts → Database['public']['Tables']['lead_pricing'].
--   - id                    serial      PK
--   - advisor_type          text        NOT NULL  (matches advisor_type enum-like)
--   - description           text        NULLABLE
--   - price_cents           integer     NOT NULL
--   - min_price_cents       integer     NOT NULL DEFAULT (Insert allows omit)
--   - max_price_cents       integer     NOT NULL DEFAULT (Insert allows omit)
--   - free_trial_leads      integer     NOT NULL DEFAULT (Insert allows omit)
--   - featured_monthly_cents integer    NOT NULL DEFAULT (Insert allows omit)
--   - updated_at            timestamptz NULLABLE
--   - updated_by            text        NULLABLE  (admin email; NOT FK)
--
--   We add a UNIQUE index on `advisor_type` because the admin upsert pattern
--   in app/admin/pricing/page.tsx implies one row per advisor type.
--
-- RLS policy chosen — read-public-config / write-admin
--   - service_role: explicit FOR ALL allow.
--   - authenticated: SELECT permitted. Pricing is not user-scoped PII; it's
--     reference config that several user-cookie-client routes need to read
--     (advisor-dashboard, partner/leads). Granting authenticated read removes
--     the need to add admin-client wiring just for pricing lookups.
--   - anon: SELECT permitted. Used downstream by the public marketplace
--     allocation route which in places reaches via the user-cookie client
--     even before login — intentionally read-only public config. (Aligns
--     with /api/partner/leads which can be called with an unauthenticated
--     session.)
--   - INSERT/UPDATE/DELETE: NOT granted to anon/authenticated. Writes are
--     admin-only and use service-role. Pattern: matches reference-data RLS
--     elsewhere in the tree (e.g. fee_profiles read-public-write-admin).
--
-- Idempotency
--   - The body uses `if not exists` on the table — no-op when it exists.
--   - CREATE UNIQUE INDEX IF NOT EXISTS.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Risk: low
--   - Forward-only schema add; no data shaping.
--   - Public-read of pricing is the existing behaviour (admin pages and
--     authenticated routes both read it); RLS as written matches today's
--     access. No call sites attempt to mutate from the user-cookie client.
--
-- Flagged ambiguity
--   - The `updated_by` column is `string | null`. Today the admin pricing
--     page populates it with the editor's email. We keep it loose (`text`)
--     to match types; a tightening migration could constrain it once we
--     standardise on auth.users(id) for admin attribution.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.lead_pricing;
--     DROP POLICY IF EXISTS "public read pricing"      ON public.lead_pricing;
--     DROP INDEX IF EXISTS lead_pricing_advisor_type_unique;
--     ALTER TABLE public.lead_pricing DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.lead_pricing;  -- destructive; clean rebuild only
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_pricing (
  id                       bigserial   NOT NULL,
  advisor_type             text        NOT NULL,
  description              text,
  price_cents              integer     NOT NULL,
  min_price_cents          integer     NOT NULL DEFAULT 0,
  max_price_cents          integer     NOT NULL DEFAULT 0,
  free_trial_leads         integer     NOT NULL DEFAULT 0,
  featured_monthly_cents   integer     NOT NULL DEFAULT 0,
  updated_at               timestamptz DEFAULT now(),
  updated_by               text,
  CONSTRAINT lead_pricing_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_pricing_advisor_type_unique
  ON public.lead_pricing (advisor_type);

ALTER TABLE public.lead_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pricing FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.lead_pricing;
CREATE POLICY "service_role full access"
  ON public.lead_pricing
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Public read of pricing config — config table, not PII. Both anon and
-- authenticated callers read this; writes are admin-only via service-role.
DROP POLICY IF EXISTS "public read pricing" ON public.lead_pricing;
CREATE POLICY "public read pricing"
  ON public.lead_pricing
  FOR SELECT TO anon, authenticated
  USING (true);

-- No anon/authenticated INSERT/UPDATE/DELETE: pricing changes route through
-- the admin pricing page using the service-role client.

COMMIT;
