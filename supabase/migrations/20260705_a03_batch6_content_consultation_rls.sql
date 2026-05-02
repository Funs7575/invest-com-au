-- =============================================================================
-- Date:          2026-05-02
-- Audit ref:     docs/audits/codebase-health-2026-04-24.md §A "RLS drift"
-- Queue item:    A-03 batch 6 (content + consultation + investment-profile family)
-- Why:           Five tables exist in the live DB and in lib/database.types.ts
--                but have zero migration history. Without CREATE TABLE migrations
--                a clean rebuild cannot reconstruct the schema from the repo.
--                Without RLS enabled, PostgREST serves every row to any role
--                that issues a query — no per-row access control whatsoever.
--
--                • consultations — paid consultation catalog (stripe_price_id,
--                  pro_price). Admin manages via browser client (authenticated);
--                  booking route reads via service_role. Public can read
--                  published consultations (public product catalog).
--                • consultation_bookings — per-user purchase records (user_id FK,
--                  amount_paid, stripe_payment_id). Admin reads via browser
--                  client; booking route writes via service_role. Authenticated
--                  users may read their own bookings.
--                • course_lessons — course content (video_url, is_free_preview).
--                  Admin manages via browser client. Authenticated users can
--                  read free-preview lessons; enrolled users read all.
--                  Enrollment check is done at the application layer (course_purchases
--                  table); RLS here permits reading free previews + allows
--                  service_role full access for purchase verification.
--                  TODO: human review — tighter per-enrollment gating could
--                  be added here once enrollment FK is confirmed.
--                • foreign_investment_rates — public reference data (FIRB rates,
--                  withholding tax rates by country). Read by server RSC anon
--                  client on /foreign-investment/[country] and the rates API.
--                  Admin manages via service_role. Policy: anon SELECT (active
--                  rows only) + service_role full access.
--                • country_investment_profiles — public country pages content.
--                  Read by server RSC anon client on /foreign-investment/[country].
--                  Admin manages via admin migrations / service_role.
--                  Policy: anon SELECT (active rows only) + service_role full access.
--
-- Idempotency:   CREATE TABLE IF NOT EXISTS throughout. DROP POLICY IF EXISTS
--                before each CREATE POLICY. ENABLE/FORCE RLS are no-ops when
--                already enabled. Safe to re-apply.
--
-- Prior policy   grep across all migrations confirms: 0 existing CREATE POLICY
-- state:         or ENABLE RLS statements on any of these five tables. No DROP
--                POLICY lines needed for prior policies.
--
-- Rollback:      For each table:
--                  ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
--                  ALTER TABLE public.<table> NO FORCE ROW LEVEL SECURITY;
--                  DROP POLICY IF EXISTS "<policy_name>" ON public.<table>;
--                  -- (do NOT drop tables — they have production data)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. consultations
--    Paid consultation product catalog. Stripe price IDs, duration, cal link.
--    Admin reads+writes via browser client (authenticated admin role).
--    Booking route reads via service_role (createAdminClient).
--    Public can SELECT published consultations (product browsing).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.consultations (
  id                  serial PRIMARY KEY,
  slug                text UNIQUE NOT NULL,
  title               text NOT NULL,
  description         text,
  category            text,
  consultant_id       integer NOT NULL,
  price               numeric NOT NULL,
  pro_price           numeric,
  duration_minutes    integer NOT NULL,
  stripe_price_id     text,
  stripe_pro_price_id text,
  cal_link            text,
  featured            boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'draft',
  sort_order          integer NOT NULL DEFAULT 99,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can read published consultations" ON public.consultations;
CREATE POLICY "Anon can read published consultations"
  ON public.consultations FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins manage consultations" ON public.consultations;
CREATE POLICY "Admins manage consultations"
  ON public.consultations FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Service role full access to consultations" ON public.consultations;
CREATE POLICY "Service role full access to consultations"
  ON public.consultations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. consultation_bookings
--    Per-user purchase records (user_id FK, amount_paid, stripe_payment_id).
--    Admin reads via browser client. Booking + cron routes use service_role.
--    Authenticated users may read their own bookings.
--    TODO: human review — confirm user_id references auth.users.id before
--    enabling per-user SELECT (using auth.uid() = user_id). Current cast
--    requires user_id to be UUID; Row type shows user_id: string.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.consultation_bookings (
  id                  bigserial PRIMARY KEY,
  consultation_id     integer NOT NULL,
  user_id             uuid NOT NULL,
  status              text NOT NULL DEFAULT 'pending',
  amount_paid         integer NOT NULL,
  stripe_payment_id   text,
  cal_booking_uid     text,
  booked_at           timestamptz DEFAULT now(),
  refunded_at         timestamptz
);

ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_bookings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own consultation bookings" ON public.consultation_bookings;
CREATE POLICY "Users read own consultation bookings"
  ON public.consultation_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all consultation bookings" ON public.consultation_bookings;
CREATE POLICY "Admins read all consultation bookings"
  ON public.consultation_bookings FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Service role full access to consultation bookings" ON public.consultation_bookings;
CREATE POLICY "Service role full access to consultation bookings"
  ON public.consultation_bookings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. course_lessons
--    Course content (video_url, is_free_preview, lesson_index).
--    Admin manages via browser client (authenticated admin).
--    Free-preview lessons are publicly readable.
--    All lessons readable by service_role (enrollment verification).
--    TODO: human review — per-enrollment gating (auth.uid() in course_purchases)
--    would tighten this further once FK confirmed.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id                      serial PRIMARY KEY,
  course_slug             text NOT NULL,
  slug                    text NOT NULL,
  title                   text NOT NULL,
  module_index            integer NOT NULL,
  module_title            text NOT NULL,
  lesson_index            integer NOT NULL,
  content                 text,
  video_url               text,
  video_duration_seconds  integer,
  duration_minutes        integer,
  is_free_preview         boolean DEFAULT false,
  related_brokers         jsonb,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can read free-preview lessons" ON public.course_lessons;
CREATE POLICY "Anon can read free-preview lessons"
  ON public.course_lessons FOR SELECT
  USING (is_free_preview = true);

DROP POLICY IF EXISTS "Admins manage course lessons" ON public.course_lessons;
CREATE POLICY "Admins manage course lessons"
  ON public.course_lessons FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Service role full access to course lessons" ON public.course_lessons;
CREATE POLICY "Service role full access to course lessons"
  ON public.course_lessons FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. foreign_investment_rates
--    Public reference data: FIRB stamp duty, withholding tax rates by country.
--    Read by RSC server client (anon JWT) on /foreign-investment/[country].
--    Admin updates via rates API (service_role). Public sees active rates only.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.foreign_investment_rates (
  id              serial PRIMARY KEY,
  country_code    text,
  country_name    text,
  rate_type       text NOT NULL,
  rate_percent    numeric,
  fee_cents       integer,
  threshold_cents integer,
  category        text,
  state           text,
  effective_from  date,
  effective_to    date,
  active          boolean DEFAULT true,
  notes           text,
  updated_at      timestamptz DEFAULT now(),
  updated_by      text
);

ALTER TABLE public.foreign_investment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foreign_investment_rates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active foreign investment rates" ON public.foreign_investment_rates;
CREATE POLICY "Public can read active foreign investment rates"
  ON public.foreign_investment_rates FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Service role full access to foreign investment rates" ON public.foreign_investment_rates;
CREATE POLICY "Service role full access to foreign investment rates"
  ON public.foreign_investment_rates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. country_investment_profiles
--    Public country page content (hero_title, key_facts, FDI data).
--    Read by RSC server client (anon JWT) on /foreign-investment/[country].
--    Admin updates via service_role (seed migrations / admin API).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.country_investment_profiles (
  id                              serial PRIMARY KEY,
  country_code                    text UNIQUE NOT NULL,
  country_name                    text NOT NULL,
  flag_emoji                      text,
  hero_title                      text,
  hero_subtitle                   text,
  meta_title                      text,
  meta_description                text,
  has_dta                         boolean,
  dta_year                        integer,
  fta_partner                     boolean,
  estimated_annual_fdi_aud_millions numeric,
  key_facts                       jsonb,
  active                          boolean DEFAULT true,
  created_at                      timestamptz DEFAULT now()
);

ALTER TABLE public.country_investment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_investment_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active country investment profiles" ON public.country_investment_profiles;
CREATE POLICY "Public can read active country investment profiles"
  ON public.country_investment_profiles FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Service role full access to country investment profiles" ON public.country_investment_profiles;
CREATE POLICY "Service role full access to country investment profiles"
  ON public.country_investment_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
