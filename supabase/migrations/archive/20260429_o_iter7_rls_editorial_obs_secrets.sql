-- ============================================================
-- O-iter7 RLS — editorial / observability / secrets (9 tables)
--
-- Consolidates RLS posture for the highest-risk tables that
-- still had gaps after iter4 (admin/audit) and iter6 (user
-- data). Each block is idempotent (DROP POLICY IF EXISTS +
-- CREATE POLICY, ALTER ENABLE/FORCE which is a no-op when
-- already enabled) so the migration is safe to re-run on the
-- live DB even though prior iterations already touched some
-- of these tables.
--
-- Tables in scope, grouped by category:
--
--   High-risk PII / secrets (highest priority):
--     1. email_otps          — service_role only; deny anon + authenticated
--                               Source: 20260316_email_otps.sql
--                               Prior RLS: 20260601_rls_email_otps.sql
--     2. listing_claims      — anon INSERT (self-service claim submission);
--                               service_role SELECT/UPDATE/DELETE only.
--                               Source: 20260508_listing_claims.sql
--                               Prior RLS: 20260601_rls_listing_claims.sql,
--                                          20260510_rls_hardening.sql (legacy
--                                          permissive policy — explicitly
--                                          dropped below for unambiguous state)
--     3. sponsor_invoices    — service_role only; deny anon + authenticated
--                               (broker billing data — payments-grade).
--                               Source: 004_sponsor_invoices.sql
--                               Prior RLS: 20260321_pre_launch_rls_fixes.sql
--                                          (used `USING (false)` which silently
--                                          denies even service-role through
--                                          PostgREST — replaced below).
--
--   Editorial — public read, admin write:
--     4. newsletter_sponsors — anon SELECT, service_role write.
--                               Source: 20260506_revenue_expansion.sql
--                               Prior RLS: 20260510_rls_hardening.sql
--                                          (service-role only — public read
--                                          policy added below to support the
--                                          public-facing sponsorships rail).
--     5. sector_reports      — anon SELECT (status='published'), service_role write.
--                               Source: 20260506_revenue_expansion.sql
--                               Prior RLS: 20260510_rls_hardening.sql
--                                          (already correct — re-asserted
--                                          here for an unambiguous final state).
--     6. quarterly_reports   — anon SELECT (status='published'), service_role write.
--                               Source: 20260316_q1_2026_report.sql
--                               Prior RLS: NONE (RLS not enabled at all — this
--                                          is a critical fix; the table was
--                                          publicly enumerable via PostgREST).
--
--   Observability — service_role only:
--     7. csp_violations           — security telemetry; service_role only.
--                                    Source: 20260427_csp_violations.sql
--                                    Prior RLS: 20260427_csp_violations.sql
--                                               (used invalid SQL — the line
--                                               `ENABLE ROW LEVEL SECURITY ON
--                                               public.csp_violations;` is not
--                                               a valid Postgres statement and
--                                               would fail at apply. We re-do
--                                               it here using ALTER TABLE.)
--     8. content_freshness_log    — audit log; service_role only.
--                                    Source: 20260509_sponsored_columns_and_freshness_log.sql
--                                    Prior RLS: 20260510_rls_hardening.sql
--     9. _slug_fix_log            — audit log; service_role only.
--                                    Source: 20260507_slug_normalisation.sql
--                                    Prior RLS: 20260510_rls_hardening.sql
--
-- Verification gate (per REMEDIATION_DEFAULTS §"Verification gates"):
--   For each table, prior CREATE POLICY statements were grep'd across
--   supabase/migrations/. Where legacy permissive policies existed
--   (notably listing_claims via 20260510_rls_hardening.sql), they are
--   explicitly DROP IF EXISTS'd by exact name BEFORE our new policies
--   are created — RLS policies stack additively, so an unnamed drop
--   would leave them in place.
--
-- Idempotent: ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY is a
-- no-op if already set; every CREATE POLICY is preceded by a matching
-- DROP POLICY IF EXISTS so reruns succeed.
--
-- Rollback:
--   -- 1. email_otps
--   DROP POLICY IF EXISTS "service_role full access" ON public.email_otps;
--   ALTER TABLE public.email_otps NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.email_otps DISABLE ROW LEVEL SECURITY;
--   -- 2. listing_claims
--   DROP POLICY IF EXISTS "service_role full access" ON public.listing_claims;
--   DROP POLICY IF EXISTS "anon insert claim" ON public.listing_claims;
--   ALTER TABLE public.listing_claims NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.listing_claims DISABLE ROW LEVEL SECURITY;
--   -- 3. sponsor_invoices
--   DROP POLICY IF EXISTS "service_role full access" ON public.sponsor_invoices;
--   ALTER TABLE public.sponsor_invoices NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.sponsor_invoices DISABLE ROW LEVEL SECURITY;
--   -- 4. newsletter_sponsors
--   DROP POLICY IF EXISTS "service_role full access" ON public.newsletter_sponsors;
--   DROP POLICY IF EXISTS "anon read newsletter_sponsors" ON public.newsletter_sponsors;
--   ALTER TABLE public.newsletter_sponsors NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.newsletter_sponsors DISABLE ROW LEVEL SECURITY;
--   -- 5. sector_reports
--   DROP POLICY IF EXISTS "service_role full access" ON public.sector_reports;
--   DROP POLICY IF EXISTS "anon read published sector_reports" ON public.sector_reports;
--   ALTER TABLE public.sector_reports NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.sector_reports DISABLE ROW LEVEL SECURITY;
--   -- 6. quarterly_reports
--   DROP POLICY IF EXISTS "service_role full access" ON public.quarterly_reports;
--   DROP POLICY IF EXISTS "anon read published quarterly_reports" ON public.quarterly_reports;
--   ALTER TABLE public.quarterly_reports NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.quarterly_reports DISABLE ROW LEVEL SECURITY;
--   -- 7. csp_violations
--   DROP POLICY IF EXISTS "service_role full access" ON public.csp_violations;
--   ALTER TABLE public.csp_violations NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.csp_violations DISABLE ROW LEVEL SECURITY;
--   -- 8. content_freshness_log
--   DROP POLICY IF EXISTS "service_role full access" ON public.content_freshness_log;
--   ALTER TABLE public.content_freshness_log NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.content_freshness_log DISABLE ROW LEVEL SECURITY;
--   -- 9. _slug_fix_log
--   DROP POLICY IF EXISTS "service_role full access" ON public._slug_fix_log;
--   ALTER TABLE public._slug_fix_log NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public._slug_fix_log DISABLE ROW LEVEL SECURITY;
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. email_otps — high-risk (verification codes)
--   Both /api/verify-otp/{send,verify} routes use service-role
--   admin client. No user-facing read path.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_otps FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"             ON public.email_otps;
DROP POLICY IF EXISTS "anon read own otp"                    ON public.email_otps;
DROP POLICY IF EXISTS "authenticated read own otp"           ON public.email_otps;

CREATE POLICY "service_role full access" ON public.email_otps
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2. listing_claims — high-risk (PII: full_name, email, phone)
--   anon INSERT permitted for the self-service /api/claim-listing
--   form. SELECT/UPDATE/DELETE are service-role only — no user-
--   facing read path; admin UI uses the service-role client.
--   Also drops the legacy 20260510 policies that granted broader
--   anon INSERT (without the field-presence guard) so the final
--   state is unambiguous.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.listing_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_claims FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"                  ON public.listing_claims;
DROP POLICY IF EXISTS "anon insert claim"                         ON public.listing_claims;
DROP POLICY IF EXISTS "anon read own claim"                       ON public.listing_claims;
DROP POLICY IF EXISTS "authenticated read claims"                 ON public.listing_claims;
DROP POLICY IF EXISTS "Anon can submit claims"                    ON public.listing_claims;
DROP POLICY IF EXISTS "Service role full access listing_claims"   ON public.listing_claims;

-- Service-role explicit allow for SELECT/UPDATE/DELETE/INSERT.
CREATE POLICY "service_role full access" ON public.listing_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon INSERT only — required + non-null fields enforced server-side.
-- No SELECT policy → anon CANNOT read claims back after insert.
CREATE POLICY "anon insert claim" ON public.listing_claims
  FOR INSERT TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND full_name IS NOT NULL);

-- ─────────────────────────────────────────────────────────────
-- 3. sponsor_invoices — high-risk (broker billing / payments)
--   No user-facing path — admin dashboard reads via service role.
--   The prior 20260321 policy used `USING (false)` (and was
--   missing TO service_role), which is a no-op for service-role
--   (which bypasses RLS) but documented intent incorrectly. We
--   replace it with the canonical `service_role / USING (true) /
--   WITH CHECK (true)` shape.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sponsor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_invoices FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"                       ON public.sponsor_invoices;
DROP POLICY IF EXISTS "Service role full access sponsor_invoices"      ON public.sponsor_invoices;

CREATE POLICY "service_role full access" ON public.sponsor_invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 4. newsletter_sponsors — editorial (public read, admin write)
--   The newsletter sponsorships rail surfaces upcoming sponsor
--   placements on /newsletter and the editorial calendar. The
--   prior 20260510 policy was service-role-only; this iteration
--   adds an anon SELECT so the rail can render via the anon key.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.newsletter_sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"                       ON public.newsletter_sponsors;
DROP POLICY IF EXISTS "anon read newsletter_sponsors"                  ON public.newsletter_sponsors;
DROP POLICY IF EXISTS "Service role only newsletter_sponsors"          ON public.newsletter_sponsors;

CREATE POLICY "service_role full access" ON public.newsletter_sponsors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon read newsletter_sponsors" ON public.newsletter_sponsors
  FOR SELECT TO anon, authenticated USING (true);

-- ─────────────────────────────────────────────────────────────
-- 5. sector_reports — editorial (public read of published, admin write)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sector_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"                       ON public.sector_reports;
DROP POLICY IF EXISTS "anon read published sector_reports"             ON public.sector_reports;
DROP POLICY IF EXISTS "Public read published sector_reports"           ON public.sector_reports;
DROP POLICY IF EXISTS "Service role write sector_reports"              ON public.sector_reports;

CREATE POLICY "service_role full access" ON public.sector_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon read published sector_reports" ON public.sector_reports
  FOR SELECT TO anon, authenticated USING (status = 'published');

-- ─────────────────────────────────────────────────────────────
-- 6. quarterly_reports — editorial (public read of published, admin write)
--   Critical fix — RLS was NEVER enabled on this table previously.
--   It has been publicly readable AND writable via the anon key
--   since the table was created on 2026-03-16. The /reports/q1-2026
--   page reads via the cookie client today.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.quarterly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"                       ON public.quarterly_reports;
DROP POLICY IF EXISTS "anon read published quarterly_reports"          ON public.quarterly_reports;

CREATE POLICY "service_role full access" ON public.quarterly_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon read published quarterly_reports" ON public.quarterly_reports
  FOR SELECT TO anon, authenticated USING (status = 'published');

-- ─────────────────────────────────────────────────────────────
-- 7. csp_violations — observability (security telemetry)
--   The original 20260427 migration contained an invalid SQL
--   statement (`ENABLE ROW LEVEL SECURITY ON public.csp_violations;`
--   without `ALTER TABLE`). We re-issue the correct ALTER TABLE
--   form and re-create the canonical policy here. Service-role
--   only — written by /api/csp-report, no user-facing read path.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csp_violations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"                       ON public.csp_violations;
DROP POLICY IF EXISTS "service_role full access on csp_violations"     ON public.csp_violations;

CREATE POLICY "service_role full access" ON public.csp_violations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 8. content_freshness_log — observability (audit log)
--   Service-role only. Written by content-freshness cron;
--   read by admin dashboards via service role.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.content_freshness_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_freshness_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"                       ON public.content_freshness_log;
DROP POLICY IF EXISTS "Service role only content_freshness_log"        ON public.content_freshness_log;

CREATE POLICY "service_role full access" ON public.content_freshness_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 9. _slug_fix_log — observability (audit log)
--   Service-role only. Append-only log of slug-normalisation events.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public._slug_fix_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._slug_fix_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"                       ON public._slug_fix_log;
DROP POLICY IF EXISTS "Service role only _slug_fix_log"                ON public._slug_fix_log;

CREATE POLICY "service_role full access" ON public._slug_fix_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
