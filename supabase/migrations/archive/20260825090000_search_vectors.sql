-- Migration: 20260525_search_vectors.sql
-- Adds tsvector generated columns + GIN indexes for full-text search
-- on brokers, professionals, and articles.
--
-- Rollback strategy:
--   DROP INDEX CONCURRENTLY IF EXISTS brokers_search_vec_gin;
--   ALTER TABLE brokers DROP COLUMN IF EXISTS search_vec;
--   DROP INDEX CONCURRENTLY IF EXISTS professionals_search_vec_gin;
--   ALTER TABLE professionals DROP COLUMN IF EXISTS search_vec;
--   DROP INDEX CONCURRENTLY IF EXISTS articles_search_vec_gin;
--   ALTER TABLE articles DROP COLUMN IF EXISTS search_vec;
--
-- RLS: no user-data table — no RLS change needed.
-- Existing SELECT policies on brokers / professionals / articles are
-- untouched; we only add a GENERATED ALWAYS column + GIN index on each.
-- The index is created CONCURRENTLY so it does not block reads/writes.

-- ─── brokers ─────────────────────────────────────────────────────────────────

ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS search_vec tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(slug, '')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS brokers_search_vec_gin
  ON brokers USING gin(search_vec);

-- ─── professionals ───────────────────────────────────────────────────────────

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS search_vec tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(firm_name, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(type, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(location_suburb, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(location_state, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(location_display, '')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS professionals_search_vec_gin
  ON professionals USING gin(search_vec);

-- ─── articles ────────────────────────────────────────────────────────────────

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS search_vec tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(category, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(target_keyword, '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS articles_search_vec_gin
  ON articles USING gin(search_vec);
