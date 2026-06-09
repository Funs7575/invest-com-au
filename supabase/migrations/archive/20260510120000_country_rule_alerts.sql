-- ============================================================================
-- Migration: 20260510120000_country_rule_alerts.sql
-- Purpose: Move the hardcoded ALERTS_BY_COUNTRY map from
--          components/CountryRuleAlerts.tsx into a `country_rule_alerts`
--          table so editorial can publish new regulatory alerts per
--          intent-country without a deploy. Public consumers read via the
--          anon JWT under RLS (active = true); admins write via service
--          role through /admin/country-rule-alerts.
-- Audit ref: docs/plans/pre-launch-wave-master-prompt.md W4.21
-- Risk: low — additive; no foreign keys; the in-code map and the
--       DB-backed reader can co-exist for one deploy because we replace
--       the consumer in the same PR.
-- Rollback: DROP TABLE IF EXISTS public.country_rule_alerts;
--           (DESTRUCTIVE — discards admin-edited rows. Re-run the seed
--           block of this migration to repopulate the launch-day rows.)
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS public.country_rule_alerts (...).
--   2. CREATE INDEX idx_country_rule_alerts_lookup.
--   3. ALTER TABLE ... ENABLE + FORCE ROW LEVEL SECURITY.
--   4. CREATE POLICY public anon SELECT (active = true).
--   5. CREATE POLICY service_role ALL.
--   6. INSERT seed rows mirroring the current in-code ALERTS_BY_COUNTRY.
--
-- country_code is stored as the lowercase 2-letter `IntentCountryCode`
-- value (uk/us/cn/in/jp/sg/hk/kr/my/nz/ae/sa) — matches the cookie value
-- read by the client component, so no case mapping at read time.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.country_rule_alerts (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_key     text   NOT NULL UNIQUE,                     -- stable key for sessionStorage dismissal
  country_code  text   NOT NULL CHECK (country_code IN (
                  'uk','us','cn','in','jp','sg','hk','kr','my','nz','ae','sa'
                )),
  severity      text   NOT NULL CHECK (severity IN ('info','warning','urgent')),
  headline      text   NOT NULL,
  body          text   NOT NULL,
  source        text   NOT NULL,
  cta_href      text,
  cta_label     text,
  stales_at     date   NOT NULL,                            -- V-NEW-01 dated-stats gate reads this
  display_order integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_country_rule_alerts_lookup
  ON public.country_rule_alerts (country_code, active, display_order);

ALTER TABLE public.country_rule_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_rule_alerts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active country rule alerts" ON public.country_rule_alerts;
CREATE POLICY "Public can read active country rule alerts"
  ON public.country_rule_alerts FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Service role full access to country rule alerts" ON public.country_rule_alerts;
CREATE POLICY "Service role full access to country rule alerts"
  ON public.country_rule_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────
-- Seed: 7 launch-day rows. Mirrors the ALERTS_BY_COUNTRY map being
-- removed from components/CountryRuleAlerts.tsx in this same PR.
-- alert_key is stable across deploys so existing sessionStorage dismissals
-- carry over for visitors who already acknowledged an alert.
-- Idempotent: ON CONFLICT (alert_key) DO NOTHING.
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO public.country_rule_alerts
  (alert_key, country_code, severity, headline, body, source,
   cta_href, cta_label, stales_at, display_order)
VALUES
  ('uk-firb-established-ban-2025', 'uk', 'warning',
   'AU established-dwelling ban active until 31 March 2027',
   'Foreign buyers (including UK residents) cannot purchase established AU residential dwellings between 1 April 2025 and 31 March 2027. New builds + off-the-plan remain available with FIRB approval.',
   'Treasury / FIRB',
   '/foreign-investment/united-kingdom', 'UK investor guide',
   '2027-03-31', 10),

  ('us-fatca-threshold-2026', 'us', 'info',
   'FATCA reporting thresholds: $50k year-end / $75k anytime',
   'US persons (including dual citizens in AU) must file Form 8938 if specified foreign financial assets exceed these thresholds at year-end or any time during the year. AU super may be reportable depending on structure.',
   'IRS',
   '/foreign-investment/united-states', 'US investor guide',
   '2027-04-15', 10),

  ('in-dasp-claim-window', 'in', 'info',
   'DASP super refund: claim within 6 months of permanent departure',
   'Indian residents who worked in AU and have departed permanently can claim DASP. Tax withheld at 35% (taxed component) / 45-65% (untaxed component). Late claims forfeit to ATO unclaimed-super pool.',
   'ATO',
   '/foreign-investment/india', 'India investor guide',
   '2027-04-15', 10),

  ('ae-no-dta-30pct', 'ae', 'warning',
   'No UAE-AU DTA — 30% withholding on unfranked dividends',
   'There is no AU-UAE double-tax agreement, so unfranked AU dividends + royalties paid to UAE residents are taxed at the full 30% withholding rate. Fully-franked AU dividends remain at 0% withholding regardless.',
   'ATO',
   '/foreign-investment/united-arab-emirates', 'UAE investor guide',
   '2027-04-15', 10),

  ('sa-no-dta-30pct', 'sa', 'warning',
   'No Saudi-AU DTA — 30% withholding on unfranked dividends',
   'There is no AU-Saudi DTA. Unfranked AU dividends + royalties paid to Saudi residents are taxed at the full 30% withholding rate. Halal-compliant equity investing focuses on franked dividends (0% withholding) + property.',
   'ATO',
   '/foreign-investment/saudi-arabia', 'Saudi investor guide',
   '2027-04-15', 10),

  ('hk-au-tiea-active', 'hk', 'info',
   'AU-HK tax-info exchange agreement is in force',
   'AU broker accounts opened by HK residents may be reported to AU under the TIEA. AU residents with HK accounts are reciprocally reportable. Cross-border tax planning should account for this transparency layer.',
   'ATO',
   '/foreign-investment/hong-kong', 'HK investor guide',
   '2027-04-15', 10),

  ('cn-fx-cap-50k', 'cn', 'info',
   'Mainland China FX cap: USD 50,000/yr personal foreign exchange',
   'China''s State Administration of Foreign Exchange limits personal foreign-currency conversion to USD 50,000 per year. Plan large AU investments around this cap (or use compliant business / migration vehicles).',
   'SAFE',
   '/foreign-investment/china', 'China investor guide',
   '2027-04-15', 10)
ON CONFLICT (alert_key) DO NOTHING;

COMMIT;
