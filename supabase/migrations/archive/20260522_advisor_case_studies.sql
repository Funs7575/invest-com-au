BEGIN;
CREATE TABLE IF NOT EXISTS public.advisor_case_studies (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
  situation       TEXT NOT NULL CHECK (char_length(situation) BETWEEN 20 AND 1000),
  approach        TEXT NOT NULL CHECK (char_length(approach) BETWEEN 20 AND 1000),
  outcome         TEXT NOT NULL CHECK (char_length(outcome) BETWEEN 20 AND 500),
  client_type     TEXT NOT NULL DEFAULT 'individual'
    CHECK (client_type IN ('individual', 'couple', 'family', 'business', 'smsf', 'retiree')),
  outcome_type    TEXT NOT NULL DEFAULT 'wealth_growth'
    CHECK (outcome_type IN ('wealth_growth', 'tax_saving', 'debt_reduction', 'retirement_planning', 'insurance', 'estate_planning', 'business_succession', 'other')),
  status          TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisor_case_studies_professional
  ON public.advisor_case_studies (professional_id, created_at DESC);
ALTER TABLE public.advisor_case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_case_studies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_studies_public_read" ON public.advisor_case_studies;
CREATE POLICY "case_studies_public_read" ON public.advisor_case_studies FOR SELECT
  USING (status = 'published');
DROP POLICY IF EXISTS "case_studies_owner_write" ON public.advisor_case_studies;
CREATE POLICY "case_studies_owner_write" ON public.advisor_case_studies FOR ALL TO authenticated
  USING (professional_id IN (SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()))
  WITH CHECK (professional_id IN (SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "case_studies_service_role" ON public.advisor_case_studies;
CREATE POLICY "case_studies_service_role" ON public.advisor_case_studies TO service_role
  USING (true) WITH CHECK (true);
COMMIT;
