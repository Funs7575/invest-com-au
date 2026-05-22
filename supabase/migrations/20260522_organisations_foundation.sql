-- organisations_foundation: standalone business accounts for training companies,
-- CPD providers, compliance firms, fintech vendors, industry bodies, etc.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.organisation_members CASCADE;
--   DROP TABLE IF EXISTS public.organisation_applications CASCADE;
--   DROP TABLE IF EXISTS public.organisations CASCADE;
--   ALTER TABLE public.courses DROP COLUMN IF EXISTS creator_kind;
--   ALTER TABLE public.courses DROP COLUMN IF EXISTS organisation_id;

-- ─── organisations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisations (
  id                             SERIAL PRIMARY KEY,
  slug                           TEXT NOT NULL UNIQUE,
  name                           TEXT NOT NULL,
  organisation_type              TEXT NOT NULL DEFAULT 'training_provider'
    CHECK (organisation_type IN (
      'training_provider', 'cpd_provider', 'compliance', 'fintech',
      'industry_body', 'law_firm', 'accounting_firm', 'other'
    )),
  abn                            TEXT,
  acn                            TEXT,
  website                        TEXT,
  email                          TEXT NOT NULL,
  phone                          TEXT,
  logo_url                       TEXT,
  bio                            TEXT,
  location_state                 TEXT,
  stripe_connect_account_id      TEXT,
  stripe_connect_status          TEXT NOT NULL DEFAULT 'not_connected'
    CHECK (stripe_connect_status IN (
      'not_connected', 'onboarding', 'active', 'restricted', 'rejected'
    )),
  stripe_connect_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  status                         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  verification_status            TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  cpd_provider_number            TEXT,
  tier                           TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'starter', 'growth', 'featured')),
  max_seats                      INTEGER NOT NULL DEFAULT 5,
  admin_user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organisations_slug
  ON public.organisations (slug);

CREATE INDEX IF NOT EXISTS idx_organisations_admin_user
  ON public.organisations (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_organisations_type_status
  ON public.organisations (organisation_type, status);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations FORCE ROW LEVEL SECURITY;

-- Public read of active + verified organisations (e.g. for directory listings)
DROP POLICY IF EXISTS "Public can view active organisations" ON public.organisations;
CREATE POLICY "Public can view active organisations"
  ON public.organisations FOR SELECT
  USING (status = 'active' AND verification_status = 'verified');

-- Admins of the organisation can view (even pending/suspended) and update their own org
DROP POLICY IF EXISTS "Organisation admin can view own org" ON public.organisations;
CREATE POLICY "Organisation admin can view own org"
  ON public.organisations FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid());

DROP POLICY IF EXISTS "Organisation admin can update own org" ON public.organisations;
CREATE POLICY "Organisation admin can update own org"
  ON public.organisations FOR UPDATE TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

-- Active members can also view their organisation
DROP POLICY IF EXISTS "Organisation members can view own org" ON public.organisations;
CREATE POLICY "Organisation members can view own org"
  ON public.organisations FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Service role has full access (admin routes, cron, webhooks)
DROP POLICY IF EXISTS "Service role full access on organisations" ON public.organisations;
CREATE POLICY "Service role full access on organisations"
  ON public.organisations FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── organisation_members ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisation_members (
  id              SERIAL PRIMARY KEY,
  organisation_id INTEGER NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'editor'
    CHECK (role IN ('admin', 'editor', 'viewer')),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'removed')),
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id
  ON public.organisation_members (organisation_id);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id
  ON public.organisation_members (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_members_email
  ON public.organisation_members (invited_email);

ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members FORCE ROW LEVEL SECURITY;

-- Org admins can see and manage all members of their organisation
DROP POLICY IF EXISTS "Org admin manages members" ON public.organisation_members;
CREATE POLICY "Org admin manages members"
  ON public.organisation_members FOR ALL TO authenticated
  USING (
    organisation_id IN (
      SELECT id FROM public.organisations WHERE admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT id FROM public.organisations WHERE admin_user_id = auth.uid()
    )
  );

-- Members can view sibling members in the same org
DROP POLICY IF EXISTS "Members can view own org members" ON public.organisation_members;
CREATE POLICY "Members can view own org members"
  ON public.organisation_members FOR SELECT TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members AS om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Users can view and update their own membership row (e.g. to accept invite)
DROP POLICY IF EXISTS "Users can view own membership" ON public.organisation_members;
CREATE POLICY "Users can view own membership"
  ON public.organisation_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own membership" ON public.organisation_members;
CREATE POLICY "Users can update own membership"
  ON public.organisation_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access on organisation_members" ON public.organisation_members;
CREATE POLICY "Service role full access on organisation_members"
  ON public.organisation_members FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── organisation_applications ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisation_applications (
  id                  SERIAL PRIMARY KEY,
  organisation_name   TEXT NOT NULL,
  organisation_type   TEXT NOT NULL,
  abn                 TEXT,
  website             TEXT,
  contact_name        TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  contact_phone       TEXT,
  bio                 TEXT,
  cpd_provider_number TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason    TEXT,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_applications_status
  ON public.organisation_applications (status);

CREATE INDEX IF NOT EXISTS idx_org_applications_email
  ON public.organisation_applications (contact_email);

ALTER TABLE public.organisation_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_applications FORCE ROW LEVEL SECURITY;

-- Anonymous users can submit applications (public apply form)
DROP POLICY IF EXISTS "Anon can insert organisation_applications" ON public.organisation_applications;
CREATE POLICY "Anon can insert organisation_applications"
  ON public.organisation_applications FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated users can also insert (logged-in users applying)
DROP POLICY IF EXISTS "Auth can insert organisation_applications" ON public.organisation_applications;
CREATE POLICY "Auth can insert organisation_applications"
  ON public.organisation_applications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Service role has full access (admin review workflow)
DROP POLICY IF EXISTS "Service role full access on organisation_applications" ON public.organisation_applications;
CREATE POLICY "Service role full access on organisation_applications"
  ON public.organisation_applications FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── Extend courses for organisation creator ──────────────────────────────────

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS creator_kind TEXT NOT NULL DEFAULT 'team'
    CHECK (creator_kind IN ('team', 'advisor', 'organisation'));

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS organisation_id INTEGER
    REFERENCES public.organisations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_courses_organisation
  ON public.courses (organisation_id)
  WHERE organisation_id IS NOT NULL;

-- Organisations can manage courses they own
DROP POLICY IF EXISTS "Organisation manages own courses" ON public.courses;
CREATE POLICY "Organisation manages own courses"
  ON public.courses FOR ALL TO authenticated
  USING (
    creator_kind = 'organisation'
    AND organisation_id IN (
      SELECT id FROM public.organisations
      WHERE admin_user_id = auth.uid()
      UNION
      SELECT organisation_id FROM public.organisation_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    creator_kind = 'organisation'
    AND organisation_id IN (
      SELECT id FROM public.organisations
      WHERE admin_user_id = auth.uid()
      UNION
      SELECT organisation_id FROM public.organisation_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'editor')
    )
  );
