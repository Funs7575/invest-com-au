-- ============================================================================
-- Migration: 20260517_w2_17_premium_content_column_grants.sql
-- Purpose: Enforce the W2.17 premium-content paywall at the data-policy layer.
--          The pre-existing RLS on `quarterly_reports` (anon SELECT where
--          status='published') and `newsletter_editions` (anon SELECT where
--          status='sent') let anon/authenticated callers read the premium
--          columns directly via Supabase REST with the public anon key — so
--          the W2.17 server-side strip in app/reports/[slug]/page.tsx and
--          app/newsletter/[edition]/page.tsx could be trivially bypassed.
--
--          Fix: revoke broad table-level SELECT from anon/authenticated and
--          re-grant SELECT only on non-premium columns. The premium columns
--          (`sections`, `fee_changes_summary`, `new_entrants` on
--          quarterly_reports; `html_content` on newsletter_editions) become
--          readable only via the service-role client, which is brokered by
--          the new `lib/server/premium-content.ts` helper that gates by
--          `isPro`.
--
--          Service-role retains full access via its existing implicit role
--          grant — this migration does not touch service_role's privileges.
--
-- Idempotency:
--   - REVOKE / GRANT are naturally idempotent (Postgres tracks privileges
--     per-column, re-running matches the post-state).
--   - No RLS policy changes here; existing row-level policies (status =
--     'published' / 'sent') continue to apply on the non-premium columns.
--
-- Rollback:
--   BEGIN;
--     GRANT SELECT ON public.quarterly_reports TO anon, authenticated;
--     GRANT SELECT ON public.newsletter_editions TO anon, authenticated;
--   COMMIT;
--
-- Risk: medium.
--   - Any code path that ran `SELECT *` against these tables with the anon
--     key will now error with "permission denied for column …" until it
--     swaps to an explicit non-premium column list (or routes via the new
--     server-only helper for premium content). Audited in-tree callers:
--       * app/reports/page.tsx          — switched to explicit list
--       * app/reports/[slug]/page.tsx   — switched to admin-client via
--                                         lib/server/premium-content.ts
--       * app/newsletter/page.tsx       — already uses explicit list
--       * app/newsletter/[edition]/page.tsx — switched to admin-client
--       * app/sitemap.ts                — already uses explicit list
--       * /api/admin/* + /admin/*       — service-role, unaffected
--       * app/api/cron/weekly-newsletter — service-role, unaffected
--   - External or future callers using `select("*")` from the anon key will
--     break. That is the intended security gain.
-- ============================================================================

BEGIN;

-- ─── newsletter_editions.status (idempotent) ──────────────────────────
-- A `status` column was implied by the RLS policy in
-- 20260427_wave_security_observability.sql (USING `status = 'sent'`)
-- and the schema seeded by 20260426_wave_launch_readiness.sql, but
-- live drift shows the column is missing from the running schema
-- (verified via `npx supabase gen types typescript` regen). Add it
-- here with `DEFAULT 'sent'` so:
--   - Existing rows backfill to 'sent' on column add and remain
--     visible through the new gated newsletter helper's filter.
--   - The weekly cron's upsert can rely on the default if the
--     explicit `status: 'sent'` write below is ever omitted.
ALTER TABLE public.newsletter_editions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent';

-- ─── newsletter_editions: drop legacy USING(true) policies ────────────
-- 20260408_tier2_traffic_features.sql created two permissive policies
-- (`Public read newsletter editions` and `Service write newsletter
-- editions`) with `USING (true)`. The 20260427 migration then layered
-- a stricter `newsletter_editions_public_read` (USING `status = 'sent'`)
-- on top, but Postgres ORs permissive policies, so the older
-- `USING (true)` still let anon read draft / scheduled rows. Drop them
-- here so the `status = 'sent'` policy is the canonical row filter.
DROP POLICY IF EXISTS "Public read newsletter editions" ON public.newsletter_editions;
DROP POLICY IF EXISTS "Service write newsletter editions" ON public.newsletter_editions;

-- Recreate the service-role write policy with an explicit role scope so
-- it does not act as a permissive `USING (true)` for anon/authenticated.
DROP POLICY IF EXISTS "service_role full access" ON public.newsletter_editions;
CREATE POLICY "service_role full access"
  ON public.newsletter_editions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── quarterly_reports ────────────────────────────────────────────────
REVOKE SELECT ON public.quarterly_reports FROM anon;
REVOKE SELECT ON public.quarterly_reports FROM authenticated;

GRANT SELECT (
  id,
  title,
  slug,
  quarter,
  year,
  cover_image_url,
  executive_summary,
  key_findings,
  status,
  published_at,
  created_at,
  updated_at
) ON public.quarterly_reports TO anon, authenticated;

-- ─── newsletter_editions ──────────────────────────────────────────────
REVOKE SELECT ON public.newsletter_editions FROM anon;
REVOKE SELECT ON public.newsletter_editions FROM authenticated;

GRANT SELECT (
  id,
  edition_date,
  subject,
  fee_changes_count,
  articles_count,
  deals_count,
  created_at,
  status
) ON public.newsletter_editions TO anon, authenticated;

COMMIT;
