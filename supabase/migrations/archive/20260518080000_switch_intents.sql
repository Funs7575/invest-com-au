-- Migration: switch_intents — captures users who say "yes, route me
-- through the super-fund switch" without filling out the full provider
-- forms themselves. The switching-as-a-service offering (FIN_NOTEBOOK
-- Revenue #2) is partner-BD-blocked on actually completing switches;
-- this table is the inbound queue so we can build the user list now
-- and execute partner integrations as they come online.
--
-- Schema:
--   - product_kind: 'super_fund' to start; future kinds 'savings_account'
--     ($→$ switch), 'broker' (HIN transfer), 'home_loan' (refi) can land
--     against the same intent surface without schema churn.
--   - from_provider / to_provider: free-text identifiers (slugs or
--     names) for what the user is switching from + to. Both nullable
--     because intent-only captures often don't know "to" yet.
--   - email + (optional) phone: contact + verification target.
--   - estimated_balance_cents: nullable; informs prioritisation when a
--     partner has a min-balance gate.
--   - reason: 'fees' | 'performance' | 'features' | 'consolidation' | 'other'
--   - status: 'captured' (just submitted) | 'verified' (email confirmed)
--     | 'routed_to_partner' | 'completed' | 'abandoned'.
--   - verify_token + unsubscribe_token: standard double-opt-in.
--
-- RLS: service-role-write + anon-INSERT for the capture form, no
-- anon SELECT so the queue stays private.

BEGIN;

CREATE TABLE IF NOT EXISTS public.switch_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_kind text NOT NULL,
  from_provider text,
  to_provider text,
  email text NOT NULL,
  phone text,
  estimated_balance_cents bigint,
  reason text NOT NULL DEFAULT 'fees',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'captured',
  verify_token text NOT NULL,
  unsubscribe_token text NOT NULL,
  verified_at timestamptz,
  partner_routed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT switch_intents_product_kind_check CHECK (
    product_kind IN ('super_fund', 'savings_account', 'broker', 'home_loan')
  ),
  CONSTRAINT switch_intents_reason_check CHECK (
    reason IN ('fees', 'performance', 'features', 'consolidation', 'other')
  ),
  CONSTRAINT switch_intents_status_check CHECK (
    status IN ('captured', 'verified', 'routed_to_partner', 'completed', 'abandoned')
  )
);

CREATE INDEX IF NOT EXISTS idx_switch_intents_status
  ON public.switch_intents (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_switch_intents_email
  ON public.switch_intents (lower(email));

CREATE INDEX IF NOT EXISTS idx_switch_intents_verify_token
  ON public.switch_intents (verify_token);

CREATE INDEX IF NOT EXISTS idx_switch_intents_unsubscribe_token
  ON public.switch_intents (unsubscribe_token);

ALTER TABLE public.switch_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages switch_intents" ON public.switch_intents;
CREATE POLICY "Service role manages switch_intents"
  ON public.switch_intents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can submit switch_intents" ON public.switch_intents;
CREATE POLICY "Anon can submit switch_intents"
  ON public.switch_intents FOR INSERT TO anon
  WITH CHECK (
    status = 'captured'
    AND verified_at IS NULL
    AND partner_routed_at IS NULL
    AND completed_at IS NULL
  );

COMMIT;
