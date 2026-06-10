-- Migration: 20260728_w423_firm_billing_summary.sql
-- Purpose: Add the firm_credit_balance_summary view so firm admins can see
--          their firm's aggregate Match Request credit position in one place
--          (PR-X3 / W4.23 — firm billing dashboard at /firm-portal/billing).
--          The view aggregates per-advisor credit/spend across all active
--          members of a firm; a sibling unique index on advisor_firms(id)
--          already exists so the view is cheap to query.
-- Tier:    C — read-only view but admin-facing payment surface.
-- Risk:    low — view-only over existing columns; no schema change to
--          professionals or advisor_firms. RLS is enforced by the
--          underlying tables (we only read via service_role from
--          server-side handlers gated on is_firm_admin).
-- Rollback:
--   DROP VIEW IF EXISTS public.firm_credit_balance_summary;
--
-- Forward steps:
--   1. CREATE OR REPLACE VIEW public.firm_credit_balance_summary
--      with one row per firm, summing credit_balance_cents,
--      lifetime_credit_cents, lifetime_lead_spend_cents over
--      active professionals.
--   2. GRANT SELECT to authenticated + service_role (read happens
--      from service-role server handlers).
--   3. View is non-materialised — the per-firm member count is small
--      (single digits), so freshness > prebuild cost.

CREATE OR REPLACE VIEW public.firm_credit_balance_summary AS
SELECT
  f.id                                                            AS firm_id,
  f.slug                                                          AS firm_slug,
  f.name                                                          AS firm_name,
  COUNT(p.id) FILTER (WHERE p.status = 'active')                  AS active_member_count,
  COUNT(p.id) FILTER (WHERE p.status = 'pending')                 AS pending_member_count,
  COALESCE(SUM(p.credit_balance_cents)
           FILTER (WHERE p.status = 'active'), 0)::bigint         AS total_credit_balance_cents,
  COALESCE(SUM(p.lifetime_credit_cents)
           FILTER (WHERE p.status = 'active'), 0)::bigint         AS total_lifetime_credit_cents,
  COALESCE(SUM(p.lifetime_lead_spend_cents)
           FILTER (WHERE p.status = 'active'), 0)::bigint         AS total_lifetime_spend_cents,
  COUNT(p.id) FILTER (WHERE p.status = 'active'
                        AND COALESCE(p.credit_balance_cents, 0) < 5000)
                                                                  AS low_balance_member_count,
  MAX(p.last_login_at)                                            AS most_recent_member_login_at
FROM public.advisor_firms f
LEFT JOIN public.professionals p
  ON p.firm_id = f.id
WHERE f.status = 'active'
GROUP BY f.id, f.slug, f.name;

COMMENT ON VIEW public.firm_credit_balance_summary IS
  'Per-firm aggregate of advisor Match-Request credit balances. Powers /firm-portal/billing (W4.23). Read via service-role from server handlers gated on is_firm_admin.';

GRANT SELECT ON public.firm_credit_balance_summary TO authenticated;
GRANT SELECT ON public.firm_credit_balance_summary TO service_role;
