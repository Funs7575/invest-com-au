-- Seed investment listing images with curated Unsplash photos
-- Each listing gets 3-4 images relevant to its vertical and type
-- Also adds hero_image column to investment_verticals

-- ─── Add hero_image to investment_verticals ─────────────────────────────────
ALTER TABLE investment_verticals ADD COLUMN IF NOT EXISTS hero_image TEXT;

-- ─── Vertical hero images ───────────────────────────────────────────────────
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'residential-property';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'shares';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'buy-business';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'commercial-property';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'farmland';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'mining';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'renewable-energy';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'startups';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'franchise';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'funds';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'private-equity';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'bonds';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'gold';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'ipos';
UPDATE investment_verticals SET hero_image = 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&h=675&q=80&auto=format&fit=crop' WHERE slug = 'savings';

-- ─── BUSINESS LISTINGS (10) ─────────────────────────────────────────────────
UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'sydney-cafe-roastery-8yr';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'melbourne-digital-agency';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'brisbane-industrial-cleaning';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'perth-engineering-consultancy-mining';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1583337130417-13571c35de3b?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'online-pet-supplies-retailer';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'aged-care-staffing-agency-nsw';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1576037728058-c1e20d6ea4d6?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1567057419565-4349c49d8a04?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'melbourne-childcare-centre-inner-north';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'gold-coast-hydraulic-services';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'adelaide-boutique-accounting-practice';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'western-sydney-freight-logistics';


-- ─── MINING LISTINGS (10) ───────────────────────────────────────────────────
UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518611507436-f9521f2d0e65?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'kalgoorlie-gold-project-2moz';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1573588546512-2ace898aa480?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'pilbara-lithium-pegmatite-project';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1615092296061-e2ccfeb2f3d6?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'queensland-copper-gold-pfs';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1573588546512-2ace898aa480?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518611507436-f9521f2d0e65?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'nsw-rare-earths-project';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1589792923962-537704632910?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'pilbara-iron-ore-royalty-stream';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1518611507436-f9521f2d0e65?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1589792923962-537704632910?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'south-australia-uranium-isr-project';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1615092296061-e2ccfeb2f3d6?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'victoria-gold-mine-underground-restart';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1573588546512-2ace898aa480?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'wa-nickel-sulphide-battery-metals';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1589792923962-537704632910?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518611507436-f9521f2d0e65?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'north-qld-phosphate-project';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1615092296061-e2ccfeb2f3d6?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'broken-hill-silver-lead-zinc-project';

-- ─── FARMLAND LISTINGS (10) ─────────────────────────────────────────────────
UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'riverina-irrigated-cropping-1840ha';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'darling-downs-dryland-cropping-3200ha';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'coonawarra-vineyard-estate-280ha';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1493962853295-0fd70327578a?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'kimberley-pastoral-station-beef';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1527847263472-aa5338d178b8?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1594761401561-d49bbc9e01e7?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'gippsland-dairy-farm-480ha';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'wheatbelt-mixed-farm-4500ha';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'northern-nsw-beef-cropping-6200ha';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'atherton-tablelands-banana-fruit-farm';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1543418219-44e30b057fea?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'barossa-valley-premium-wine-estate';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'hunter-valley-equine-cropping-340ha';


-- ─── COMMERCIAL PROPERTY LISTINGS (10) ──────────────────────────────────────
UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'sydney-cbd-office-strata-level18';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'melbourne-industrial-estate-dandenong';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'brisbane-neighbourhood-retail-centre-iga';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1576037728058-c1e20d6ea4d6?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'perth-childcare-freehold-net-lease';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1567449303078-57ad995bd17f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1508615070457-7baeba4003ab?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'adelaide-service-station-bp-branded';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'sydney-surry-hills-office-value-add';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1549294413-26f195200c16?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'gold-coast-beachfront-retail-strip';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'melbourne-truganina-logistics-warehouse';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'darwin-mcdonalds-nnn-lease';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'perth-office-park-3-building-osborne-park';

-- ─── FRANCHISE LISTINGS (10) ────────────────────────────────────────────────
UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1589351772bde-8b3a2b5b7a48?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'boost-juice-carindale-qld';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'jims-group-master-franchise-vic-regional';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1572297794908-f2ee5a2260ae?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'poolwerx-perth-western-suburbs';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'snap-fitness-sydney-inner-west';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'muffin-break-westfield-miranda-nsw';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'fastway-aramex-courier-adelaide-metro';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'cheesecake-shop-melbourne-se-suburbs';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'kwik-kopy-brisbane-cbd';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'anytime-fitness-darwin-2400-members';


-- ─── ENERGY LISTINGS (9) ────────────────────────────────────────────────────
UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'nsw-solar-farm-55mw-operational';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'queensland-wind-farm-120mw-approved';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'sa-battery-storage-50mw-200mwh-planning';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'wa-rooftop-solar-portfolio-180-sites';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'green-hydrogen-pilbara-export-feasibility';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'vic-solar-farm-28mw-construction';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'nsw-biogas-to-energy-landfill-operational';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'nt-hybrid-off-grid-solar-storage-remote';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1501502099545-4f77ad9f1e56?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'qld-pumped-hydro-250mw-prefeasibility';

-- ─── FUND LISTINGS (10) ─────────────────────────────────────────────────────
UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'argyle-agribusiness-fund-siv';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'pacific-infrastructure-debt-fund-iv';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'redleaf-private-credit-fund-wholesale';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'emerald-industrial-reit-foreign-capital';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'koala-vc-fund-iii-early-stage-tech';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'horizon-healthcare-property-fund-siv';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'southern-cross-agricultural-water-fund';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'goldfields-special-situations-fund';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'atlas-renewable-energy-infrastructure-fund';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'bridgepoint-lic-diversified';

-- ─── STARTUP LISTINGS (10) ──────────────────────────────────────────────────
UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'proptech-saas-ai-property-inspection';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'agtech-precision-irrigation-iot';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'fintech-bnpl-b2b-trade-finance';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'healthtech-remote-patient-monitoring-rural';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'edtech-stem-upskilling-mining-sector';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'cleantech-pre-seed-biochar-carbon-capture';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'martech-social-commerce-platform-brands';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'foodtech-seed-plant-based-seafood';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'cybersec-saas-sme-threat-intelligence';

UPDATE investment_listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=675&q=80&auto=format&fit=crop'
] WHERE slug = 'legaltech-pre-seed-ai-contract-review';
