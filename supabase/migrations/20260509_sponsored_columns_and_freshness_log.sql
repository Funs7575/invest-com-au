-- ============================================================
-- Pre-launch round 2:
--   * Add sponsored / sponsored_tier / sponsored_until to brokers
--     (in addition to the existing sponsorship_tier / sponsorship_end
--     columns, which stay in place for backwards compatibility).
--   * Create content_freshness_log for audit-trail separate from
--     the content_calendar queue.
--
-- Date: 2026-05-09
-- Audit ref: codebase-health-2026-04-24.md §4.3 (G-03)
-- Queue item: G-03 batch 8
-- Why: adds three brokers columns needed by the sponsored-placement
--      codebase path (lib/sponsorship.ts reads sponsored/sponsored_tier/
--      sponsored_until) and creates content_freshness_log for the
--      editorial freshness audit trail.
-- Idempotency: ADD COLUMN IF NOT EXISTS;
--              CREATE TABLE/INDEX IF NOT EXISTS. Safe to re-apply.
-- Rollback:
--   DROP TABLE IF EXISTS public.content_freshness_log;
--   DROP INDEX IF EXISTS public.idx_brokers_sponsored;
--   ALTER TABLE public.brokers
--     DROP COLUMN IF EXISTS sponsored_until,
--     DROP COLUMN IF EXISTS sponsored_tier,
--     DROP COLUMN IF EXISTS sponsored;
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- brokers sponsored columns (per master spec Phase 3A schema)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS sponsored BOOLEAN DEFAULT false;

ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS sponsored_tier TEXT;

ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_brokers_sponsored
  ON public.brokers (sponsored, sponsored_until)
  WHERE sponsored = true;

-- ────────────────────────────────────────────────────────────
-- content_freshness_log — audit trail of freshness flags.
-- The content-freshness cron queues refresh work in
-- content_calendar. This table stores the historical record of
-- every flag, separate from the active work queue.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_freshness_log (
  id          SERIAL PRIMARY KEY,
  article_id  INTEGER REFERENCES public.articles(id) ON DELETE CASCADE,
  flagged_at  TIMESTAMPTZ DEFAULT NOW(),
  reason      TEXT,
  resolved    BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_content_freshness_log_article
  ON public.content_freshness_log (article_id);
CREATE INDEX IF NOT EXISTS idx_content_freshness_log_unresolved
  ON public.content_freshness_log (flagged_at DESC)
  WHERE resolved = false;
