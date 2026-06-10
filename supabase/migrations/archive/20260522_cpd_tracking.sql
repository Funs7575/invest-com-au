-- CPD (Continuing Professional Development) tracking for licensed financial advisors.
-- Australian advisors are required to complete 40 CPD hours/year under ASIC's rules.
-- This migration adds:
--   1. CPD-eligibility columns on the courses table
--   2. course_certificates — issued on course completion, for any student
--   3. cpd_credits — CPD credit entries linked to course completions (advisors only)
--
-- Rollback:
--   ALTER TABLE courses DROP COLUMN IF EXISTS cpd_hours;
--   ALTER TABLE courses DROP COLUMN IF EXISTS cpd_category;
--   ALTER TABLE courses DROP COLUMN IF EXISTS is_cpd_eligible;
--   DROP TABLE IF EXISTS cpd_credits;
--   DROP TABLE IF EXISTS course_certificates;

BEGIN;

-- =============================================================================
-- 1. Add CPD columns to courses
-- =============================================================================

ALTER TABLE courses ADD COLUMN IF NOT EXISTS cpd_hours       NUMERIC(5,2);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cpd_category    TEXT DEFAULT 'technical'
  CHECK (cpd_category IN ('technical', 'conduct', 'client_care', 'regulatory'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_cpd_eligible BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN courses.cpd_hours       IS 'CPD hours this course counts toward the annual 40-hour ASIC requirement.';
COMMENT ON COLUMN courses.cpd_category    IS 'ASIC CPD category: technical | conduct | client_care | regulatory.';
COMMENT ON COLUMN courses.is_cpd_eligible IS 'Whether this course is approved to count toward CPD hours.';

-- =============================================================================
-- 2. course_certificates — issued to any student who completes a course
-- =============================================================================
-- Callers:
--   lib/course-certificates.ts  createAdminClient() → INSERT
--   app/api/advisor-auth/cpd/route.ts  createAdminClient() → SELECT (advisor's own)
--   (future) app/account/courses  createClient() → SELECT (user's own)
--
-- Rollback: DROP TABLE IF EXISTS course_certificates;
-- =============================================================================

CREATE TABLE IF NOT EXISTS course_certificates (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  professional_id    BIGINT      REFERENCES professionals(id) ON DELETE SET NULL,
  course_id          BIGINT      NOT NULL REFERENCES courses(id),
  purchase_id        BIGINT      REFERENCES course_purchases(id),
  certificate_number TEXT        NOT NULL,
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cpd_hours          NUMERIC(5,2),
  cpd_category       TEXT,
  completion_score   NUMERIC(5,2),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT course_certificates_certificate_number_key UNIQUE (certificate_number),
  CONSTRAINT course_certificates_user_course_key        UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_certificates_user_id
  ON course_certificates (user_id);

CREATE INDEX IF NOT EXISTS idx_course_certificates_professional_id
  ON course_certificates (professional_id);

CREATE INDEX IF NOT EXISTS idx_course_certificates_course_id
  ON course_certificates (course_id);

COMMENT ON TABLE  course_certificates IS 'Completion certificates issued when a user finishes all lessons in a course.';
COMMENT ON COLUMN course_certificates.certificate_number IS 'Human-readable identifier, e.g. INV-2026-00042.';
COMMENT ON COLUMN course_certificates.professional_id    IS 'Populated when the student is also an advisor (professionals row).';

ALTER TABLE course_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_certificates FORCE ROW LEVEL SECURITY;

-- Service role: full access (lib/course-certificates.ts inserts via admin client)
DROP POLICY IF EXISTS "service_role full access" ON course_certificates;
CREATE POLICY "service_role full access"
  ON course_certificates
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own certificates
DROP POLICY IF EXISTS "User reads own certificates" ON course_certificates;
CREATE POLICY "User reads own certificates"
  ON course_certificates
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- 3. cpd_credits — one row per course completion where the student is an advisor
-- =============================================================================
-- Callers:
--   lib/course-certificates.ts  createAdminClient() → INSERT
--   app/api/advisor-auth/cpd/route.ts  createAdminClient() → SELECT (advisor's own)
--
-- Rollback: DROP TABLE IF EXISTS cpd_credits;
-- =============================================================================

CREATE TABLE IF NOT EXISTS cpd_credits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id  BIGINT      NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  course_id        BIGINT      NOT NULL REFERENCES courses(id),
  purchase_id      BIGINT      REFERENCES course_purchases(id),
  certificate_id   UUID        REFERENCES course_certificates(id) ON DELETE SET NULL,
  hours_earned     NUMERIC(5,2) NOT NULL,
  cpd_category     TEXT        NOT NULL DEFAULT 'technical'
    CHECK (cpd_category IN ('technical', 'conduct', 'client_care', 'regulatory')),
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certificate_issued_at TIMESTAMPTZ,
  -- ASIC measures July 1 – June 30. cpd_year = the calendar year in which
  -- the CPD year *ends*, e.g. 2026 means the 2025-26 CPD year.
  cpd_year         INTEGER     NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cpd_credits_professional_course_key UNIQUE (professional_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_cpd_credits_professional_id
  ON cpd_credits (professional_id);

CREATE INDEX IF NOT EXISTS idx_cpd_credits_cpd_year
  ON cpd_credits (cpd_year);

COMMENT ON TABLE  cpd_credits IS 'CPD credit rows for licensed advisors; one per course completion.';
COMMENT ON COLUMN cpd_credits.cpd_year IS 'Year the ASIC CPD window closes — ASIC CPD year is July 1 to June 30. E.g. 2026 = 2025-26 window.';

ALTER TABLE cpd_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpd_credits FORCE ROW LEVEL SECURITY;

-- Service role: full access (lib/course-certificates.ts inserts via admin client)
DROP POLICY IF EXISTS "service_role full access" ON cpd_credits;
CREATE POLICY "service_role full access"
  ON cpd_credits
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Advisors can read their own CPD credits (no direct authenticated SELECT path
-- today — API route uses admin client — but policy is additive for future use).
DROP POLICY IF EXISTS "Advisor reads own CPD credits" ON cpd_credits;
CREATE POLICY "Advisor reads own CPD credits"
  ON cpd_credits
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM professionals
      WHERE auth_user_id = auth.uid()
    )
  );

COMMIT;
