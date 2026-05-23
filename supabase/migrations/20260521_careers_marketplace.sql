-- Migration: 20260521_careers_marketplace.sql
-- Date:      2026-05-21
-- Audit ref: docs/audits/REMEDIATION_QUEUE.md § B4
-- Queue:     B4 — Advisor careers / recruiter marketplace
--
-- Why: Creates the database foundation for the Advisor Careers / Job Board
--   (/careers/*) and the Firm Portal job management UI. Two tables:
--   - job_posts: firm-owned job listings (title, location, type, description,
--     status). Firms manage their own posts; public can browse active ones.
--   - job_applications: applicant submissions per post. Anonymous users can
--     apply; only the owning firm reads applications for their posts.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS; DROP POLICY IF EXISTS before each
--   CREATE POLICY; CREATE INDEX IF NOT EXISTS. Safe to re-run on an already-
--   migrated DB.
--
-- Rollback (reverse in order):
--   DROP TABLE IF EXISTS public.job_applications CASCADE;
--   DROP TABLE IF EXISTS public.job_posts CASCADE;
--
-- IMPORTANT — charge model is out of scope: per-post / recruiter-seat billing
--   is noted as a follow-up (see REMEDIATION_QUEUE.md § B4-billing).

BEGIN;

-- ─── 1. job_posts ─────────────────────────────────────────────────────────────
-- A job listing created by an advisory firm.
-- firm_id references advisor_firms; admin is the Supabase Auth user who
-- created the post. Public (anon + authenticated) can SELECT active posts;
-- only the owning firm (auth.uid() in firm membership) can INSERT/UPDATE/DELETE.
-- Service-role has unrestricted access for admin and cron operations.

CREATE TABLE IF NOT EXISTS public.job_posts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       uuid        NOT NULL REFERENCES public.advisor_firms(id) ON DELETE CASCADE,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title         text        NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  location      text        NOT NULL CHECK (char_length(location) BETWEEN 2 AND 100),
  type          text        NOT NULL DEFAULT 'full_time'
                              CHECK (type IN ('full_time', 'part_time', 'contract', 'casual')),
  description   text        NOT NULL CHECK (char_length(description) BETWEEN 10 AND 8000),
  status        text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_posts_firm   ON public.job_posts (firm_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON public.job_posts (status);

ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts FORCE ROW LEVEL SECURITY;

-- Public read: any visitor can browse active posts.
DROP POLICY IF EXISTS "job_posts_public_read_active"    ON public.job_posts;
-- Firm admin read: firm member with is_firm_admin can see all posts for their firm.
DROP POLICY IF EXISTS "job_posts_firm_admin_all"        ON public.job_posts;
-- Service-role: unrestricted.
DROP POLICY IF EXISTS "job_posts_service_role"          ON public.job_posts;

CREATE POLICY "job_posts_public_read_active"
  ON public.job_posts FOR SELECT
  USING (status = 'active');

-- Firm admins can SELECT/INSERT/UPDATE/DELETE their firm's posts.
-- We derive firm membership by looking up professionals.firm_id for the calling uid.
CREATE POLICY "job_posts_firm_admin_all"
  ON public.job_posts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.auth_user_id = auth.uid()
        AND p.firm_id = job_posts.firm_id
        AND p.is_firm_admin = true
        AND p.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.auth_user_id = auth.uid()
        AND p.firm_id = job_posts.firm_id
        AND p.is_firm_admin = true
        AND p.status = 'active'
    )
  );

CREATE POLICY "job_posts_service_role"
  ON public.job_posts TO service_role
  USING (true) WITH CHECK (true);

-- ─── 2. job_applications ──────────────────────────────────────────────────────
-- An applicant's submission against a job post.
-- Anonymous and authenticated users can INSERT (apply). The owning firm admin
-- reads all applications for their posts; individual applicants cannot self-read
-- (prevents enumeration). Service-role has unrestricted access.

CREATE TABLE IF NOT EXISTS public.job_applications (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           uuid        NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  applicant_name   text        NOT NULL CHECK (char_length(applicant_name) BETWEEN 1 AND 120),
  applicant_email  text        NOT NULL CHECK (applicant_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  message          text        NOT NULL CHECK (char_length(message) BETWEEN 10 AND 3000),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications (job_id);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications FORCE ROW LEVEL SECURITY;

-- Anon / authenticated applicants can submit.
DROP POLICY IF EXISTS "job_applications_anon_insert"     ON public.job_applications;
-- Owning firm admin reads all applications for their posts.
DROP POLICY IF EXISTS "job_applications_firm_admin_read" ON public.job_applications;
-- Service-role: unrestricted.
DROP POLICY IF EXISTS "job_applications_service_role"    ON public.job_applications;

CREATE POLICY "job_applications_anon_insert"
  ON public.job_applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_posts jp
      WHERE jp.id = job_applications.job_id AND jp.status = 'active'
    )
  );

CREATE POLICY "job_applications_firm_admin_read"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.job_posts jp
        JOIN public.professionals p ON p.firm_id = jp.firm_id
       WHERE jp.id = job_applications.job_id
         AND p.auth_user_id = auth.uid()
         AND p.is_firm_admin = true
         AND p.status = 'active'
    )
  );

CREATE POLICY "job_applications_service_role"
  ON public.job_applications TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
