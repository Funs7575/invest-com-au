BEGIN;
CREATE TABLE IF NOT EXISTS public.advisor_endorsements (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill           TEXT NOT NULL CHECK (char_length(skill) BETWEEN 2 AND 50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professional_id, user_id, skill)
);
CREATE INDEX IF NOT EXISTS idx_advisor_endorsements_professional ON public.advisor_endorsements (professional_id);
CREATE INDEX IF NOT EXISTS idx_advisor_endorsements_user ON public.advisor_endorsements (user_id);
ALTER TABLE public.advisor_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_endorsements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "endorsements_public_read" ON public.advisor_endorsements;
CREATE POLICY "endorsements_public_read" ON public.advisor_endorsements FOR SELECT USING (true);
DROP POLICY IF EXISTS "endorsements_user_write" ON public.advisor_endorsements;
CREATE POLICY "endorsements_user_write" ON public.advisor_endorsements FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "endorsements_service_role" ON public.advisor_endorsements;
CREATE POLICY "endorsements_service_role" ON public.advisor_endorsements TO service_role
  USING (true) WITH CHECK (true);
COMMIT;
