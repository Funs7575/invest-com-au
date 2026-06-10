-- ============================================================================
-- Migration: 006_display_ad_placements.sql
-- Purpose: Seed seven display-ad marketplace_placements rows (sidebar,
--          in-content native, sticky footer, calculator results).
-- Rollback: DELETE the seven inserted slugs from marketplace_placements
--           (only if no campaigns reference them).
-- Risk: medium — reverse fails if downstream campaigns reference these
--       placements via FK.
-- ============================================================================
--
-- Forward operations:
--   1. INSERT INTO marketplace_placements (...) VALUES
--        ('display-sidebar-review', ...),
--        ('display-sidebar-compare', ...),
--        ('display-sidebar-calculator', ...),
--        ('display-incontent-article', ...),
--        ('display-incontent-review', ...),
--        ('display-sticky-footer', ...),
--        ('display-calculator-results', ...)
--      ON CONFLICT (slug) DO NOTHING;
--
-- Rollback (in reverse order):
--   1. DELETE FROM marketplace_placements
--      WHERE slug IN (
--        'display-calculator-results',
--        'display-sticky-footer',
--        'display-incontent-review',
--        'display-incontent-article',
--        'display-sidebar-calculator',
--        'display-sidebar-compare',
--        'display-sidebar-review'
--      );
--      -- Note: will fail if dependent campaigns/bookings reference these
--      -- slugs via FK. Operator must remove dependents first.
--

-- New display advertising placements for sidebar, in-content, and sticky positions
-- These extend the existing marketplace_placements table with display ad inventory
INSERT INTO marketplace_placements (slug, name, page, position, inventory_type, max_slots, base_rate_cents, description, is_active)
VALUES
  -- Sidebar display ads (desktop only, shown alongside content)
  ('display-sidebar-review', 'Broker Review — Sidebar Display', '/broker/*', 'sidebar-display', 'cpc', 1, 120, 'Display ad in the sidebar of broker review pages. Desktop only. High-intent readers comparing brokers.', true),
  ('display-sidebar-compare', 'Compare Page — Sidebar Display', '/compare', 'sidebar-display', 'cpc', 1, 150, 'Display ad in the sidebar of the comparison page. High-intent users actively comparing options.', true),
  ('display-sidebar-calculator', 'Calculator Page — Sidebar Display', '/calculators', 'sidebar-display', 'cpc', 1, 130, 'Display ad alongside calculator tools. Users actively researching fees and costs.', true),

  -- In-content native ads (between content sections)
  ('display-incontent-article', 'Article — In-Content Display', '/article/*', 'in-content', 'cpc', 1, 100, 'Native display ad placed between article sections. Blends with editorial content.', true),
  ('display-incontent-review', 'Broker Review — In-Content Display', '/broker/*', 'in-content', 'cpc', 1, 110, 'Native display ad placed between broker review sections.', true),

  -- Sticky footer banner (all pages, high visibility)
  ('display-sticky-footer', 'Sticky Footer Banner', '/*', 'sticky-footer', 'cpc', 1, 80, 'Sticky banner at the bottom of the viewport. Shown across all content pages. Dismissible by users.', true),

  -- Calculator results page (highest intent)
  ('display-calculator-results', 'Calculator Results — Display', '/calculators', 'results', 'cpc', 1, 180, 'Display ad shown alongside calculator results. Highest conversion intent — users just calculated their costs.', true)
ON CONFLICT (slug) DO NOTHING;
