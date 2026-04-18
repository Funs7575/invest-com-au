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
