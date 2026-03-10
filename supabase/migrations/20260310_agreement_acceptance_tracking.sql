-- Track acceptance of legal agreements
CREATE TABLE IF NOT EXISTS public.agreement_acceptances (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_type text NOT NULL CHECK (user_type IN ('visitor', 'advisor', 'broker', 'admin')),
  agreement_type text NOT NULL CHECK (agreement_type IN ('terms_of_use', 'privacy_policy', 'advisor_services', 'broker_advertising', 'content_license', 'cookie_consent')),
  agreement_version text NOT NULL DEFAULT '1.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  professional_id integer REFERENCES professionals(id),
  broker_id integer REFERENCES brokers(id),
  email text,
  accepted_by_name text,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on agreement_acceptances" ON public.agreement_acceptances FOR ALL USING (false);

CREATE INDEX idx_agreement_acceptances_professional ON public.agreement_acceptances(professional_id) WHERE professional_id IS NOT NULL;
CREATE INDEX idx_agreement_acceptances_broker ON public.agreement_acceptances(broker_id) WHERE broker_id IS NOT NULL;
CREATE INDEX idx_agreement_acceptances_type ON public.agreement_acceptances(agreement_type);

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS content_license_accepted_at timestamptz;

ALTER TABLE brokers ADD COLUMN IF NOT EXISTS advertising_terms_accepted_at timestamptz;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS advertising_terms_version text;
