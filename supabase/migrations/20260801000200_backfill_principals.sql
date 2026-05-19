-- ============================================================================
-- Migration: 20260801000200_backfill_principals.sql
-- Purpose: Populate the `principals` registry from existing entity-table
--          rows. For each row in (professionals, broker_accounts,
--          investor_profiles, business_accounts, listing_owner_accounts)
--          where auth_user_id IS NOT NULL, insert one principal
--          (kind='human') and back-populate principal_id on the source row.
--
--          Multi-kind users (e.g. a sole-trader financial planner who is
--          advisor + investor + business_owner) get ONE principal — the
--          NOT EXISTS guard prevents double-insertion across kinds, and
--          the second-pass UPDATE links additional kind rows to the
--          already-created principal.
--
-- Idempotency: every block is INSERT...WHERE NOT EXISTS + UPDATE...WHERE
-- principal_id IS NULL. Re-running this migration is a no-op once steady
-- state is reached.
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 0 — Session 0.1.
-- Risk: medium — INSERT volume scales with current row count across 5
--                tables. Tested in staging first. Idempotent, so safe to
--                re-run.
-- Rollback:
--   BEGIN;
--     UPDATE public.professionals SET principal_id = NULL;
--     UPDATE public.broker_accounts SET principal_id = NULL;
--     UPDATE public.investor_profiles SET principal_id = NULL;
--     UPDATE public.business_accounts SET principal_id = NULL;
--     UPDATE public.listing_owner_accounts SET principal_id = NULL;
--     DELETE FROM public.principals WHERE kind = 'human';
--   COMMIT;
-- ============================================================================

BEGIN;

-- ─── professionals ─────────────────────────────────────────────────────────
WITH new_principals AS (
  INSERT INTO public.principals (kind, auth_user_id, display_name, status)
  SELECT
    'human',
    p.auth_user_id,
    COALESCE(NULLIF(p.firm_name, ''), p.name, 'Advisor account'),
    CASE WHEN p.status = 'active' THEN 'active' ELSE 'pending' END
  FROM public.professionals p
  WHERE p.auth_user_id IS NOT NULL
    AND p.principal_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.principals pr WHERE pr.auth_user_id = p.auth_user_id
    )
  RETURNING id, auth_user_id
)
UPDATE public.professionals p
SET principal_id = np.id
FROM new_principals np
WHERE p.auth_user_id = np.auth_user_id
  AND p.principal_id IS NULL;

-- Second pass: link rows where the principal already existed (because
-- another kind table populated it first).
UPDATE public.professionals p
SET principal_id = pr.id
FROM public.principals pr
WHERE p.auth_user_id = pr.auth_user_id
  AND p.principal_id IS NULL
  AND p.auth_user_id IS NOT NULL;

-- ─── broker_accounts ───────────────────────────────────────────────────────
WITH new_principals AS (
  INSERT INTO public.principals (kind, auth_user_id, display_name, status)
  SELECT
    'human',
    b.auth_user_id,
    COALESCE(NULLIF(b.company_name, ''), b.full_name, b.broker_slug, 'Broker account'),
    CASE WHEN b.status = 'active' THEN 'active' ELSE 'pending' END
  FROM public.broker_accounts b
  WHERE b.auth_user_id IS NOT NULL
    AND b.principal_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.principals pr WHERE pr.auth_user_id = b.auth_user_id
    )
  RETURNING id, auth_user_id
)
UPDATE public.broker_accounts b
SET principal_id = np.id
FROM new_principals np
WHERE b.auth_user_id = np.auth_user_id
  AND b.principal_id IS NULL;

UPDATE public.broker_accounts b
SET principal_id = pr.id
FROM public.principals pr
WHERE b.auth_user_id = pr.auth_user_id
  AND b.principal_id IS NULL
  AND b.auth_user_id IS NOT NULL;

-- ─── investor_profiles ─────────────────────────────────────────────────────
WITH new_principals AS (
  INSERT INTO public.principals (kind, auth_user_id, display_name, status)
  SELECT
    'human',
    i.auth_user_id,
    COALESCE(NULLIF(i.display_name, ''), 'Investor account'),
    'active'
  FROM public.investor_profiles i
  WHERE i.auth_user_id IS NOT NULL
    AND i.principal_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.principals pr WHERE pr.auth_user_id = i.auth_user_id
    )
  RETURNING id, auth_user_id
)
UPDATE public.investor_profiles i
SET principal_id = np.id
FROM new_principals np
WHERE i.auth_user_id = np.auth_user_id
  AND i.principal_id IS NULL;

UPDATE public.investor_profiles i
SET principal_id = pr.id
FROM public.principals pr
WHERE i.auth_user_id = pr.auth_user_id
  AND i.principal_id IS NULL
  AND i.auth_user_id IS NOT NULL;

-- ─── business_accounts ─────────────────────────────────────────────────────
WITH new_principals AS (
  INSERT INTO public.principals (kind, auth_user_id, display_name, status)
  SELECT
    'human',
    b.auth_user_id,
    COALESCE(NULLIF(b.legal_name, ''), b.business_name),
    CASE WHEN b.status = 'active' THEN 'active' ELSE 'pending' END
  FROM public.business_accounts b
  WHERE b.auth_user_id IS NOT NULL
    AND b.principal_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.principals pr WHERE pr.auth_user_id = b.auth_user_id
    )
  RETURNING id, auth_user_id
)
UPDATE public.business_accounts b
SET principal_id = np.id
FROM new_principals np
WHERE b.auth_user_id = np.auth_user_id
  AND b.principal_id IS NULL;

UPDATE public.business_accounts b
SET principal_id = pr.id
FROM public.principals pr
WHERE b.auth_user_id = pr.auth_user_id
  AND b.principal_id IS NULL
  AND b.auth_user_id IS NOT NULL;

-- ─── listing_owner_accounts ────────────────────────────────────────────────
WITH new_principals AS (
  INSERT INTO public.principals (kind, auth_user_id, display_name, status)
  SELECT
    'human',
    l.auth_user_id,
    COALESCE(NULLIF(l.display_name, ''), 'Listing owner account'),
    CASE WHEN l.status = 'active' THEN 'active' ELSE 'pending' END
  FROM public.listing_owner_accounts l
  WHERE l.auth_user_id IS NOT NULL
    AND l.principal_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.principals pr WHERE pr.auth_user_id = l.auth_user_id
    )
  RETURNING id, auth_user_id
)
UPDATE public.listing_owner_accounts l
SET principal_id = np.id
FROM new_principals np
WHERE l.auth_user_id = np.auth_user_id
  AND l.principal_id IS NULL;

UPDATE public.listing_owner_accounts l
SET principal_id = pr.id
FROM public.principals pr
WHERE l.auth_user_id = pr.auth_user_id
  AND l.principal_id IS NULL
  AND l.auth_user_id IS NOT NULL;

COMMIT;
