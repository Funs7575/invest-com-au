-- ============================================================================
-- Migration: 20260503_seed_collectibles_listings.sql
-- Date:      2026-05-03
-- Purpose:   Seed 60 collectibles listings into public.investment_listings so
--            the /invest/alternatives sub-category pages (cars, watches, wine,
--            whisky, art, sports_memorabilia) render real content instead of
--            empty states. Listings cover the six discriminator values used
--            by lib/listing-url.ts FUND_SUB_TO_CATEGORY plus the new
--            sports_memorabilia bucket. All rows use vertical='fund' (the
--            existing alternatives storage model — see
--            20260402_investment_listings.sql) and industry='collectibles'.
-- ----------------------------------------------------------------------------
-- Storage model:
--   investment_listings is a single table keyed by SERIAL `id` with a UNIQUE
--   `slug`. Alternatives listings live under vertical='fund' distinguished by
--   `sub_category` (see app/invest/alternatives/listings/[slug]/page.tsx and
--   lib/investment-listings-query.ts ALTERNATIVES_SUB_CATEGORIES). This
--   migration only INSERTs rows; no schema changes.
--
--   Pricing is stored in `asking_price_cents` (BIGINT cents) with a
--   human-readable `price_display` mirror. Asset-class specific metadata
--   (year, reference, vintage, distillery, artist, …) is stored in
--   `key_metrics` JSONB so the detail page's "Key Metrics" panel can render
--   the relevant fields without per-asset-class columns.
--
--   `images` is intentionally left at the column default (empty TEXT[])
--   because image curation/licensing for collectibles is a separate task —
--   the detail page's ListingImageGallery falls back to a category
--   placeholder when `images` is empty.
-- ----------------------------------------------------------------------------
-- Idempotency:
--   * INSERT ... ON CONFLICT (slug) DO NOTHING — safe to re-run. The slug
--     UNIQUE index was created in 20260402_investment_listings.sql.
--   * No DDL — only data inserts.
-- ----------------------------------------------------------------------------
-- Rollback (operator-driven, forward-only in production):
--   DELETE FROM public.investment_listings WHERE slug IN (
--     -- cars (12)
--     'classic-car-1971-ford-falcon-gtho-phase-iii',
--     'classic-car-1977-holden-torana-a9x',
--     'classic-car-1969-holden-monaro-hk-gts-327',
--     'classic-car-1979-ferrari-308-gtb',
--     'classic-car-1987-porsche-911-carrera-3-2',
--     'classic-car-1969-mercedes-280sl-pagoda',
--     'classic-car-1972-bmw-3-0-csl',
--     'classic-car-1962-jaguar-e-type-series-1',
--     'classic-car-1965-ford-mustang-fastback',
--     'classic-car-1967-shelby-gt350',
--     'classic-car-1989-porsche-944-turbo-s',
--     'classic-car-1973-holden-hq-gts-monaro',
--     -- watches (12)
--     'watch-rolex-daytona-116500ln',
--     'watch-rolex-submariner-14060m',
--     'watch-rolex-gmt-master-ii-pepsi-126710blro',
--     'watch-patek-philippe-nautilus-5711-1a',
--     'watch-patek-philippe-aquanaut-5167a',
--     'watch-audemars-piguet-royal-oak-15202',
--     'watch-vacheron-constantin-overseas-4500v',
--     'watch-jaeger-lecoultre-reverso-classic',
--     'watch-omega-speedmaster-moonwatch-3861',
--     'watch-a-lange-sohne-lange-1',
--     'watch-fp-journe-chronometre-souverain',
--     'watch-richard-mille-rm-011-felipe-massa',
--     -- wine (10)
--     'wine-penfolds-grange-2010-case-of-12',
--     'wine-penfolds-grange-1990-single-bottle',
--     'wine-henschke-hill-of-grace-2010',
--     'wine-torbreck-runrig-2018',
--     'wine-clarendon-hills-astralis-2015',
--     'wine-standish-the-lamella-2018',
--     'wine-chris-ringland-three-rivers-shiraz-2010',
--     'wine-kalleske-johann-georg-2018',
--     'wine-penfolds-st-henri-2018-case-of-12',
--     'wine-wendouree-shiraz-2010-case-of-12',
--     -- whisky (10)
--     'whisky-macallan-25-year-old-sherry-oak',
--     'whisky-macallan-edition-no-6',
--     'whisky-dalmore-21-year-old',
--     'whisky-yamazaki-18-year-old',
--     'whisky-sullivans-cove-french-oak-single-cask',
--     'whisky-sullivans-cove-american-oak-hh0617',
--     'whisky-starward-solera-cask',
--     'whisky-glenfiddich-30-year-old',
--     'whisky-scotch-single-cask-12yo-cask-investment',
--     'whisky-australian-peated-single-cask-investment',
--     -- art (10)
--     'art-brett-whiteley-bondi-study',
--     'art-sidney-nolan-ned-kelly-series-work',
--     'art-arthur-boyd-bride-series-work',
--     'art-john-olsen-contemporary-landscape',
--     'art-emily-kame-kngwarreye-utopia-work',
--     'art-rover-thomas-kimberley-country',
--     'art-margaret-olley-still-life-with-flowers',
--     'art-jeffrey-smart-geometric-cityscape',
--     'art-tim-storrier-australian-landscape',
--     'art-contemporary-emerging-artist-piece',
--     -- sports_memorabilia (6)
--     'sports-don-bradman-signed-cricket-bat',
--     'sports-2019-tim-paine-test-worn-baggy-green',
--     'sports-2019-richmond-afl-premiership-guernsey',
--     'sports-state-of-origin-match-worn-jersey',
--     'sports-adam-goodes-2003-rookie-card-psa',
--     'sports-liz-cambage-signed-olympic-basketball'
--   );
-- ----------------------------------------------------------------------------
-- Risk: low — pure additive data seed against an existing table; no schema
--   changes; idempotent via ON CONFLICT (slug). Worst case if seeded into
--   an environment that already has user-submitted collectibles listings:
--   the DO NOTHING clause silently skips any slug collision.
--
--   Caveat for reviewers: as of this migration, lib/listing-url.ts
--   FUND_SUB_TO_CATEGORY and lib/investment-listings-query.ts
--   ALTERNATIVES_SUB_CATEGORIES do NOT include 'sports_memorabilia'. The
--   six sports memorabilia rows seeded here will be invisible to
--   /invest/alternatives until those constants are widened (separate PR).
--   The other 54 rows render immediately.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- CARS (12) — sub_category='cars'
-- Mix of Australian muscle, European classics, American muscle, and
-- entry-level appreciating models. Pricing in AUD reflects auction
-- comparables (Lloyds, Shannons, Bonhams Australia) at 2026-05.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, sub_category, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, key_metrics, status
) VALUES
(
  'fund', 'cars',
  '1971 Ford Falcon GTHO Phase III — Matching Numbers',
  'classic-car-1971-ford-falcon-gtho-phase-iii',
  'Holy-grail Australian muscle car. Matching numbers GTHO Phase III in original Track Red with full provenance and build documentation. One of fewer than 300 produced. Among the most collectible Australian cars ever built.',
  'NSW', 'Sydney',
  80000000000, '$800,000 AUD',
  'collectibles',
  '{"year": 1971, "make": "Ford", "model": "Falcon GTHO Phase III", "matching_numbers": true, "transmission": "4-speed manual", "engine": "351 Cleveland V8", "colour": "Track Red", "production_total": "<300", "provenance": "full build sheet and ownership history"}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1977 Holden Torana A9X Hatchback — Bathurst-spec',
  'classic-car-1977-holden-torana-a9x',
  'Iconic Australian muscle. Genuine A9X hatchback, Bathurst-spec L34 mechanicals, original colour combination. Recently mechanically restored, books and history file present.',
  'VIC', 'Melbourne',
  55000000000, '$550,000 AUD',
  'collectibles',
  '{"year": 1977, "make": "Holden", "model": "Torana A9X Hatchback", "matching_numbers": true, "engine": "5.0L V8", "transmission": "4-speed manual", "colour": "Mandarin Red", "documentation": "books and history file"}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1969 Holden Monaro HK GTS 327 — Restored',
  'classic-car-1969-holden-monaro-hk-gts-327',
  'Concours-restored HK Monaro GTS 327, the model that won the inaugural Bathurst 500. Numbers-matching 327ci Chevrolet V8, four-speed manual, Warwick Yellow.',
  'QLD', 'Brisbane',
  40000000000, '$400,000 AUD',
  'collectibles',
  '{"year": 1969, "make": "Holden", "model": "Monaro HK GTS 327", "matching_numbers": true, "engine": "327ci Chevrolet V8", "transmission": "4-speed manual", "colour": "Warwick Yellow", "restoration": "concours"}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1979 Ferrari 308 GTB — Carburettor Steel-bodied',
  'classic-car-1979-ferrari-308-gtb',
  'Steel-bodied carburettor 308 GTB in classic Rosso Corsa over tan. Matching numbers, recent major service including timing belts. Clean Australian-delivered example.',
  'NSW', 'Sydney',
  15000000000, '$150,000 AUD',
  'collectibles',
  '{"year": 1979, "make": "Ferrari", "model": "308 GTB", "matching_numbers": true, "engine": "2.9L V8", "fuel_system": "carburettor", "body": "steel", "colour": "Rosso Corsa over tan", "service": "recent major incl. timing belts"}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1987 Porsche 911 Carrera 3.2 — G-body Coupe',
  'classic-car-1987-porsche-911-carrera-3-2',
  'Investment-grade G-body 911 Carrera 3.2 with the desirable G50 gearbox. Guards Red over black leather, full service history, no accident damage. The last of the air-cooled 911s before the 964.',
  'VIC', 'Melbourne',
  12000000000, '$120,000 AUD',
  'collectibles',
  '{"year": 1987, "make": "Porsche", "model": "911 Carrera 3.2", "engine": "3.2L flat-six", "transmission": "G50 5-speed manual", "colour": "Guards Red", "interior": "black leather", "service_history": "full"}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1969 Mercedes-Benz 280SL Pagoda — Restored',
  'classic-car-1969-mercedes-280sl-pagoda',
  'Beautifully restored W113 Pagoda with both hard and soft tops. Silver over black, automatic, factory air conditioning. Matching numbers and full restoration documentation.',
  'NSW', 'Sydney',
  18000000000, '$180,000 AUD',
  'collectibles',
  '{"year": 1969, "make": "Mercedes-Benz", "model": "280SL Pagoda (W113)", "matching_numbers": true, "engine": "2.8L inline-six", "transmission": "automatic", "tops": "hard and soft", "colour": "Silver"}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1972 BMW 3.0 CSL — Lightweight Coupe',
  'classic-car-1972-bmw-3-0-csl',
  'European-delivered E9 3.0 CSL "Batmobile" predecessor in Polaris Silver. Original lightweight specification with thin-gauge body panels and Scheel buckets. Recent body and mechanical restoration.',
  'VIC', 'Melbourne',
  35000000000, '$350,000 AUD',
  'collectibles',
  '{"year": 1972, "make": "BMW", "model": "3.0 CSL", "engine": "3.0L inline-six", "transmission": "4-speed manual", "spec": "lightweight", "colour": "Polaris Silver", "restoration": "recent body and mechanical"}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1962 Jaguar E-Type Series 1 3.8 Roadster',
  'classic-car-1962-jaguar-e-type-series-1',
  'Series 1 3.8L E-Type Roadster, the Enzo-Ferrari-anointed "most beautiful car ever made." Opalescent Dark Blue over biscuit, original 3.8L XK engine, restored by a marque specialist.',
  'NSW', 'Sydney',
  22000000000, '$220,000 AUD',
  'collectibles',
  '{"year": 1962, "make": "Jaguar", "model": "E-Type Series 1 3.8 Roadster", "engine": "3.8L XK inline-six", "transmission": "4-speed manual", "colour": "Opalescent Dark Blue", "interior": "biscuit", "matching_numbers": true}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1965 Ford Mustang Fastback 289 V8',
  'classic-car-1965-ford-mustang-fastback',
  'First-generation Mustang Fastback with 289ci V8, four-speed manual, Wimbledon White over red interior. A-code car with restoration in the past five years.',
  'QLD', 'Gold Coast',
  9000000000, '$90,000 AUD',
  'collectibles',
  '{"year": 1965, "make": "Ford", "model": "Mustang Fastback", "engine": "289ci V8", "code": "A-code", "transmission": "4-speed manual", "colour": "Wimbledon White", "interior": "red"}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1967 Shelby GT350 — SAAC-Documented',
  'classic-car-1967-shelby-gt350',
  'SAAC-registry-documented 1967 Shelby GT350 in Lime Gold. Matching numbers, original interior, recent rotisserie restoration. The first year of the larger second-generation GT350.',
  'NSW', 'Sydney',
  38000000000, '$380,000 AUD',
  'collectibles',
  '{"year": 1967, "make": "Shelby", "model": "GT350", "matching_numbers": true, "engine": "289ci K-code V8", "colour": "Lime Gold", "saac_documented": true, "restoration": "rotisserie"}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1989 Porsche 944 Turbo S — 250 hp Special',
  'classic-car-1989-porsche-944-turbo-s',
  'Final-year 944 Turbo S, the rare 250hp variant with M030 suspension. Silver Rose over Burgundy, 110,000 km, full service history. An entry-level appreciating Porsche increasingly recognised by collectors.',
  'WA', 'Perth',
  8500000000, '$85,000 AUD',
  'collectibles',
  '{"year": 1989, "make": "Porsche", "model": "944 Turbo S", "engine": "2.5L turbo flat-four", "power_kw": 184, "transmission": "5-speed manual", "colour": "Silver Rose", "kilometres": 110000}'::jsonb,
  'active'
),
(
  'fund', 'cars',
  '1973 Holden HQ GTS Monaro — 350 V8',
  'classic-car-1973-holden-hq-gts-monaro',
  'HQ GTS Monaro Coupe with optional Chevrolet 350ci V8 and four-speed manual. Restored two years ago, Infra Red over black trim. Strong appreciation trajectory among Australian-muscle entry points.',
  'SA', 'Adelaide',
  12000000000, '$120,000 AUD',
  'collectibles',
  '{"year": 1973, "make": "Holden", "model": "HQ GTS Monaro Coupe", "engine": "350ci Chevrolet V8", "transmission": "4-speed manual", "colour": "Infra Red", "restoration_year": 2024}'::jsonb,
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- WATCHES (12) — sub_category='watches'
-- Pricing reflects 2026-05 AUD secondary-market levels for full-set
-- (box & papers) examples.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, sub_category, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, key_metrics, status
) VALUES
(
  'fund', 'watches',
  'Rolex Daytona 116500LN — Black Dial, Full Set',
  'watch-rolex-daytona-116500ln',
  'Discontinued ceramic-bezel Daytona in steel with black dial. Full set with box, papers and original receipt. Unworn condition with stickers, 2022 production.',
  'NSW', 'Sydney',
  6800000000, '$68,000 AUD',
  'collectibles',
  '{"brand": "Rolex", "model": "Daytona", "reference": "116500LN", "dial": "black", "year": 2022, "box_papers": true, "condition": "unworn"}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'Rolex Submariner 14060M — Four-Liner Final Production',
  'watch-rolex-submariner-14060m',
  'No-date Submariner 14060M four-liner from final production run, the last non-ceramic Submariner. Excellent condition, full set with original 2010 papers.',
  'VIC', 'Melbourne',
  2200000000, '$22,000 AUD',
  'collectibles',
  '{"brand": "Rolex", "model": "Submariner (no-date)", "reference": "14060M", "dial": "four-liner", "year": 2010, "box_papers": true}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'Rolex GMT-Master II "Pepsi" 126710BLRO — Discontinued',
  'watch-rolex-gmt-master-ii-pepsi-126710blro',
  'Discontinued steel "Pepsi" GMT-Master II on Jubilee bracelet. Full set with stickers, 2023 card. The reference replaced by 126710BLRO with new movement in 2024.',
  'QLD', 'Brisbane',
  3200000000, '$32,000 AUD',
  'collectibles',
  '{"brand": "Rolex", "model": "GMT-Master II Pepsi", "reference": "126710BLRO", "bracelet": "Jubilee", "year": 2023, "box_papers": true, "discontinued": true}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'Patek Philippe Nautilus 5711/1A — Blue Dial',
  'watch-patek-philippe-nautilus-5711-1a',
  'Discontinued blue-dial Nautilus 5711/1A-010 in steel. Full set with extract from the archives, 2021 production. The most collectible modern Patek reference.',
  'NSW', 'Sydney',
  21000000000, '$210,000 AUD',
  'collectibles',
  '{"brand": "Patek Philippe", "model": "Nautilus", "reference": "5711/1A-010", "dial": "blue", "year": 2021, "box_papers": true, "extract_from_archives": true, "discontinued": true}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'Patek Philippe Aquanaut 5167A — Black Dial',
  'watch-patek-philippe-aquanaut-5167a',
  'Steel Aquanaut 5167A-001 with black embossed dial and rubber strap. Full set, 2020 production, unworn with stickers.',
  'VIC', 'Melbourne',
  9500000000, '$95,000 AUD',
  'collectibles',
  '{"brand": "Patek Philippe", "model": "Aquanaut", "reference": "5167A-001", "dial": "black embossed", "year": 2020, "box_papers": true, "condition": "unworn"}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'Audemars Piguet Royal Oak 15202ST — "Jumbo" Extra-Thin',
  'watch-audemars-piguet-royal-oak-15202',
  'Discontinued Royal Oak "Jumbo" Extra-Thin 15202ST in steel with blue Petite Tapisserie dial. Full set, 2021 card. Replaced by reference 16202ST in 2022.',
  'NSW', 'Sydney',
  15500000000, '$155,000 AUD',
  'collectibles',
  '{"brand": "Audemars Piguet", "model": "Royal Oak Jumbo Extra-Thin", "reference": "15202ST", "dial": "blue Petite Tapisserie", "year": 2021, "box_papers": true, "discontinued": true}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'Vacheron Constantin Overseas 4500V — Blue Dial',
  'watch-vacheron-constantin-overseas-4500v',
  'Overseas Self-Winding 4500V/110A-B128 in steel with blue dial. Full set including all three interchangeable straps (steel, leather, rubber). 2022 production.',
  'VIC', 'Melbourne',
  3800000000, '$38,000 AUD',
  'collectibles',
  '{"brand": "Vacheron Constantin", "model": "Overseas Self-Winding", "reference": "4500V/110A-B128", "dial": "blue", "year": 2022, "box_papers": true, "interchangeable_straps": true}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'Jaeger-LeCoultre Reverso Classic Medium Duoface',
  'watch-jaeger-lecoultre-reverso-classic',
  'Reverso Classic Medium Duoface Small Seconds, ref. Q3848420. Steel case, dual-time function, full set with 2021 papers.',
  'NSW', 'Sydney',
  1400000000, '$14,000 AUD',
  'collectibles',
  '{"brand": "Jaeger-LeCoultre", "model": "Reverso Classic Medium Duoface", "reference": "Q3848420", "year": 2021, "box_papers": true, "complication": "dual time"}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'Omega Speedmaster Moonwatch Professional 310.30.42.50.01.001',
  'watch-omega-speedmaster-moonwatch-3861',
  'Current-production Moonwatch Professional with calibre 3861, Hesalite crystal and stepped caseback. Full set, unworn with stickers.',
  'QLD', 'Brisbane',
  1200000000, '$12,000 AUD',
  'collectibles',
  '{"brand": "Omega", "model": "Speedmaster Moonwatch Professional", "reference": "310.30.42.50.01.001", "calibre": "3861", "crystal": "Hesalite", "year": 2024, "box_papers": true, "condition": "unworn"}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'A. Lange & Söhne Lange 1 — White Gold',
  'watch-a-lange-sohne-lange-1',
  'Lange 1 in white gold with silver dial, ref. 191.039. Full set with original certificate and outer presentation box. 2019 production, mint condition.',
  'NSW', 'Sydney',
  6800000000, '$68,000 AUD',
  'collectibles',
  '{"brand": "A. Lange & Söhne", "model": "Lange 1", "reference": "191.039", "case_material": "white gold", "dial": "silver", "year": 2019, "box_papers": true}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'F.P. Journe Chronomètre Souverain — Platinum',
  'watch-fp-journe-chronometre-souverain',
  'Chronomètre Souverain in 40mm platinum case with silver guilloché dial, calibre 1304. Full set with steel travel pouch. From an Australian private collection.',
  'VIC', 'Melbourne',
  18500000000, '$185,000 AUD',
  'collectibles',
  '{"brand": "F.P. Journe", "model": "Chronomètre Souverain", "case_material": "platinum", "case_size_mm": 40, "calibre": "1304", "dial": "silver guilloché", "box_papers": true}'::jsonb,
  'active'
),
(
  'fund', 'watches',
  'Richard Mille RM 011 Felipe Massa Flyback Chronograph',
  'watch-richard-mille-rm-011-felipe-massa',
  'RM 011 Felipe Massa Flyback Chronograph in titanium with rubber strap. Full set including all original accessories. From a single-owner collection.',
  'NSW', 'Sydney',
  28000000000, '$280,000 AUD',
  'collectibles',
  '{"brand": "Richard Mille", "model": "RM 011 Felipe Massa Flyback Chronograph", "case_material": "titanium", "complication": "flyback chronograph", "box_papers": true}'::jsonb,
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- WINE (10) — sub_category='wine'
-- Australian fine wine. Pricing reflects 2026-05 Langton's / Wickman's
-- and Sotheby's wine secondary market levels for professionally cellared
-- examples.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, sub_category, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, key_metrics, status
) VALUES
(
  'fund', 'wine',
  'Penfolds Grange 2010 — OWC Case of 12 (Professionally Cellared)',
  'wine-penfolds-grange-2010-case-of-12',
  'Original wooden case (OWC) of 12 bottles of Penfolds Grange 2010, one of the most celebrated modern vintages (rated 99+ pts by major critics). Continuously cellared in a temperature-controlled professional facility from release.',
  'SA', 'Adelaide',
  1200000000, '$12,000 AUD',
  'collectibles',
  '{"producer": "Penfolds", "wine": "Grange", "vintage": 2010, "format": "OWC case of 12", "storage": "professional cellar from release", "critic_rating": "99+ pts"}'::jsonb,
  'active'
),
(
  'fund', 'wine',
  'Penfolds Grange 1990 — Single Bottle, Pristine Provenance',
  'wine-penfolds-grange-1990-single-bottle',
  'Highly collectible 1990 vintage Grange, frequently cited as one of the great post-war Australian vintages. Single bottle with intact capsule, label and ullage, original receipt from a fine wine merchant.',
  'NSW', 'Sydney',
  18000000, '$1,800 AUD',
  'collectibles',
  '{"producer": "Penfolds", "wine": "Grange", "vintage": 1990, "format": "single bottle (750ml)", "fill_level": "into-neck", "provenance": "original retail receipt"}'::jsonb,
  'active'
),
(
  'fund', 'wine',
  'Henschke Hill of Grace 2010 — Single Bottle',
  'wine-henschke-hill-of-grace-2010',
  'Henschke''s flagship Hill of Grace from the celebrated 2010 Eden Valley vintage. Sourced from the original single-vineyard, including pre-1860 plantings. Stored in professional bonded warehouse.',
  'SA', 'Eden Valley',
  90000000, '$9,000 AUD',
  'collectibles',
  '{"producer": "Henschke", "wine": "Hill of Grace", "vintage": 2010, "region": "Eden Valley", "format": "single bottle (750ml)", "storage": "bonded warehouse"}'::jsonb,
  'active'
),
(
  'fund', 'wine',
  'Torbreck RunRig 2018 — Six-Bottle Lot',
  'wine-torbreck-runrig-2018',
  'Six bottles of Torbreck RunRig 2018, a Shiraz-Viognier blend from old Barossa vines. Vintage scored 99 points by Robert Parker''s Wine Advocate. Continuously cellared from release.',
  'SA', 'Barossa Valley',
  39000000, '$3,900 AUD',
  'collectibles',
  '{"producer": "Torbreck", "wine": "RunRig", "vintage": 2018, "region": "Barossa Valley", "format": "6-bottle lot", "varietal": "Shiraz-Viognier", "critic_rating": "99 pts (Wine Advocate)"}'::jsonb,
  'active'
),
(
  'fund', 'wine',
  'Clarendon Hills Astralis 2015 — Three-Bottle Lot',
  'wine-clarendon-hills-astralis-2015',
  'Three bottles of Clarendon Hills Astralis 2015 from old-vine Clarendon Shiraz. Cellared in a temperature-controlled facility since release. Strong secondary-market demand.',
  'SA', 'McLaren Vale',
  21000000, '$2,100 AUD',
  'collectibles',
  '{"producer": "Clarendon Hills", "wine": "Astralis", "vintage": 2015, "region": "McLaren Vale", "format": "3-bottle lot", "varietal": "Shiraz"}'::jsonb,
  'active'
),
(
  'fund', 'wine',
  'The Standish Wine Company "The Lamella" 2018 — Six-Bottle Lot',
  'wine-standish-the-lamella-2018',
  'Six bottles of The Standish "The Lamella" 2018, a single-vineyard Eden Valley Shiraz. From a small-batch cult producer with strong global allocation demand.',
  'SA', 'Eden Valley',
  24000000, '$2,400 AUD',
  'collectibles',
  '{"producer": "The Standish Wine Company", "wine": "The Lamella", "vintage": 2018, "region": "Eden Valley", "format": "6-bottle lot", "varietal": "Shiraz"}'::jsonb,
  'active'
),
(
  'fund', 'wine',
  'Chris Ringland Three Rivers Shiraz 2010 — Single Bottle',
  'wine-chris-ringland-three-rivers-shiraz-2010',
  'Single bottle of Chris Ringland Three Rivers Shiraz 2010, one of the most allocation-restricted Australian wines. From a private cellar with full provenance.',
  'SA', 'Barossa Ranges',
  120000000, '$12,000 AUD',
  'collectibles',
  '{"producer": "Chris Ringland", "wine": "Three Rivers Shiraz", "vintage": 2010, "region": "Barossa Ranges", "format": "single bottle (750ml)"}'::jsonb,
  'active'
),
(
  'fund', 'wine',
  'Kalleske "Johann Georg" Single Vineyard Shiraz 2018 — Six-Bottle Lot',
  'wine-kalleske-johann-georg-2018',
  'Six bottles of Kalleske "Johann Georg" 2018, the flagship single-vineyard old-vine Shiraz from a fifth-generation Greenock grower. Biodynamically farmed.',
  'SA', 'Greenock',
  12000000, '$1,200 AUD',
  'collectibles',
  '{"producer": "Kalleske", "wine": "Johann Georg Single Vineyard Shiraz", "vintage": 2018, "region": "Greenock, Barossa Valley", "format": "6-bottle lot", "viticulture": "biodynamic"}'::jsonb,
  'active'
),
(
  'fund', 'wine',
  'Penfolds St Henri Shiraz 2018 — OWC Case of 12',
  'wine-penfolds-st-henri-2018-case-of-12',
  'Original wooden case of 12 bottles of Penfolds St Henri 2018, the multi-region "anti-Grange" matured in old large oak. Strong cellaring potential and steady auction record.',
  'SA', 'Adelaide',
  18000000, '$1,800 AUD',
  'collectibles',
  '{"producer": "Penfolds", "wine": "St Henri Shiraz", "vintage": 2018, "format": "OWC case of 12", "oak": "old large oak"}'::jsonb,
  'active'
),
(
  'fund', 'wine',
  'Wendouree Shiraz 2010 — Case of 12 (Mailing-List Only)',
  'wine-wendouree-shiraz-2010-case-of-12',
  'Twelve bottles of Wendouree Shiraz 2010 from Clare Valley. Wendouree wines are mailing-list-only with multi-decade ageing potential and consistently strong secondary-market demand.',
  'SA', 'Clare Valley',
  36000000, '$3,600 AUD',
  'collectibles',
  '{"producer": "Wendouree", "wine": "Shiraz", "vintage": 2010, "region": "Clare Valley", "format": "case of 12", "allocation": "mailing-list only"}'::jsonb,
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- WHISKY (10) — sub_category='whisky'
-- Includes both bottled releases and cask investments. Cask investments
-- carry a "type":"cask_investment" key_metric so the front-end can
-- treat them differently from bottled stock.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, sub_category, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, key_metrics, status
) VALUES
(
  'fund', 'whisky',
  'The Macallan 25 Year Old Sherry Oak — Sealed',
  'whisky-macallan-25-year-old-sherry-oak',
  'Sealed bottle of The Macallan 25 Year Old Sherry Oak (current presentation). The reference Macallan release for collectors, with strong secondary-market liquidity.',
  'NSW', 'Sydney',
  4500000000, '$45,000 AUD',
  'collectibles',
  '{"distillery": "The Macallan", "expression": "25 Year Old Sherry Oak", "abv_pct": 43, "size_ml": 700, "condition": "sealed", "type": "bottle"}'::jsonb,
  'active'
),
(
  'fund', 'whisky',
  'The Macallan Edition No.6 — Sealed',
  'whisky-macallan-edition-no-6',
  'Sealed bottle of The Macallan Edition No.6, the final release of the Edition series featuring a Mississippi River-themed presentation. Limited release with rapid secondary-market appreciation.',
  'VIC', 'Melbourne',
  220000000, '$2,200 AUD',
  'collectibles',
  '{"distillery": "The Macallan", "expression": "Edition No.6", "abv_pct": 48.6, "size_ml": 700, "condition": "sealed", "type": "bottle", "release": "limited"}'::jsonb,
  'active'
),
(
  'fund', 'whisky',
  'The Dalmore 21 Year Old — Sealed',
  'whisky-dalmore-21-year-old',
  'Sealed bottle of The Dalmore 21 Year Old (current release). Highland single malt finished in Matusalem Oloroso sherry casks. Highly collectible age-statement Dalmore.',
  'QLD', 'Brisbane',
  280000000, '$2,800 AUD',
  'collectibles',
  '{"distillery": "The Dalmore", "expression": "21 Year Old", "abv_pct": 42, "size_ml": 700, "condition": "sealed", "type": "bottle", "region": "Highland"}'::jsonb,
  'active'
),
(
  'fund', 'whisky',
  'Yamazaki 18 Year Old Single Malt — Sealed',
  'whisky-yamazaki-18-year-old',
  'Sealed bottle of Suntory Yamazaki 18 Year Old Single Malt Japanese Whisky. Strong global demand with persistent allocation shortages — one of the most appreciated Japanese whiskies of the past decade.',
  'NSW', 'Sydney',
  450000000, '$4,500 AUD',
  'collectibles',
  '{"distillery": "Yamazaki (Suntory)", "expression": "18 Year Old", "abv_pct": 43, "size_ml": 700, "condition": "sealed", "type": "bottle", "country": "Japan"}'::jsonb,
  'active'
),
(
  'fund', 'whisky',
  'Sullivans Cove French Oak Single Cask — Sealed',
  'whisky-sullivans-cove-french-oak-single-cask',
  'Sealed bottle of Sullivans Cove French Oak Single Cask, the multi-award-winning Tasmanian single malt that won World''s Best Single Malt at the 2014 World Whiskies Awards. Cask number documented.',
  'TAS', 'Hobart',
  140000000, '$1,400 AUD',
  'collectibles',
  '{"distillery": "Sullivans Cove", "expression": "French Oak Single Cask", "abv_pct": 47.5, "size_ml": 700, "condition": "sealed", "type": "bottle", "country": "Australia"}'::jsonb,
  'active'
),
(
  'fund', 'whisky',
  'Sullivans Cove American Oak Single Cask HH0617 — Sealed',
  'whisky-sullivans-cove-american-oak-hh0617',
  'Sealed bottle of Sullivans Cove American Oak Single Cask HH0617. Cask-strength single-cask release with documented cask number, increasingly sought after on the secondary market.',
  'TAS', 'Hobart',
  120000000, '$1,200 AUD',
  'collectibles',
  '{"distillery": "Sullivans Cove", "expression": "American Oak Single Cask HH0617", "cask_number": "HH0617", "size_ml": 700, "condition": "sealed", "type": "bottle"}'::jsonb,
  'active'
),
(
  'fund', 'whisky',
  'Starward Solera Cask Strength — Sealed',
  'whisky-starward-solera-cask',
  'Sealed bottle of Starward Solera Cask Strength, an Australian single malt matured in Apera (Australian sherry) solera casks. Cult Melbourne distillery with growing international following.',
  'VIC', 'Melbourne',
  35000000, '$350 AUD',
  'collectibles',
  '{"distillery": "Starward", "expression": "Solera Cask Strength", "size_ml": 700, "condition": "sealed", "type": "bottle", "country": "Australia"}'::jsonb,
  'active'
),
(
  'fund', 'whisky',
  'Glenfiddich 30 Year Old — Sealed',
  'whisky-glenfiddich-30-year-old',
  'Sealed bottle of Glenfiddich 30 Year Old (current presentation). Speyside single malt with steady secondary-market appreciation. Comes with original presentation box.',
  'NSW', 'Sydney',
  220000000, '$2,200 AUD',
  'collectibles',
  '{"distillery": "Glenfiddich", "expression": "30 Year Old", "abv_pct": 43, "size_ml": 700, "condition": "sealed", "type": "bottle", "region": "Speyside"}'::jsonb,
  'active'
),
(
  'fund', 'whisky',
  'Scotch Single Cask 12yo — Cask Investment, Bonded Warehouse',
  'whisky-scotch-single-cask-12yo-cask-investment',
  'Speyside single-malt cask investment, 12 years old, hogshead format, ~250L. Stored under bond in a Scottish HMRC-registered warehouse. Includes delivery order, WOWGR-compliant transfer, and storage and insurance for first 12 months.',
  'NSW', 'Sydney',
  4500000000, '$45,000 AUD',
  'collectibles',
  '{"region": "Speyside", "age_years": 12, "cask_type": "hogshead", "cask_volume_litres": 250, "storage": "Scottish HMRC bonded warehouse", "type": "cask_investment", "wowgr_compliant": true}'::jsonb,
  'active'
),
(
  'fund', 'whisky',
  'Australian Peated Single Cask — Cask Investment, TAS Bond Store',
  'whisky-australian-peated-single-cask-investment',
  'Australian peated single malt cask investment, 4 years old at sale, ex-bourbon barrel ~200L, stored in a Tasmanian bonded warehouse. Title transfer plus 24 months storage and insurance included.',
  'TAS', 'Hobart',
  1800000000, '$18,000 AUD',
  'collectibles',
  '{"country": "Australia", "style": "peated single malt", "age_years_at_sale": 4, "cask_type": "ex-bourbon barrel", "cask_volume_litres": 200, "storage": "Tasmanian bonded warehouse", "type": "cask_investment"}'::jsonb,
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- ART (10) — sub_category='art'
-- Australian blue-chip and contemporary, plus Indigenous works. AUD pricing
-- reflects gallery / Sotheby's Australia / Deutscher and Hackett 2026-05
-- comparable levels.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, sub_category, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, key_metrics, status
) VALUES
(
  'fund', 'art',
  'Brett Whiteley — "Bondi Study" (oil and ink on board)',
  'art-brett-whiteley-bondi-study',
  'Brett Whiteley study work in oil and ink on board, signed and dated. Subject is a coastal Bondi composition consistent with his late-1970s Sydney harbour and beach period. Provenance: private Sydney collection, with original gallery invoice.',
  'NSW', 'Sydney',
  18000000000, '$180,000 AUD',
  'collectibles',
  '{"artist": "Brett Whiteley", "title": "Bondi Study", "medium": "oil and ink on board", "signed": true, "provenance": "private Sydney collection, original gallery invoice"}'::jsonb,
  'active'
),
(
  'fund', 'art',
  'Sidney Nolan — Ned Kelly Series Work (enamel on board)',
  'art-sidney-nolan-ned-kelly-series-work',
  'Sidney Nolan enamel-on-board Ned Kelly series work from his iconic depictions of the bushranger. Signed verso, exhibited and illustrated with full provenance.',
  'VIC', 'Melbourne',
  35000000000, '$350,000 AUD',
  'collectibles',
  '{"artist": "Sidney Nolan", "series": "Ned Kelly", "medium": "enamel on board", "signed_verso": true, "exhibited": true}'::jsonb,
  'active'
),
(
  'fund', 'art',
  'Arthur Boyd — Bride Series Work (oil on canvas)',
  'art-arthur-boyd-bride-series-work',
  'Arthur Boyd oil-on-canvas painting from the Bride series, one of the most recognised cycles in his oeuvre. Signed lower right, with full exhibition history.',
  'VIC', 'Melbourne',
  22000000000, '$220,000 AUD',
  'collectibles',
  '{"artist": "Arthur Boyd", "series": "Bride", "medium": "oil on canvas", "signed": true}'::jsonb,
  'active'
),
(
  'fund', 'art',
  'John Olsen — Contemporary Landscape (acrylic on canvas)',
  'art-john-olsen-contemporary-landscape',
  'John Olsen acrylic-on-canvas landscape from his late-career period, depicting characteristic Australian outback motifs. Signed and dated, accompanied by certificate from the Olsen Gallery.',
  'NSW', 'Sydney',
  9500000000, '$95,000 AUD',
  'collectibles',
  '{"artist": "John Olsen", "medium": "acrylic on canvas", "signed": true, "certificate": "Olsen Gallery"}'::jsonb,
  'active'
),
(
  'fund', 'art',
  'Emily Kame Kngwarreye — Utopia Work (acrylic on canvas)',
  'art-emily-kame-kngwarreye-utopia-work',
  'Emily Kame Kngwarreye acrylic-on-canvas work from the Utopia community, with documented community provenance and certificate of authenticity. From the artist''s mature period.',
  'NT', 'Alice Springs',
  16000000000, '$160,000 AUD',
  'collectibles',
  '{"artist": "Emily Kame Kngwarreye", "community": "Utopia", "medium": "acrylic on canvas", "certificate": true, "provenance": "community-documented"}'::jsonb,
  'active'
),
(
  'fund', 'art',
  'Rover Thomas — Kimberley Country (natural pigments on canvas)',
  'art-rover-thomas-kimberley-country',
  'Rover Thomas painting in natural pigments on canvas depicting Kimberley country. Signed verso with community certificate of authenticity. From an Australian institutional collection deaccession.',
  'WA', 'Kununurra',
  12000000000, '$120,000 AUD',
  'collectibles',
  '{"artist": "Rover Thomas", "subject": "Kimberley country", "medium": "natural pigments on canvas", "certificate": true, "provenance": "institutional deaccession"}'::jsonb,
  'active'
),
(
  'fund', 'art',
  'Margaret Olley — Still Life with Flowers (oil on board)',
  'art-margaret-olley-still-life-with-flowers',
  'Margaret Olley oil-on-board still life with flowers, signed lower right. Acquired directly from a Sydney commercial gallery in the 2000s, with original invoice.',
  'NSW', 'Sydney',
  4500000000, '$45,000 AUD',
  'collectibles',
  '{"artist": "Margaret Olley", "medium": "oil on board", "subject": "still life with flowers", "signed": true}'::jsonb,
  'active'
),
(
  'fund', 'art',
  'Jeffrey Smart — Geometric Cityscape (oil on canvas)',
  'art-jeffrey-smart-geometric-cityscape',
  'Jeffrey Smart oil-on-canvas geometric cityscape with figures, characteristic of his Italian-period work. Signed lower right, with full exhibition history.',
  'VIC', 'Melbourne',
  28000000000, '$280,000 AUD',
  'collectibles',
  '{"artist": "Jeffrey Smart", "medium": "oil on canvas", "subject": "geometric cityscape", "signed": true}'::jsonb,
  'active'
),
(
  'fund', 'art',
  'Tim Storrier — Australian Landscape (acrylic on canvas)',
  'art-tim-storrier-australian-landscape',
  'Tim Storrier acrylic-on-canvas Australian landscape with characteristic burning rope motif. Signed lower right, accompanied by gallery certificate.',
  'NSW', 'Bowral',
  3500000000, '$35,000 AUD',
  'collectibles',
  '{"artist": "Tim Storrier", "medium": "acrylic on canvas", "subject": "Australian landscape", "signed": true, "certificate": true}'::jsonb,
  'active'
),
(
  'fund', 'art',
  'Contemporary Emerging Artist — Mixed Media on Linen',
  'art-contemporary-emerging-artist-piece',
  'Contemporary mixed-media-on-linen work by an Australian emerging artist with growing institutional acquisition history. Sold directly through their representing Melbourne gallery, with edition and certificate documentation.',
  'VIC', 'Melbourne',
  500000000, '$5,000 AUD',
  'collectibles',
  '{"category": "contemporary emerging", "medium": "mixed media on linen", "certificate": true, "representation": "Melbourne commercial gallery"}'::jsonb,
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SPORTS MEMORABILIA (6) — sub_category='sports_memorabilia'
-- NOTE: 'sports_memorabilia' is not yet listed in
-- lib/listing-url.ts FUND_SUB_TO_CATEGORY or
-- lib/investment-listings-query.ts ALTERNATIVES_SUB_CATEGORIES. These rows
-- will become discoverable on /invest/alternatives once those constants
-- are widened in a follow-up.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, sub_category, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, key_metrics, status
) VALUES
(
  'fund', 'sports_memorabilia',
  'Sir Donald Bradman Signed Cricket Bat — Authenticated',
  'sports-don-bradman-signed-cricket-bat',
  'Cricket bat personally signed by Sir Donald Bradman, with PSA/JSA-equivalent third-party authentication and detailed provenance letter from the original recipient. The blue-chip benchmark of Australian sports memorabilia.',
  'NSW', 'Sydney',
  3500000000, '$35,000 AUD',
  'collectibles',
  '{"sport": "cricket", "athlete": "Sir Donald Bradman", "item": "signed cricket bat", "authentication": "third-party, with provenance letter"}'::jsonb,
  'active'
),
(
  'fund', 'sports_memorabilia',
  '2019 Tim Paine Test-Worn Baggy Green — Estate Piece',
  'sports-2019-tim-paine-test-worn-baggy-green',
  'Tim Paine test-worn Australian baggy green from the 2019 Ashes series, sold from his estate with letter of authenticity. Wear and stitching consistent with multi-Test use.',
  'TAS', 'Hobart',
  4500000000, '$45,000 AUD',
  'collectibles',
  '{"sport": "cricket", "athlete": "Tim Paine", "item": "test-worn baggy green cap", "year": 2019, "competition": "Ashes", "authentication": "estate letter of authenticity"}'::jsonb,
  'active'
),
(
  'fund', 'sports_memorabilia',
  '2019 Richmond AFL Premiership Guernsey — Squad-Signed',
  'sports-2019-richmond-afl-premiership-guernsey',
  '2019 Richmond Football Club AFL Premiership-edition guernsey signed by the full premiership squad, framed in archival format. Includes club COA and limited-edition number.',
  'VIC', 'Melbourne',
  650000000, '$6,500 AUD',
  'collectibles',
  '{"sport": "AFL", "club": "Richmond Football Club", "year": 2019, "item": "premiership guernsey, framed", "signatures": "full squad", "certificate": "club COA"}'::jsonb,
  'active'
),
(
  'fund', 'sports_memorabilia',
  'NRL State of Origin Match-Worn Jersey — Authenticated',
  'sports-state-of-origin-match-worn-jersey',
  'NRL State of Origin player-issued match-worn jersey with NRL hologram authentication and player COA. Recent series, framed and ready to display.',
  'QLD', 'Brisbane',
  280000000, '$2,800 AUD',
  'collectibles',
  '{"sport": "NRL", "competition": "State of Origin", "item": "match-worn jersey, framed", "authentication": "NRL hologram + player COA"}'::jsonb,
  'active'
),
(
  'fund', 'sports_memorabilia',
  'Adam Goodes 2003 AFL Rookie Card — PSA-Graded',
  'sports-adam-goodes-2003-rookie-card-psa',
  'Adam Goodes 2003 AFL rookie card, PSA-graded in high-grade investment condition (PSA 9 or 10 examples have appreciated significantly). Includes PSA cert number for population check.',
  'NSW', 'Sydney',
  150000000, '$1,500 AUD',
  'collectibles',
  '{"sport": "AFL", "athlete": "Adam Goodes", "item": "2003 rookie card", "grading": "PSA", "year": 2003}'::jsonb,
  'active'
),
(
  'fund', 'sports_memorabilia',
  'Liz Cambage Signed Olympic Basketball — Tokyo 2020',
  'sports-liz-cambage-signed-olympic-basketball',
  'Official Olympic basketball signed by Australian Opals star Liz Cambage, framed with photographic provenance from the signing. COA from a leading Australian sports memorabilia dealer.',
  'VIC', 'Melbourne',
  120000000, '$1,200 AUD',
  'collectibles',
  '{"sport": "basketball", "athlete": "Liz Cambage", "item": "signed Olympic basketball, framed", "event": "Tokyo 2020", "certificate": true}'::jsonb,
  'active'
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
