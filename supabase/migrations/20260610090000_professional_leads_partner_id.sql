-- Partner lead attribution (CPL partner accounts).
--
-- Which api_customers row delivered a professional_leads record via
-- POST /api/partner/leads. NULL for on-site leads and for leads sent
-- with the legacy single-tenant PARTNER_API_KEY (those keep reporting
-- via source_page = 'partner_api').
--
-- Rollback strategy:
--   DROP INDEX IF EXISTS idx_professional_leads_partner;
--   ALTER TABLE public.professional_leads DROP COLUMN IF EXISTS partner_id;
--
-- No RLS change: professional_leads policies are unchanged — the column
-- is written/read only on service-role paths (partner API + analytics).

ALTER TABLE public.professional_leads
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.api_customers(id);

CREATE INDEX IF NOT EXISTS idx_professional_leads_partner
  ON public.professional_leads (partner_id)
  WHERE partner_id IS NOT NULL;
