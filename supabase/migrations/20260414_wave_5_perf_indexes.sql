-- Wave 5: DB indexes on observed hot query paths.
--
-- These target the N+1 / full-scan patterns found by inspecting
-- the query planner + grepping the codebase. All IF NOT EXISTS so
-- re-runs are safe.

-- ── affiliate_clicks: recency + session lookups ───────────────────
-- Admin dashboards scan the last 7/30 days. Existing index is on
-- broker_slug only.
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked
  ON public.affiliate_clicks (clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_broker_clicked
  ON public.affiliate_clicks (broker_slug, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_session
  ON public.affiliate_clicks (session_id);

-- ── allocation_decisions: 2942 rows, zero non-PK indexes ─────────
-- Hot queries: by placement and by decision time.
CREATE INDEX IF NOT EXISTS idx_allocation_decisions_created
  ON public.allocation_decisions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_allocation_decisions_placement
  ON public.allocation_decisions (placement_slug, created_at DESC);

-- ── analytics_events: event_type + created_at composite ──────────
-- The admin analytics dashboard filters by event_type AND date
-- range. A composite index avoids two separate index scans.
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON public.analytics_events (event_type, created_at DESC);

-- ── conversion_events: broker/campaign by date ────────────────────
CREATE INDEX IF NOT EXISTS idx_conversion_events_created
  ON public.conversion_events (created_at DESC);

-- ── lead_disputes: status + created_at composite ─────────────────
-- The dispute auto-resolver reads pending rows ordered by age.
-- Status-only index forces a sort; composite does not.
CREATE INDEX IF NOT EXISTS idx_lead_disputes_status_created
  ON public.lead_disputes (status, created_at DESC);

-- ── professional_leads: composite for advisor dashboards ─────────
-- Advisors list their leads filtered by status and sorted by
-- creation time. A (professional_id, status, created_at) index
-- serves the common "my new leads" query in one scan.
CREATE INDEX IF NOT EXISTS idx_professional_leads_composite
  ON public.professional_leads (professional_id, status, created_at DESC);
-- Unresponded lookup (SLA enforcement cron)
CREATE INDEX IF NOT EXISTS idx_professional_leads_unresponded
  ON public.professional_leads (professional_id, created_at DESC)
  WHERE responded_at IS NULL;

-- ── user_reviews: status + broker composite ──────────────────────
-- Broker review pages filter by broker_id AND status='published'.
-- The existing broker_id index still scans rejected reviews; a
-- composite partial index drops that work entirely.
CREATE INDEX IF NOT EXISTS idx_user_reviews_broker_published
  ON public.user_reviews (broker_id, created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_professional_reviews_prof_published
  ON public.professional_reviews (professional_id, created_at DESC)
  WHERE status = 'published';

-- ── advisor_profile_views: stats-by-prof lookups ─────────────────
-- The monthly advisor report cron aggregates views per professional
-- over a window. Composite (professional_id, view_date) covers it.
CREATE INDEX IF NOT EXISTS idx_advisor_profile_views_prof_date
  ON public.advisor_profile_views (professional_id, view_date DESC);

-- ── broker_answers: by question for Q&A pages ───────────────────
-- Broker Q&A pages render the answers under each question. The
-- existing broker_answers_question index is present but a partial
-- on "visible" answers only is faster for public pages.
-- Falling back to the regular index where 'is_visible' is absent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_answers' AND column_name='is_visible') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_broker_answers_visible
      ON public.broker_answers (question_id, created_at DESC)
      WHERE is_visible = true';
  END IF;
END $$;
