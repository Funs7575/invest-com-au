-- Migration: 20260729_sp02_startup_portal_schema.sql
-- Date:      2026-05-20
-- Audit ref: docs/audits/sp-startup-portal-brief.md § SP-02
-- Queue:     SP-02 — Schema migration: founder-side tables
--
-- Why: Creates the database foundation for the Startup Portal
--   (/startup-portal/*) — 8 new tables covering founder profiles,
--   round management, investor inquiries, data-room files, access
--   grants, wholesale-investor certifications, founder sessions, and
--   ESIC verification. Also updates account_kind_membership VIEW to
--   expose the "startup" kind so enforcePortalKind("startup") works.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS; DROP POLICY IF EXISTS before
--   each CREATE POLICY; CREATE OR REPLACE VIEW for the membership view.
--   Safe to re-run on an already-migrated DB.
--
-- Rollback (reverse in order):
--   CREATE OR REPLACE VIEW public.account_kind_membership AS
--     <restore prior UNION without the startup_profiles arm>;
--   DROP TABLE IF EXISTS public.esic_verifications CASCADE;
--   DROP TABLE IF EXISTS public.startup_sessions CASCADE;
--   DROP TABLE IF EXISTS public.wholesale_investor_certifications CASCADE;
--   DROP TABLE IF EXISTS public.startup_data_room_access CASCADE;
--   DROP TABLE IF EXISTS public.startup_data_room_files CASCADE;
--   DROP TABLE IF EXISTS public.startup_investor_inquiries CASCADE;
--   DROP TABLE IF EXISTS public.startup_rounds CASCADE;
--   DROP TABLE IF EXISTS public.startup_profiles CASCADE;
--
-- IMPORTANT — prior policy state: none of these tables previously
--   existed; no pre-existing policies to carry forward.

BEGIN;

-- ─── 1. startup_profiles ─────────────────────────────────────────────────────
-- Core founder-company profile. owner_user_id is the Supabase Auth uid.
-- Public can read active profiles; only the owner can write.

CREATE TABLE IF NOT EXISTS public.startup_profiles (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     text NOT NULL UNIQUE,
  company_name             text NOT NULL,
  abn                      text,
  founded_at               date,
  stage                    text NOT NULL DEFAULT 'pre_seed'
                             CHECK (stage IN ('pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'growth')),
  sector                   text[] NOT NULL DEFAULT '{}',
  team                     jsonb NOT NULL DEFAULT '[]',
  linkedin_url             text,
  pitch_deck_url           text,
  esic_eligible_self_attested boolean NOT NULL DEFAULT false,
  esic_verified_at         timestamptz,
  esic_verified_by         text,
  owner_user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                   text NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'active', 'archived')),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_profiles_owner ON public.startup_profiles (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_startup_profiles_status ON public.startup_profiles (status);

ALTER TABLE public.startup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "startup_profiles_anon_read_active"   ON public.startup_profiles;
DROP POLICY IF EXISTS "startup_profiles_owner_select"       ON public.startup_profiles;
DROP POLICY IF EXISTS "startup_profiles_owner_write"        ON public.startup_profiles;
DROP POLICY IF EXISTS "startup_profiles_service_role"       ON public.startup_profiles;

CREATE POLICY "startup_profiles_anon_read_active"
  ON public.startup_profiles FOR SELECT
  USING (status = 'active' AND owner_user_id IS NOT NULL);

CREATE POLICY "startup_profiles_owner_select"
  ON public.startup_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "startup_profiles_owner_write"
  ON public.startup_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "startup_profiles_service_role"
  ON public.startup_profiles TO service_role
  USING (true) WITH CHECK (true);

-- ─── 2. startup_rounds ───────────────────────────────────────────────────────
-- A fundraising round belonging to a startup. Investors see open/committed/
-- closed rounds via anon select; drafts and withdrawn are owner-only.

CREATE TABLE IF NOT EXISTS public.startup_rounds (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id               uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  instrument               text NOT NULL
                             CHECK (instrument IN ('safe', 'safe_t', 'convertible_note', 'priced_equity')),
  status                   text NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'committed', 'closed', 'withdrawn')),
  target_aud_cents         bigint NOT NULL,
  raised_aud_cents         bigint NOT NULL DEFAULT 0,
  lead_investor_name       text,
  valuation_cap_aud_cents  bigint,
  discount_pct             numeric,
  interest_rate_pct        numeric,
  maturity_months          int,
  min_ticket_aud_cents     bigint NOT NULL DEFAULT 500000,
  closes_at                timestamptz,
  wholesale_only           boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_rounds_startup  ON public.startup_rounds (startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_rounds_status   ON public.startup_rounds (status);

ALTER TABLE public.startup_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_rounds FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "startup_rounds_anon_read_public"  ON public.startup_rounds;
DROP POLICY IF EXISTS "startup_rounds_owner_all"         ON public.startup_rounds;
DROP POLICY IF EXISTS "startup_rounds_service_role"      ON public.startup_rounds;

CREATE POLICY "startup_rounds_anon_read_public"
  ON public.startup_rounds FOR SELECT
  USING (status IN ('open', 'committed', 'closed'));

CREATE POLICY "startup_rounds_owner_all"
  ON public.startup_rounds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_profiles sp
      WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.startup_profiles sp
      WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "startup_rounds_service_role"
  ON public.startup_rounds TO service_role
  USING (true) WITH CHECK (true);

-- ─── 3. startup_investor_inquiries ───────────────────────────────────────────
-- An investor's interest in a round. Investor reads/writes own rows;
-- startup owner reads all inquiries on their rounds.

CREATE TABLE IF NOT EXISTS public.startup_investor_inquiries (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id                    uuid NOT NULL REFERENCES public.startup_rounds(id) ON DELETE CASCADE,
  investor_user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                      text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  inquiry_message             text NOT NULL,
  wholesale_cert_id           uuid,
  data_room_access_granted_at timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_inquiries_round    ON public.startup_investor_inquiries (round_id);
CREATE INDEX IF NOT EXISTS idx_startup_inquiries_investor ON public.startup_investor_inquiries (investor_user_id);

ALTER TABLE public.startup_investor_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_investor_inquiries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "startup_inquiries_investor_own"   ON public.startup_investor_inquiries;
DROP POLICY IF EXISTS "startup_inquiries_owner_read"     ON public.startup_investor_inquiries;
DROP POLICY IF EXISTS "startup_inquiries_service_role"   ON public.startup_investor_inquiries;

CREATE POLICY "startup_inquiries_investor_own"
  ON public.startup_investor_inquiries FOR ALL
  TO authenticated
  USING (investor_user_id = auth.uid())
  WITH CHECK (investor_user_id = auth.uid());

CREATE POLICY "startup_inquiries_owner_read"
  ON public.startup_investor_inquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_rounds sr
      JOIN public.startup_profiles sp ON sp.id = sr.startup_id
      WHERE sr.id = round_id AND sp.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "startup_inquiries_service_role"
  ON public.startup_investor_inquiries TO service_role
  USING (true) WITH CHECK (true);

-- ─── 4. startup_data_room_files ──────────────────────────────────────────────
-- Files uploaded by the startup owner. Investor access is gated on
-- startup_data_room_access rows (checked in application layer via
-- service-role; anon never reads).

CREATE TABLE IF NOT EXISTS public.startup_data_room_files (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id               uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  round_id                 uuid REFERENCES public.startup_rounds(id) ON DELETE SET NULL,
  filename                 text NOT NULL,
  storage_path             text NOT NULL,
  category                 text NOT NULL DEFAULT 'other'
                             CHECK (category IN ('pitch_deck', 'financials', 'cap_table', 'legal', 'product_demo', 'other')),
  requires_wholesale_cert  boolean NOT NULL DEFAULT true,
  uploaded_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_files_startup ON public.startup_data_room_files (startup_id);

ALTER TABLE public.startup_data_room_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_data_room_files FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "startup_files_owner_all"      ON public.startup_data_room_files;
DROP POLICY IF EXISTS "startup_files_service_role"   ON public.startup_data_room_files;

-- Anon: deny all (no public SELECT policy — data-room files are private by design)
-- Investor read access is enforced in the application layer via service-role
-- after checking startup_data_room_access. -- TODO: human review — investor SELECT
-- policy requires checking two tables (access grant + wholesale cert); complex
-- enough that service-role in a server route is the right approach here.

CREATE POLICY "startup_files_owner_all"
  ON public.startup_data_room_files FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_profiles sp
      WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.startup_profiles sp
      WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "startup_files_service_role"
  ON public.startup_data_room_files TO service_role
  USING (true) WITH CHECK (true);

-- ─── 5. startup_data_room_access ─────────────────────────────────────────────
-- Junction: which investors have been granted access to which files.
-- Managed by startup owner; granted investor reads own rows.

CREATE TABLE IF NOT EXISTS public.startup_data_room_access (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id           uuid NOT NULL REFERENCES public.startup_data_room_files(id) ON DELETE CASCADE,
  granted_to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at        timestamptz,
  granted_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE (file_id, granted_to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_startup_access_file    ON public.startup_data_room_access (file_id);
CREATE INDEX IF NOT EXISTS idx_startup_access_granted ON public.startup_data_room_access (granted_to_user_id);

ALTER TABLE public.startup_data_room_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_data_room_access FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "startup_access_investor_read_own"  ON public.startup_data_room_access;
DROP POLICY IF EXISTS "startup_access_owner_manage"       ON public.startup_data_room_access;
DROP POLICY IF EXISTS "startup_access_service_role"       ON public.startup_data_room_access;

CREATE POLICY "startup_access_investor_read_own"
  ON public.startup_data_room_access FOR SELECT
  TO authenticated
  USING (granted_to_user_id = auth.uid() AND revoked_at IS NULL);

CREATE POLICY "startup_access_owner_manage"
  ON public.startup_data_room_access FOR ALL
  TO authenticated
  USING (granted_by_user_id = auth.uid())
  WITH CHECK (granted_by_user_id = auth.uid());

CREATE POLICY "startup_access_service_role"
  ON public.startup_data_room_access TO service_role
  USING (true) WITH CHECK (true);

-- ─── 6. wholesale_investor_certifications ────────────────────────────────────
-- Platform-level s708 / professional-investor cert. One-time per user;
-- recognised across all startup listings. User reads/writes own; admin verifies.

CREATE TABLE IF NOT EXISTS public.wholesale_investor_certifications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_type    text NOT NULL
                          CHECK (certification_type IN ('s708_sophisticated', 'professional_investor')),
  evidence_doc_path     text NOT NULL,
  verified_at           timestamptz,
  verified_by           text,
  expires_at            timestamptz NOT NULL,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'verified', 'expired', 'rejected')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, certification_type)
);

CREATE INDEX IF NOT EXISTS idx_wholesale_cert_user   ON public.wholesale_investor_certifications (user_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_cert_status ON public.wholesale_investor_certifications (status);

ALTER TABLE public.wholesale_investor_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_investor_certifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wholesale_cert_user_own"       ON public.wholesale_investor_certifications;
DROP POLICY IF EXISTS "wholesale_cert_service_role"   ON public.wholesale_investor_certifications;

CREATE POLICY "wholesale_cert_user_own"
  ON public.wholesale_investor_certifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "wholesale_cert_service_role"
  ON public.wholesale_investor_certifications TO service_role
  USING (true) WITH CHECK (true);

-- ─── 7. startup_sessions ─────────────────────────────────────────────────────
-- Short-lived portal sessions issued at startup-portal login.
-- Deny-all-anon by design (mirrors advisor_sessions pattern). Accessed
-- exclusively via service-role from require-startup-session.ts.

CREATE TABLE IF NOT EXISTS public.startup_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id  uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_sessions_user    ON public.startup_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_startup_sessions_startup ON public.startup_sessions (startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_sessions_expires ON public.startup_sessions (expires_at);

ALTER TABLE public.startup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_sessions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "startup_sessions_service_role" ON public.startup_sessions;

-- Deny-all anon + authenticated intentionally — service-role only, same as advisor_sessions.
CREATE POLICY "startup_sessions_service_role"
  ON public.startup_sessions TO service_role
  USING (true) WITH CHECK (true);

-- ─── 8. esic_verifications ───────────────────────────────────────────────────
-- Admin-reviewed ESIC eligibility verifications. Startup owner submits;
-- admin reviews; outcome is recorded. User reads own startup's records.

CREATE TABLE IF NOT EXISTS public.esic_verifications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id           uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  evidence_doc_path    text NOT NULL,
  ato_register_check   jsonb NOT NULL DEFAULT '{}',
  reviewed_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at          timestamptz,
  outcome              text NOT NULL DEFAULT 'pending'
                         CHECK (outcome IN ('pending', 'approved', 'rejected')),
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_esic_startup ON public.esic_verifications (startup_id);

ALTER TABLE public.esic_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esic_verifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esic_verifications_owner_all"      ON public.esic_verifications;
DROP POLICY IF EXISTS "esic_verifications_service_role"   ON public.esic_verifications;

CREATE POLICY "esic_verifications_owner_all"
  ON public.esic_verifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_profiles sp
      WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.startup_profiles sp
      WHERE sp.id = startup_id AND sp.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "esic_verifications_service_role"
  ON public.esic_verifications TO service_role
  USING (true) WITH CHECK (true);

-- ─── 9. Update account_kind_membership VIEW ───────────────────────────────────
-- Add startup_profiles arm so getKindsForUser() returns kind='startup'
-- for startup founders. Without this, enforcePortalKind("startup")
-- always redirects founders to the account-type chooser.
-- Mirrors the existing 5-arm UNION in 20260510240000_listing_owner_accounts.sql.

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
    COALESCE(company_name, 'Startup'), created_at
  FROM public.startup_profiles WHERE owner_user_id IS NOT NULL;

REVOKE ALL ON public.account_kind_membership FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_kind_membership TO service_role;
GRANT SELECT ON public.account_kind_membership TO authenticated;

COMMIT;
