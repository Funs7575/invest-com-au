-- Add prepaid credit balance system for advisors
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS credit_balance_cents integer NOT NULL DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS lifetime_credit_cents integer NOT NULL DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS lifetime_lead_spend_cents integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.advisor_credit_topups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  professional_id integer NOT NULL REFERENCES professionals(id),
  amount_cents integer NOT NULL,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advisor_credit_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on advisor_credit_topups" ON public.advisor_credit_topups FOR ALL USING (false);
CREATE INDEX idx_advisor_credit_topups_professional ON public.advisor_credit_topups(professional_id);
