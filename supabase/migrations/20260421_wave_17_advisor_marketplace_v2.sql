-- Wave 17 schema — advisor marketplace v2.
--
-- Extensions + new tables:
--   1. professionals.intro_video_url         — hosted video URL (Vimeo/Mux/R2)
--   2. professionals.intro_video_poster_url  — still frame used as poster
--   3. professionals.accepts_new_clients     — simple availability toggle
--   4. professionals.response_time_hours     — EMA of reply speed (cron)
--   5. professionals.booking_link            — external booking URL (Calendly etc.)
--   6. advisor_booking_appointments                 — first-party slot inventory
--   7. professional_leads.quality_signals    — jsonb breakdown of score
--   8. professional_leads.quality_band       — text bucket (cold/warm/hot)
--
-- Design notes:
--   - booking_link is an escape hatch for advisors using Calendly
--     or similar. advisor_booking_appointments is first-party slots for
--     advisors who want us to handle bookings directly.
--   - accepts_new_clients is a crude bool rather than a full
--     waitlist model. Most advisor supply varies weekly and a
--     single bool is the cheapest signal to keep current.
--   - intro_video_url is a full URL, not a storage key, so we
--     support both our own R2/Supabase Storage uploads AND
--     embeds from YouTube/Vimeo/Mux without a table migration.
--   - quality_signals is a jsonb snapshot of the raw inputs the
--     scorer saw at the time — useful for audit when an advisor
--     disputes a lead quality band.

-- ── 1. Extend professionals ─────────────────────────────────────
ALTER TABLE IF EXISTS public.professionals
  ADD COLUMN IF NOT EXISTS intro_video_url text,
  ADD COLUMN IF NOT EXISTS intro_video_poster_url text,
  ADD COLUMN IF NOT EXISTS accepts_new_clients boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS response_time_hours numeric,
  ADD COLUMN IF NOT EXISTS booking_link text;

CREATE INDEX IF NOT EXISTS idx_professionals_accepting_search
  ON public.professionals (accepts_new_clients, rating DESC)
  WHERE status = 'active';

-- ── 2. advisor_booking_appointments ───────────────────────────────────
-- First-party booking slot inventory. An advisor (or admin on
-- their behalf) inserts rows for the time slots they want to
-- offer. When a reader books, the row flips status='taken' and
-- links to the professional_leads row so the advisor can see who
-- holds it.
CREATE TABLE IF NOT EXISTS public.advisor_booking_appointments (
  id                   bigserial PRIMARY KEY,
  professional_id      integer NOT NULL,
  starts_at            timestamptz NOT NULL,
  ends_at              timestamptz NOT NULL,
  duration_minutes     integer NOT NULL,
  status               text NOT NULL DEFAULT 'open', -- 'open' | 'taken' | 'cancelled'
  booked_by_email      text,
  booked_by_name       text,
  booked_at            timestamptz,
  lead_id              bigint,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_booking_appointments_available
  ON public.advisor_booking_appointments (professional_id, starts_at)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_advisor_booking_appointments_starts_at
  ON public.advisor_booking_appointments (starts_at);

ALTER TABLE public.advisor_booking_appointments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.advisor_booking_appointments
  DROP CONSTRAINT IF EXISTS advisor_booking_appointments_status_check;
ALTER TABLE public.advisor_booking_appointments
  ADD CONSTRAINT advisor_booking_appointments_status_check CHECK (
    status = ANY (ARRAY['open'::text, 'taken'::text, 'cancelled'::text])
  );

ALTER TABLE public.advisor_booking_appointments
  DROP CONSTRAINT IF EXISTS advisor_booking_appointments_duration_check;
ALTER TABLE public.advisor_booking_appointments
  ADD CONSTRAINT advisor_booking_appointments_duration_check CHECK (
    duration_minutes > 0 AND duration_minutes <= 240
  );

-- ── 3. Extend professional_leads with quality signals + band ───
ALTER TABLE IF EXISTS public.professional_leads
  ADD COLUMN IF NOT EXISTS quality_signals jsonb,
  ADD COLUMN IF NOT EXISTS quality_band text;

CREATE INDEX IF NOT EXISTS idx_professional_leads_quality_band
  ON public.professional_leads (quality_band, created_at DESC)
  WHERE quality_band IS NOT NULL;

ALTER TABLE public.professional_leads
  DROP CONSTRAINT IF EXISTS professional_leads_quality_band_check;
ALTER TABLE public.professional_leads
  ADD CONSTRAINT professional_leads_quality_band_check CHECK (
    quality_band IS NULL OR quality_band = ANY (ARRAY['cold'::text, 'warm'::text, 'hot'::text])
  );
