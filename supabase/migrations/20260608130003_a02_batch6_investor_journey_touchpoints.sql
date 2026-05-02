-- =============================================================================
-- Date:          2026-05-01
-- Audit ref:     docs/audits/codebase-health-2026-04-24.md §A "RLS drift"
-- Queue item:    A-02 batch 6 (investor_journey_touchpoints)
-- Why:           investor_journey_touchpoints is internal reference data
--                describing the revenue-model stage/touchpoint taxonomy
--                (fields: stage, touchpoint, revenue_type, estimated_revenue_cents).
--                No authenticated or anon app routes read this table — it is
--                queried only by admin tooling and internal analytics scripts
--                that use the service role. Without RLS, any authenticated
--                user with a valid JWT could SELECT estimated revenue figures
--                that should remain internal.
-- Idempotency:   IF NOT EXISTS guards on ENABLE/FORCE; DROP POLICY IF EXISTS
--                before each CREATE POLICY; safe to re-apply.
-- Rollback:      ALTER TABLE investor_journey_touchpoints DISABLE ROW LEVEL SECURITY;
--                DROP POLICY IF EXISTS "service_role full access" ON investor_journey_touchpoints;
-- Prior policy state: no prior CREATE POLICY or ENABLE ROW LEVEL SECURITY
--                found in any migration for this table.
-- TODO: human review of policy semantics — if a future investor-facing
--       "journey stage" UI needs to read stage/touchpoint labels, add an
--       anon SELECT policy scoped to non-revenue columns only (exclude
--       estimated_revenue_cents). For now, deny-all non-service-role is
--       the correct posture.
-- =============================================================================

BEGIN;

-- Enable RLS
ALTER TABLE investor_journey_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_journey_touchpoints FORCE ROW LEVEL SECURITY;

-- Service-role explicit allow (all callers are admin/internal)
DROP POLICY IF EXISTS "service_role full access" ON investor_journey_touchpoints;
CREATE POLICY "service_role full access"
  ON investor_journey_touchpoints
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
