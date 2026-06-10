-- ============================================================================
-- Migration: 20260503_seed_oil_gas_price_snapshots.sql
-- Purpose: Seed three editorial commodity_price_snapshots rows (Brent,
--          WTI, JKM) so the /invest/oil-gas OilGasPriceWidget has data
--          to render before any live feed is wired up.
-- Rollback: DELETE the three seeded rows by (entity_kind, entity_ref,
--          captured_at). Reverse only removes the seed; any later
--          editorial snapshot for the same entity_ref is preserved.
-- Risk: medium — reverse may fail if downstream rows reference these
--       snapshot ids via FK (none currently — this is the only writer
--       of commodity_price_snapshots), and the original prices cannot
--       be reconstructed from the table's history once deleted.
-- ============================================================================
--
-- Forward operations:
--   1. INSERT INTO public.commodity_price_snapshots (
--        entity_kind, entity_ref, sector_slug,
--        captured_at, price_minor_units, currency, source
--      ) VALUES
--        ('spot','brent-crude','oil-gas','2026-04-15 00:00:00+00',8420,'USD','editorial'),
--        ('spot','wti-crude',  'oil-gas','2026-04-15 00:00:00+00',8075,'USD','editorial'),
--        ('spot','jkm-lng',    'oil-gas','2026-04-15 00:00:00+00',1385,'USD','editorial')
--      ON CONFLICT DO NOTHING.
--
-- Rollback (in reverse order):
--   1. DELETE FROM public.commodity_price_snapshots
--      WHERE source = 'editorial'
--        AND captured_at = '2026-04-15 00:00:00+00'
--        AND entity_ref IN ('brent-crude','wti-crude','jkm-lng');
--      -- Note: the widget will render empty for these refs until a
--      -- newer snapshot exists. Operator should confirm a follow-up
--      -- seed or live feed is in place before reverting.
-- ============================================================================
--
-- ============================================================
-- Seed editorial price snapshots for Brent, WTI, and JKM.
-- These are manually-reviewed editorial snapshots rather than a
-- live price feed — the admin/commodity-hubs UI can update them
-- without redeploying. The /invest/oil-gas OilGasPriceWidget reads
-- the most recent row per ref and renders it with the captured_at
-- date visible.
--
-- This migration inserts one snapshot per ref. If a later row
-- exists with a more recent captured_at, the widget will prefer
-- that one. Re-running this migration re-seeds the initial set
-- without affecting newer data.
-- ============================================================

INSERT INTO public.commodity_price_snapshots (
  entity_kind, entity_ref, sector_slug,
  captured_at, price_minor_units, currency, source
) VALUES
-- Brent crude spot — USD per barrel, price_minor_units in cents
('spot', 'brent-crude', 'oil-gas',
 '2026-04-15 00:00:00+00', 8420, 'USD', 'editorial'),
-- WTI crude spot — USD per barrel
('spot', 'wti-crude', 'oil-gas',
 '2026-04-15 00:00:00+00', 8075, 'USD', 'editorial'),
-- JKM LNG — USD per mmBTU (scaled by 100 to keep in minor units)
('spot', 'jkm-lng', 'oil-gas',
 '2026-04-15 00:00:00+00', 1385, 'USD', 'editorial')
ON CONFLICT DO NOTHING;
