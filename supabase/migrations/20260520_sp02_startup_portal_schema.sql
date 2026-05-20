-- Migration: 20260520_sp02_startup_portal_schema.sql
-- Date: 2026-05-20
-- Audit ref: docs/audits/sp-startup-portal-brief.md
-- Queue item: SP-02
-- Why: Creates the 8-table startup-portal schema. Startup founders need a dedicated portal
--      mirroring the advisor-portal pattern (sessions, KYC, rounds, data room, wholesale-cert
--      gating). Adds startup_profiles arm to account_kind_membership so enforcePortalKind("startup")
--      resolves correctly — without this arm every founder is redirected to the account chooser.
-- Idempotency: All CREATE TABLE use IF NOT EXISTS; CREATE OR REPLACE VIEW is idempotent.
-- Rollback: DROP TABLE IF EXISTS startup_sessions, esic_verifications,
--           startup_data_room_access, startup_data_room_files, startup_investor_inquiries,
--           startup_rounds, wholesale_investor_certifications, startup_profiles CASCADE;
--           Then recreate account_kind_membership without the startup arm
--           (see 20260510240000_listing_owner_accounts.sql for the prior 5-arm version).
-- IMPORTANT — prior policy state: All 8 tables are new (no prior policies). The
--   account_kind_membership view is fully replaced; prior version from
--   20260510240000_listing_owner_accounts.sql had 5 arms — advisor, broker_partner, investor,
--   business_owner, listing_owner. This migration adds startup as arm #6.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. startup_profiles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.startup_profiles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        UNIQUE NOT NULL,
  company_name    text        NOT NULL,
  abn             text,
  founded_at      date,
  stage           text        NOT NULL CHECK (stage IN ('pre_seed','seed','series_a','series_b','series_c','growth')),
  sector          text[]      NOT NULL DEFAULT '{}',
  team            jsonb       NOT NULL DEFAULT '[]',
  linkedin_url    text,
  pitch_deck_url  text,
  esic_eligible_self_attested boolean NOT NULL DEFAULT false,
  esic_verified_at   timestamptz,
  esic_verified_by   text,
  owner_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can view active startup profiles"           ON public.startup_profiles;
DROP POLICY IF EXISTS "Owner can read own startup profile"              ON public.startup_profiles;
DROP POLICY IF EXISTS "Owner can write own startup profile"             ON public.startup_profiles;
DROP POLICY IF EXISTS "Service role full access to startup_profiles"    ON public.startup_profiles;

CREATE POLICY "Anon can view active startup profiles"
  ON public.startup_profiles FOR SELECT TO anon, authenticated
  USING (status = 'active' AND owner_user_id IS NOT NULL);

CREATE POLICY "Owner can read own startup profile"
  ON public.startup_profiles FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Owner can write own startup profile"
  ON public.startup_profiles FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Service role full access to startup_profiles"
  ON public.startup_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2. startup_rounds
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.startup_rounds (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id                uuid        NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  instrument                text        NOT NULL CHECK (instrument IN ('safe','safe_t','convertible_note','priced_equity')),
  status                    text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','committed','closed','withdrawn')),
  target_aud_cents          bigint      NOT NULL CHECK (target_aud_cents > 0),
  raised_aud_cents          bigint      NOT NULL DEFAULT 0 CHECK (raised_aud_cents >= 0),
  lead_investor_name        text,
  valuation_cap_aud_cents   bigint,
  discount_pct              numeric,
  interest_rate_pct         numeric,
  maturity_months           int,
  min_ticket_aud_cents      bigint      NOT NULL DEFAULT 0,
  closes_at                 timestamptz,
  wholesale_only            boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_rounds FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can view open rounds"               ON public.startup_rounds;
DROP POLICY IF EXISTS "Owner can manage own startup rounds"     ON public.startup_rounds;
DROP POLICY IF EXISTS "Service role full access to startup_rounds" ON public.startup_rounds;

CREATE POLICY "Anon can view open rounds"
  ON public.startup_rounds FOR SELECT TO anon, authenticated
  USING (status IN ('open','committed','closed'));

CREATE POLICY "Owner can manage own startup rounds"
  ON public.startup_rounds FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.startup_profiles sp WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.startup_profiles sp WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()));

CREATE POLICY "Service role full access to startup_rounds"
  ON public.startup_rounds FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 3. wholesale_investor_certifications
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_investor_certifications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_type    text        NOT NULL CHECK (certification_type IN ('s708_sophisticated','professional_investor')),
  evidence_doc_path     text        NOT NULL,
  verified_at           timestamptz,
  verified_by           text,
  expires_at            timestamptz NOT NULL,
  status                text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','expired','rejected')),
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_investor_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_investor_certifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User can read own wholesale cert"                            ON public.wholesale_investor_certifications;
DROP POLICY IF EXISTS "User can submit wholesale cert"                              ON public.wholesale_investor_certifications;
DROP POLICY IF EXISTS "Service role full access to wholesale_investor_certifications" ON public.wholesale_investor_certifications;

CREATE POLICY "User can read own wholesale cert"
  ON public.wholesale_investor_certifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "User can submit wholesale cert"
  ON public.wholesale_investor_certifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access to wholesale_investor_certifications"
  ON public.wholesale_investor_certifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 4. startup_investor_inquiries
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.startup_investor_inquiries (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id                    uuid        NOT NULL REFERENCES public.startup_rounds(id) ON DELETE CASCADE,
  investor_user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  inquiry_message             text        NOT NULL,
  wholesale_cert_id           uuid        REFERENCES public.wholesale_investor_certifications(id),
  data_room_access_granted_at timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_investor_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_investor_inquiries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Investor can read own inquiries"                     ON public.startup_investor_inquiries;
DROP POLICY IF EXISTS "Investor can submit inquiry"                         ON public.startup_investor_inquiries;
DROP POLICY IF EXISTS "Startup owner can read inquiries on own rounds"      ON public.startup_investor_inquiries;
DROP POLICY IF EXISTS "Service role full access to startup_investor_inquiries" ON public.startup_investor_inquiries;

CREATE POLICY "Investor can read own inquiries"
  ON public.startup_investor_inquiries FOR SELECT TO authenticated
  USING (investor_user_id = auth.uid());

CREATE POLICY "Investor can submit inquiry"
  ON public.startup_investor_inquiries FOR INSERT TO authenticated
  WITH CHECK (investor_user_id = auth.uid());

CREATE POLICY "Startup owner can read inquiries on own rounds"
  ON public.startup_investor_inquiries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.startup_rounds sr
    JOIN public.startup_profiles sp ON sp.id = sr.startup_id
    WHERE sr.id = round_id AND sp.owner_user_id = auth.uid()
  ));

CREATE POLICY "Service role full access to startup_investor_inquiries"
  ON public.startup_investor_inquiries FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 5. startup_data_room_files
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.startup_data_room_files (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id              uuid        NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  round_id                uuid        REFERENCES public.startup_rounds(id) ON DELETE SET NULL,
  filename                text        NOT NULL,
  storage_path            text        NOT NULL,
  category                text        NOT NULL CHECK (category IN ('pitch_deck','financials','cap_table','legal','product_demo','other')),
  requires_wholesale_cert boolean     NOT NULL DEFAULT true,
  uploaded_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_data_room_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_data_room_files FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner can manage data room files"                        ON public.startup_data_room_files;
DROP POLICY IF EXISTS "Investor can read granted data room files"               ON public.startup_data_room_files;
DROP POLICY IF EXISTS "Service role full access to startup_data_room_files"     ON public.startup_data_room_files;

CREATE POLICY "Owner can manage data room files"
  ON public.startup_data_room_files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.startup_profiles sp WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.startup_profiles sp WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()));

CREATE POLICY "Investor can read granted data room files"
  ON public.startup_data_room_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_data_room_access a
      WHERE a.file_id = id AND a.granted_to_user_id = auth.uid() AND a.revoked_at IS NULL
    )
    AND (
      requires_wholesale_cert = false
      OR EXISTS (
        SELECT 1 FROM public.wholesale_investor_certifications w
        WHERE w.user_id = auth.uid() AND w.status = 'verified' AND w.expires_at > now()
      )
    )
  );

CREATE POLICY "Service role full access to startup_data_room_files"
  ON public.startup_data_room_files FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 6. startup_data_room_access
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.startup_data_room_access (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id             uuid        NOT NULL REFERENCES public.startup_data_room_files(id) ON DELETE CASCADE,
  granted_to_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at          timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz,
  granted_by_user_id  uuid        NOT NULL REFERENCES auth.users(id),
  UNIQUE (file_id, granted_to_user_id)
);

ALTER TABLE public.startup_data_room_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_data_room_access FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Grantee can read own access"                             ON public.startup_data_room_access;
DROP POLICY IF EXISTS "Startup owner can manage access grants"                  ON public.startup_data_room_access;
DROP POLICY IF EXISTS "Service role full access to startup_data_room_access"    ON public.startup_data_room_access;

CREATE POLICY "Grantee can read own access"
  ON public.startup_data_room_access FOR SELECT TO authenticated
  USING (granted_to_user_id = auth.uid() AND revoked_at IS NULL);

CREATE POLICY "Startup owner can manage access grants"
  ON public.startup_data_room_access FOR ALL TO authenticated
  USING (granted_by_user_id = auth.uid())
  WITH CHECK (granted_by_user_id = auth.uid());

CREATE POLICY "Service role full access to startup_data_room_access"
  ON public.startup_data_room_access FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 7. startup_sessions  (deny-all-anon by design — mirrors advisor_sessions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.startup_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id  uuid        NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access to startup_sessions" ON public.startup_sessions;

-- Intentionally deny-all to anon + authenticated; service_role only.
-- require-startup-session.ts uses createAdminClient() per CLAUDE.md allowed scope.
CREATE POLICY "Service role full access to startup_sessions"
  ON public.startup_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 8. esic_verifications
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.esic_verifications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id            uuid        NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  evidence_doc_path     text        NOT NULL,
  ato_register_check    jsonb,
  reviewed_by_user_id   uuid        REFERENCES auth.users(id),
  reviewed_at           timestamptz,
  outcome               text        NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending','approved','rejected')),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.esic_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esic_verifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Startup owner can read own ESIC verifications"   ON public.esic_verifications;
DROP POLICY IF EXISTS "Startup owner can submit ESIC verification"      ON public.esic_verifications;
DROP POLICY IF EXISTS "Service role full access to esic_verifications"  ON public.esic_verifications;

CREATE POLICY "Startup owner can read own ESIC verifications"
  ON public.esic_verifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.startup_profiles sp WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()));

CREATE POLICY "Startup owner can submit ESIC verification"
  ON public.esic_verifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.startup_profiles sp WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()));

CREATE POLICY "Service role full access to esic_verifications"
  ON public.esic_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 9. Add startup_profiles arm to account_kind_membership view
-- Replaces the view from 20260510240000_listing_owner_accounts.sql (5 arms → 6 arms).
-- owner_user_id on startup_profiles maps to auth_user_id in the view contract.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.account_kind_membership AS
  SELECT auth_user_id, 'advisor'::text AS kind, id::text AS kind_id, status,
    COALESCE(firm_name, name) AS display_label, created_at
  FROM public.professionals WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT auth_user_id, 'broker_partner'::text, id::text, status,
    COALESCE(company_name, full_name, broker_slug), created_at
  FROM public.broker_accounts WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT auth_user_id, 'investor'::text, id::text, 'active'::text,
    COALESCE(display_name, 'Investor account'), created_at
  FROM public.investor_profiles WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT auth_user_id, 'business_owner'::text, id::text, status,
    COALESCE(legal_name, business_name), created_at
  FROM public.business_accounts WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT auth_user_id, 'listing_owner'::text, id::text, status,
    COALESCE(display_name, 'Listing owner account'), created_at
  FROM public.listing_owner_accounts WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT owner_user_id, 'startup'::text, id::text, status,
    company_name, created_at
  FROM public.startup_profiles WHERE owner_user_id IS NOT NULL;

REVOKE ALL ON public.account_kind_membership FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_kind_membership TO service_role;
GRANT SELECT ON public.account_kind_membership TO authenticated;

COMMIT;
