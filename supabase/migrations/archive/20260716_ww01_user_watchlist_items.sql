-- =============================================================================
-- Migration: WW-01 — user_watchlist_items data model
-- Date:       2026-07-16
-- Audit ref:  docs/audits/REMEDIATION_QUEUE.md § "Stream WW — Watchlist / portfolio tracker"
-- Queue item: WW-01
--
-- Why: No watchlist table existed. Users have been able to save comparisons
--   (anonymous_saves) but not a persistent, named watchlist of tickers/slugs
--   they want to monitor. This table provides the Supabase-backed, user-scoped
--   watchlist foundation for WW-02 (UI) and WW-03 (price alerts).
--
-- Design decisions:
--   - Tracks any "investable" item: ASX stock, ETF, broker, managed fund.
--   - item_type + item_slug uniquely identifies a watchable entity. display_name
--     is denormalised for fast rendering without cross-table joins.
--   - Soft-limit enforced at the API layer (not DB) — no hard row cap here so
--     premium tiers can remove the limit without a schema change.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + IF NOT EXISTS on indexes.
--   ENABLE/FORCE ROW LEVEL SECURITY is idempotent. DROP POLICY IF EXISTS
--   before each CREATE POLICY. Safe to re-run.
--
-- Rollback:
--   BEGIN;
--     DROP POLICY IF EXISTS "users can manage own watchlist" ON public.user_watchlist_items;
--     DROP POLICY IF EXISTS "service_role full access"       ON public.user_watchlist_items;
--     ALTER TABLE public.user_watchlist_items DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.user_watchlist_items; -- only on a clean rebuild
--   COMMIT;
--
-- IMPORTANT — prior policy state: no prior CREATE POLICY on user_watchlist_items
--   in any migration (table did not exist). Confirmed via grep.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_watchlist_items (
  id           bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- Type of the watchable item. Validated at API layer; kept as text for flexibility.
  -- Known values: 'stock', 'etf', 'broker', 'fund', 'crypto'
  item_type    text         NOT NULL,
  -- Slug or ticker identifying the item within item_type namespace.
  -- e.g. 'vgs' for an ETF, 'commsec' for a broker, 'BHP.AX' for a stock.
  item_slug    text         NOT NULL,
  -- Denormalised display name for fast rendering. Callers should update on rename.
  display_name text,
  added_at     timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_watchlist_item UNIQUE (user_id, item_type, item_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_watchlist_items_user
  ON public.user_watchlist_items (user_id);

CREATE INDEX IF NOT EXISTS idx_user_watchlist_items_lookup
  ON public.user_watchlist_items (user_id, item_type, item_slug);

ALTER TABLE public.user_watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlist_items FORCE  ROW LEVEL SECURITY;

-- Users can fully manage their own watchlist items; other users' rows are invisible.
DROP POLICY IF EXISTS "users can manage own watchlist" ON public.user_watchlist_items;
CREATE POLICY "users can manage own watchlist"
  ON public.user_watchlist_items
  FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service-role full access for admin/cron (e.g. price-alert cron reads all rows).
DROP POLICY IF EXISTS "service_role full access" ON public.user_watchlist_items;
CREATE POLICY "service_role full access"
  ON public.user_watchlist_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
