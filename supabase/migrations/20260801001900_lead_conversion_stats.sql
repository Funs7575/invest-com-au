-- ============================================================================
-- Migration: 20260801001900_lead_conversion_stats.sql
-- Purpose: Idea #2 — lead-source conversion analytics. claimByEmail (Phase
--          2.5) stamps quiz_leads.converted_at when a pre-signup lead is
--          linked to a real account. This view aggregates conversion by
--          source/vertical so we can see which lead sources actually turn
--          into accounts — the evidence base for CPL pricing (FIN_NOTEBOOK
--          #3) and the demand signals (#3).
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 3, #2)
-- Risk: low — view only.
-- Rollback: BEGIN; DROP VIEW IF EXISTS public.lead_conversion_stats; COMMIT;
-- ============================================================================

BEGIN;

CREATE OR REPLACE VIEW public.lead_conversion_stats AS
SELECT
  COALESCE(NULLIF(utm_source, ''), 'direct')        AS source,
  COALESCE(NULLIF(inferred_vertical, ''), 'unknown') AS vertical,
  COUNT(*)::bigint                                   AS total_leads,
  COUNT(converted_at)::bigint                        AS converted_leads,
  ROUND(
    CASE WHEN COUNT(*) = 0 THEN 0
         ELSE COUNT(converted_at)::numeric / COUNT(*)::numeric
    END, 4
  )                                                  AS conversion_rate
FROM public.quiz_leads
GROUP BY COALESCE(NULLIF(utm_source, ''), 'direct'),
         COALESCE(NULLIF(inferred_vertical, ''), 'unknown')
ORDER BY total_leads DESC;

REVOKE ALL ON public.lead_conversion_stats FROM anon, authenticated, service_role;
GRANT SELECT ON public.lead_conversion_stats TO service_role, authenticated;

COMMIT;
