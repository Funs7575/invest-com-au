-- New placements for articles sidebar, deals page, and homepage comparison table
INSERT INTO marketplace_placements (slug, name, page, position, inventory_type, max_slots, base_rate_cents, description, is_active)
VALUES
  ('articles-sidebar', 'Article Pages — Sidebar Widget', '/article/*', 'sidebar', 'cpc', 1, 150, 'Contextual CPC placement alongside educational articles and guides. Shows a sponsored broker widget in the article sidebar.', true),
  ('deals-featured', 'Deals Page — Featured Deal', '/deals', 'top', 'featured', 2, 500, 'Premium visibility on the Deals & Promotions page. Featured deals appear at the top of the deals grid.', true),
  ('deals-cpc', 'Deals Page — CPC Clicks', '/deals', 'all', 'cpc', 10, 100, 'Pay-per-click placement on the Deals & Promotions page. Only charged when users click through to your site.', true)
ON CONFLICT (slug) DO NOTHING;
