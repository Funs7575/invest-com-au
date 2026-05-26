-- PR 9.1: Unified social feed — feed_events materialized stream.
--
-- Aggregates events from rate_change_log, advisor_posts, forum_threads,
-- articles, and broker deals into a single pageable feed table.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.feed_events;

CREATE TABLE IF NOT EXISTS public.feed_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   text        NOT NULL
                           CHECK (event_type IN (
                             'rate_change', 'advisor_post',
                             'community_thread', 'article', 'deal'
                           )),
  ref_id       text        NOT NULL,
  headline     text        NOT NULL,
  summary      text,
  actor_name   text,
  actor_slug   text,
  entity_slug  text,
  image_url    text,
  score_base   numeric(6,2) NOT NULL DEFAULT 50,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, ref_id)
);

ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "feed_events_public_read"
  ON public.feed_events FOR SELECT
  USING (true);

CREATE POLICY "feed_events_service_role_write"
  ON public.feed_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS feed_events_published_at_idx
  ON public.feed_events (published_at DESC);

CREATE INDEX IF NOT EXISTS feed_events_type_published_idx
  ON public.feed_events (event_type, published_at DESC);

-- ── Seed from rate_change_log ─────────────────────────────────────────────────

INSERT INTO public.feed_events
  (event_type, ref_id, headline, actor_name, actor_slug, entity_slug, score_base, published_at)
SELECT
  'rate_change',
  id::text,
  CASE direction
    WHEN 'up'   THEN broker_name || ' raised their ' || product_kind || ' rate by ' ||
                     delta_bps || ' bps'
    WHEN 'down' THEN broker_name || ' cut their ' || product_kind || ' rate by ' ||
                     abs(delta_bps) || ' bps'
    ELSE             broker_name || ' added a new ' || product_kind || ' rate'
  END,
  broker_name,
  broker_slug,
  broker_slug,
  CASE direction WHEN 'up' THEN 70 WHEN 'new' THEN 65 ELSE 55 END,
  logged_at
FROM public.rate_change_log
ON CONFLICT (event_type, ref_id) DO NOTHING;

-- ── Seed from advisor_posts ───────────────────────────────────────────────────

INSERT INTO public.feed_events
  (event_type, ref_id, headline, summary, actor_name, actor_slug, entity_slug, score_base, published_at)
SELECT
  'advisor_post',
  p.id::text,
  pro.name || ': ' || left(p.body, 120),
  CASE WHEN length(p.body) > 120 THEN p.body ELSE NULL END,
  pro.name,
  pro.slug,
  pro.slug,
  55,
  p.created_at
FROM public.advisor_posts p
JOIN public.professionals pro ON pro.id = p.professional_id
WHERE p.status = 'published'
ON CONFLICT (event_type, ref_id) DO NOTHING;

-- ── Seed from forum_threads ───────────────────────────────────────────────────

INSERT INTO public.feed_events
  (event_type, ref_id, headline, actor_name, entity_slug, score_base, published_at)
SELECT
  'community_thread',
  t.id::text,
  t.title,
  COALESCE(t.author_name, 'Community'),
  c.slug || '/' || t.slug,
  55,
  t.created_at
FROM public.forum_threads t
JOIN public.forum_categories c ON c.id = t.category_id
WHERE t.is_removed = false
ON CONFLICT (event_type, ref_id) DO NOTHING;

-- ── Seed from articles ────────────────────────────────────────────────────────

INSERT INTO public.feed_events
  (event_type, ref_id, headline, entity_slug, score_base, published_at)
SELECT
  'article',
  id::text,
  title,
  slug,
  60,
  COALESCE(published_at, created_at)
FROM public.articles
WHERE published_at IS NOT NULL
ON CONFLICT (event_type, ref_id) DO NOTHING;
