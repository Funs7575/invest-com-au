-- ============================================================================
-- Migration: 20260525_manual_balances.sql
-- Purpose: Manual savings/super/property/other balances for the net-worth
--          page. The net-worth page currently uses investor_goals.current_
--          balance_cents as a stand-in (see page comment). This table is
--          the purpose-built replacement: labelled buckets with explicit
--          categories, owner CRUD, stored in cents to avoid floating-point
--          issues.
--
-- Risk: low — additive table; no existing data touched.
-- Rollback:
--   BEGIN;
--     DROP TRIGGER  IF EXISTS manual_balances_updated_at ON public.manual_balances;
--     DROP POLICY   IF EXISTS "manual_balances owner select"  ON public.manual_balances;
--     DROP POLICY   IF EXISTS "manual_balances owner insert"  ON public.manual_balances;
--     DROP POLICY   IF EXISTS "manual_balances owner update"  ON public.manual_balances;
--     DROP POLICY   IF EXISTS "manual_balances owner delete"  ON public.manual_balances;
--     DROP POLICY   IF EXISTS "manual_balances service_role"  ON public.manual_balances;
--     DROP INDEX    IF EXISTS idx_manual_balances_user_id;
--     DROP TABLE    IF EXISTS public.manual_balances CASCADE;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.manual_balances (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label         text        NOT NULL CHECK (length(trim(label)) > 0),
  amount_cents  bigint      NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  category      text        NOT NULL CHECK (category IN ('savings','super','property','other')),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_balances_user_id
  ON public.manual_balances (user_id);

ALTER TABLE public.manual_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_balances FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_balances owner select" ON public.manual_balances;
CREATE POLICY "manual_balances owner select"
  ON public.manual_balances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "manual_balances owner insert" ON public.manual_balances;
CREATE POLICY "manual_balances owner insert"
  ON public.manual_balances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "manual_balances owner update" ON public.manual_balances;
CREATE POLICY "manual_balances owner update"
  ON public.manual_balances FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "manual_balances owner delete" ON public.manual_balances;
CREATE POLICY "manual_balances owner delete"
  ON public.manual_balances FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "manual_balances service_role" ON public.manual_balances;
CREATE POLICY "manual_balances service_role"
  ON public.manual_balances FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Reuse shared updated_at trigger function (created by 20260305_create_advisor_directory.sql).
DROP TRIGGER IF EXISTS manual_balances_updated_at ON public.manual_balances;
CREATE TRIGGER manual_balances_updated_at
  BEFORE UPDATE ON public.manual_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
