-- ============================================================================
-- Migration: 20260725180000_seed_firms_and_expert_teams.sql
-- Purpose: Seed visualisation content for the unified /advisors directory
--          (PR #861 shipped 2026-05-15). Adds 5 advisor firms with logos +
--          AFSL + bios, 12 firm-member professionals linked via firm_id,
--          and 5 verified public expert_teams (each with 3 members) so
--          the segmented control on /advisors has populated counts in
--          all three slots: Individuals / Firms / Expert Teams.
--
-- Rollback: DELETE rows by slug, but ONLY after confirming no FK rows
--          reference them (advisor_articles, professional_leads,
--          professional_reviews, advisor_bookings, expert_team_members
--          for the dependent direction). Forward is idempotent via
--          ON CONFLICT (slug) DO NOTHING.
--
-- Risk: low — all seeded rows are mock content; production tables already
--       contain real advisors, so DELETE-by-slug is safe as long as FK
--       cascades / RESTRICT order is preserved (members → teams; members
--       reference both, so delete expert_team_members first).
-- ============================================================================
--
-- Forward operations:
--   1. INSERT INTO advisor_firms (...) — 5 firms (Nexus Wealth, Blueprint
--      Tax, Coastal Mortgage, Sovereign Property, Apex Migration).
--   2. INSERT INTO professionals (...) — 12 individuals with firm_id set
--      to one of the 5 seeded firms (account_type='firm_member').
--   3. INSERT INTO expert_teams (...) — 5 verified public teams across
--      SMSF / Foreign Investor / Expat / Commercial Property / Business
--      Acquisition categories.
--   4. INSERT INTO expert_team_members (...) — 3 members per team, all
--      'active' + can_appear_publicly=true.
--
-- Rollback (in reverse order):
--   1. DELETE FROM expert_team_members WHERE team_id IN (SELECT id FROM
--        expert_teams WHERE slug IN (...));
--   2. DELETE FROM expert_teams WHERE slug IN (
--        'au-smsf-property-squad', 'cross-border-tax-team',
--        'expat-return-planning', 'cbd-commercial-property-team',
--        'sme-acquisition-team');
--   3. DELETE FROM professionals WHERE slug IN (
--        -- Nexus Wealth Partners
--        'sara-mitchell-nexus', 'kai-tanaka-nexus', 'priya-shah-nexus',
--        -- Blueprint Tax & Advisory
--        'leon-fischer-blueprint', 'aisha-rahman-blueprint',
--        -- Coastal Mortgage Group
--        'jordan-blake-coastal', 'mia-novak-coastal',
--        -- Sovereign Property Advisory
--        'oliver-grant-sovereign', 'natalie-vaughan-sovereign',
--        'eddie-ramos-sovereign',
--        -- Apex Migration Law
--        'rachel-okonkwo-apex', 'henry-zhang-apex');
--   4. DELETE FROM advisor_firms WHERE slug IN (
--        'nexus-wealth-partners', 'blueprint-tax-advisory',
--        'coastal-mortgage-group', 'sovereign-property-advisory',
--        'apex-migration-law');

BEGIN;

-- ─── 1. Advisor firms ──────────────────────────────────────────────────────
INSERT INTO advisor_firms (
  slug, name, abn, acn, afsl_number, website, phone, email,
  logo_url, location_state, location_suburb, location_display, bio,
  status, max_seats
) VALUES
('nexus-wealth-partners', 'Nexus Wealth Partners',
 '64 612 345 678', '612 345 678', 'AFSL 401234',
 'https://nexuswealth.example.com.au', '02 8000 1000',
 'hello@nexuswealth.example.com.au',
 'https://ui-avatars.com/api/?name=NW&background=0F766E&color=fff&size=128&font-size=0.45&bold=true',
 'NSW', 'Sydney CBD', 'Sydney CBD, NSW',
 'Multi-disciplinary financial planning firm serving HNW Australians and expat families. CFP-led team across superannuation, investment strategy, and cross-border tax. Fixed-fee engagements with a transparent scope-of-advice agreement.',
 'active', 12),

('blueprint-tax-advisory', 'Blueprint Tax & Advisory',
 '68 723 456 789', '723 456 789', NULL,
 'https://blueprinttax.example.com.au', '03 9000 2000',
 'team@blueprinttax.example.com.au',
 'https://ui-avatars.com/api/?name=BT&background=B45309&color=fff&size=128&font-size=0.45&bold=true',
 'VIC', 'Melbourne CBD', 'Melbourne CBD, VIC',
 'Boutique tax practice specialising in property investors, SMSF trustees, and cross-border returns. Registered tax agents only — no upsells, no commissions. Most engagements quoted upfront.',
 'active', 10),

('coastal-mortgage-group', 'Coastal Mortgage Group',
 '72 834 567 890', '834 567 890', NULL,
 'https://coastalmortgage.example.com.au', '07 3000 3000',
 'enquiries@coastalmortgage.example.com.au',
 'https://ui-avatars.com/api/?name=CM&background=0369A1&color=fff&size=128&font-size=0.45&bold=true',
 'QLD', 'Gold Coast', 'Gold Coast, QLD',
 'Mortgage brokerage with access to 40+ lenders, including non-resident and expat-friendly options. Fee-free to borrowers — paid by the lender on settlement.',
 'active', 8),

('sovereign-property-advisory', 'Sovereign Property Advisory',
 '79 945 678 901', '945 678 901', NULL,
 'https://sovereignproperty.example.com.au', '02 8000 4000',
 'concierge@sovereignproperty.example.com.au',
 'https://ui-avatars.com/api/?name=SP&background=7E22CE&color=fff&size=128&font-size=0.45&bold=true',
 'NSW', 'North Sydney', 'North Sydney, NSW',
 'Buyers agency + commercial property advisory. We source, negotiate, and manage acquisitions for individuals, SMSFs, and family offices. Fixed engagement fees, no developer kickbacks.',
 'active', 6),

('apex-migration-law', 'Apex Migration Law',
 '83 156 789 012', '156 789 012', NULL,
 'https://apexmigration.example.com.au', '02 8000 5000',
 'admin@apexmigration.example.com.au',
 'https://ui-avatars.com/api/?name=AM&background=B91C1C&color=fff&size=128&font-size=0.45&bold=true',
 'NSW', 'Sydney CBD', 'Sydney CBD, NSW',
 'Migration agents and immigration lawyers specialising in investor visas (SIV, BIIP), employer-sponsored 482/186 pathways, and family-stream applications. MARN-registered, dual-qualified solicitors.',
 'active', 8)
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. Professionals (firm members) ──────────────────────────────────────
-- Linked to the 5 seeded firms via firm_id (lookup by firm slug to keep
-- the migration position-independent if the firms INSERT above hits
-- ON CONFLICT and existing firm rows take precedence).

INSERT INTO professionals (
  slug, name, firm_name, firm_id, account_type, type, specialties,
  location_state, location_suburb, location_display,
  afsl_number, abn, registration_number,
  bio, photo_url, website, phone, email,
  fee_structure, fee_description, rating, review_count,
  verified, status, onboarded_at, profile_complete,
  languages, accepts_new_clients, accepts_international
) VALUES
-- Nexus Wealth Partners (3 advisors)
('sara-mitchell-nexus', 'Sara Mitchell', 'Nexus Wealth Partners',
 (SELECT id FROM advisor_firms WHERE slug='nexus-wealth-partners'), 'firm_member',
 'financial_planner',
 '["Retirement planning", "Pre-retirement strategy", "Investment portfolio construction", "Insurance review"]'::jsonb,
 'NSW', 'Sydney CBD', 'Sydney CBD, NSW',
 'AFSL 401234', '64 612 345 678', NULL,
 'CFP with 14 years across major Australian financial planning firms. I specialise in transition-to-retirement, contribution caps, and downsizer strategies for clients 50+. Fixed-fee engagements with a written statement of advice.',
 'https://randomuser.me/api/portraits/women/44.jpg',
 'https://nexuswealth.example.com.au/team/sara-mitchell', '02 8000 1001',
 'sara.mitchell@nexuswealth.example.com.au',
 'fee-for-service', 'Initial plan: $3,500. Annual review: $2,200. Free 30-min intro call.',
 4.9, 27, true, 'active', NOW(), true,
 '["English"]'::jsonb, true, false),

('kai-tanaka-nexus', 'Kai Tanaka', 'Nexus Wealth Partners',
 (SELECT id FROM advisor_firms WHERE slug='nexus-wealth-partners'), 'firm_member',
 'financial_planner',
 '["Cross-border tax", "Expat returns", "Foreign super transfers", "Estate planning"]'::jsonb,
 'NSW', 'Sydney CBD', 'Sydney CBD, NSW',
 'AFSL 401234', '64 612 345 678', NULL,
 'Dual-qualified across Australia and Japan. I help expat professionals coordinate super, foreign pensions, and tax residency transitions. Bilingual engagement available end-to-end.',
 'https://randomuser.me/api/portraits/men/32.jpg',
 'https://nexuswealth.example.com.au/team/kai-tanaka', '02 8000 1002',
 'kai.tanaka@nexuswealth.example.com.au',
 'fee-for-service', 'Cross-border review: $2,800. Full plan: $4,200.',
 4.8, 19, true, 'active', NOW(), true,
 '["English", "Japanese"]'::jsonb, true, true),

('priya-shah-nexus', 'Priya Shah', 'Nexus Wealth Partners',
 (SELECT id FROM advisor_firms WHERE slug='nexus-wealth-partners'), 'firm_member',
 'wealth_manager',
 '["Portfolio management", "SMSF investment strategy", "Direct equity research", "Alternative assets"]'::jsonb,
 'NSW', 'Sydney CBD', 'Sydney CBD, NSW',
 'AFSL 401234', '64 612 345 678', NULL,
 'Wealth manager with a research-led approach. Portfolios $500k+. I run discretionary mandates with quarterly rebalancing and tax-aware harvesting.',
 'https://randomuser.me/api/portraits/women/68.jpg',
 'https://nexuswealth.example.com.au/team/priya-shah', '02 8000 1003',
 'priya.shah@nexuswealth.example.com.au',
 'percentage of AUM', '0.8% AUM p.a. on portfolios above $500k. Tiered down at $2M+.',
 4.7, 22, true, 'active', NOW(), true,
 '["English", "Hindi", "Gujarati"]'::jsonb, true, false),

-- Blueprint Tax & Advisory (2 advisors)
('leon-fischer-blueprint', 'Leon Fischer', 'Blueprint Tax & Advisory',
 (SELECT id FROM advisor_firms WHERE slug='blueprint-tax-advisory'), 'firm_member',
 'tax_agent',
 '["Investment property tax", "Capital gains tax", "Negative gearing", "Crypto tax", "Trust returns"]'::jsonb,
 'VIC', 'Melbourne CBD', 'Melbourne CBD, VIC',
 NULL, '68 723 456 789', 'TAN 21458762',
 'Registered tax agent (15 yrs). Specialist in investment property structures, CGT events, and trust distributions. Fixed-quote returns from $440.',
 'https://randomuser.me/api/portraits/men/76.jpg',
 'https://blueprinttax.example.com.au/team/leon-fischer', '03 9000 2001',
 'leon.fischer@blueprinttax.example.com.au',
 'flat', 'Individual return with rental: $440. Trust return: $880. SMSF return: $1,650.',
 4.8, 41, true, 'active', NOW(), true,
 '["English", "German"]'::jsonb, true, false),

('aisha-rahman-blueprint', 'Aisha Rahman', 'Blueprint Tax & Advisory',
 (SELECT id FROM advisor_firms WHERE slug='blueprint-tax-advisory'), 'firm_member',
 'smsf_accountant',
 '["SMSF setup", "SMSF audit", "Pension phase strategy", "In-house asset compliance"]'::jsonb,
 'VIC', 'Melbourne CBD', 'Melbourne CBD, VIC',
 NULL, '68 723 456 789', 'SMSF Auditor SAN 100012345',
 'SMSF specialist accountant and approved auditor. I handle setup, ongoing compliance, and pension-phase transitions. ATO benchmarks reviewed every quarter.',
 'https://randomuser.me/api/portraits/women/29.jpg',
 'https://blueprinttax.example.com.au/team/aisha-rahman', '03 9000 2002',
 'aisha.rahman@blueprinttax.example.com.au',
 'flat', 'SMSF setup with corporate trustee: $1,950. Annual compliance: $1,650.',
 4.9, 33, true, 'active', NOW(), true,
 '["English", "Bengali", "Arabic"]'::jsonb, true, true),

-- Coastal Mortgage Group (2 advisors)
('jordan-blake-coastal', 'Jordan Blake', 'Coastal Mortgage Group',
 (SELECT id FROM advisor_firms WHERE slug='coastal-mortgage-group'), 'firm_member',
 'mortgage_broker',
 '["First home buyers", "Investment loans", "Construction loans", "Self-employed lending"]'::jsonb,
 'QLD', 'Gold Coast', 'Gold Coast, QLD',
 NULL, '72 834 567 890', 'Credit Rep 478129',
 'Mortgage broker (8 yrs). Panel of 38 lenders. I work nights and weekends — most clients meet by video. No fee to you; paid by the lender on settlement.',
 'https://randomuser.me/api/portraits/men/55.jpg',
 'https://coastalmortgage.example.com.au/team/jordan-blake', '07 3000 3001',
 'jordan.blake@coastalmortgage.example.com.au',
 'commission', 'Free to borrowers. Upfront + trail commission paid by the lender on settlement.',
 4.8, 64, true, 'active', NOW(), true,
 '["English"]'::jsonb, true, false),

('mia-novak-coastal', 'Mia Novak', 'Coastal Mortgage Group',
 (SELECT id FROM advisor_firms WHERE slug='coastal-mortgage-group'), 'firm_member',
 'mortgage_broker',
 '["Non-resident loans", "Foreign income borrowers", "FIRB-approved purchases", "Expat refinances"]'::jsonb,
 'QLD', 'Gold Coast', 'Gold Coast, QLD',
 NULL, '72 834 567 890', 'Credit Rep 478130',
 'Specialist in non-resident and expat lending — currently the only broker on our panel certified across 6 non-resident-friendly lenders. FIRB-coordinated purchases.',
 'https://randomuser.me/api/portraits/women/12.jpg',
 'https://coastalmortgage.example.com.au/team/mia-novak', '07 3000 3002',
 'mia.novak@coastalmortgage.example.com.au',
 'commission', 'Free to borrowers. Lender pays upfront + trail on settlement.',
 4.7, 28, true, 'active', NOW(), true,
 '["English", "Croatian", "Italian"]'::jsonb, true, true),

-- Sovereign Property Advisory (3 advisors)
('oliver-grant-sovereign', 'Oliver Grant', 'Sovereign Property Advisory',
 (SELECT id FROM advisor_firms WHERE slug='sovereign-property-advisory'), 'firm_member',
 'buyers_agent',
 '["Sydney metro", "Family homes", "Off-market access", "Auction bidding"]'::jsonb,
 'NSW', 'North Sydney', 'North Sydney, NSW',
 NULL, '79 945 678 901', 'NSW Licensee 20098876',
 'Buyers agent across Sydney metro for 11 years. I source family homes and high-yield investments via off-market relationships. Fee-for-service only — no developer kickbacks.',
 'https://randomuser.me/api/portraits/men/40.jpg',
 'https://sovereignproperty.example.com.au/team/oliver-grant', '02 8000 4001',
 'oliver.grant@sovereignproperty.example.com.au',
 'flat', 'Search + negotiate engagement: $14,500 (max 4 months) or 1.65% of purchase price, whichever is lower.',
 4.9, 38, true, 'active', NOW(), true,
 '["English"]'::jsonb, true, false),

('natalie-vaughan-sovereign', 'Natalie Vaughan', 'Sovereign Property Advisory',
 (SELECT id FROM advisor_firms WHERE slug='sovereign-property-advisory'), 'firm_member',
 'commercial_property_agent',
 '["Office acquisitions", "Industrial sheds", "SMSF property", "Yield analysis"]'::jsonb,
 'NSW', 'North Sydney', 'North Sydney, NSW',
 NULL, '79 945 678 901', 'NSW Licensee 20098877',
 'Commercial property advisor for SMSFs and family offices. Focus on industrial and small-format office in NSW + VIC. 12-yr track record.',
 'https://randomuser.me/api/portraits/women/55.jpg',
 'https://sovereignproperty.example.com.au/team/natalie-vaughan', '02 8000 4002',
 'natalie.vaughan@sovereignproperty.example.com.au',
 'flat', 'Acquisition engagement: $22,000 fixed, plus 0.5% on assets >$3M.',
 4.7, 14, true, 'active', NOW(), true,
 '["English"]'::jsonb, true, false),

('eddie-ramos-sovereign', 'Eddie Ramos', 'Sovereign Property Advisory',
 (SELECT id FROM advisor_firms WHERE slug='sovereign-property-advisory'), 'firm_member',
 'property_advisor',
 '["Foreign buyer FIRB", "Off-the-plan", "Cross-border property", "AML/KYC for non-residents"]'::jsonb,
 'NSW', 'North Sydney', 'North Sydney, NSW',
 NULL, '79 945 678 901', 'NSW Licensee 20098878',
 'Property advisor for foreign investors. I coordinate FIRB approval, settlement, stamp-duty surcharges, and lender intros across NSW/VIC/QLD.',
 'https://randomuser.me/api/portraits/men/61.jpg',
 'https://sovereignproperty.example.com.au/team/eddie-ramos', '02 8000 4003',
 'eddie.ramos@sovereignproperty.example.com.au',
 'fee-for-service', 'FIRB-coordinated acquisition: $8,800 retainer + 1% on settlement.',
 4.6, 11, true, 'active', NOW(), true,
 '["English", "Spanish", "Tagalog"]'::jsonb, true, true),

-- Apex Migration Law (2 advisors)
('rachel-okonkwo-apex', 'Rachel Okonkwo', 'Apex Migration Law',
 (SELECT id FROM advisor_firms WHERE slug='apex-migration-law'), 'firm_member',
 'migration_agent',
 '["Significant Investor Visa (SIV)", "Business Innovation 188", "Employer-sponsored 482/186", "Partner visas"]'::jsonb,
 'NSW', 'Sydney CBD', 'Sydney CBD, NSW',
 NULL, '83 156 789 012', 'MARN 1798542',
 'Migration agent (MARN 1798542) and immigration lawyer. 9 years across investor and employer-sponsored streams. Direct lodgement via ImmiAccount; transparent staged fees.',
 'https://randomuser.me/api/portraits/women/81.jpg',
 'https://apexmigration.example.com.au/team/rachel-okonkwo', '02 8000 5001',
 'rachel.okonkwo@apexmigration.example.com.au',
 'flat', 'SIV (188C): $32,000 staged across nomination, lodgement, grant. 482 visa: $6,600 staged.',
 4.9, 17, true, 'active', NOW(), true,
 '["English", "French"]'::jsonb, true, true),

('henry-zhang-apex', 'Henry Zhang', 'Apex Migration Law',
 (SELECT id FROM advisor_firms WHERE slug='apex-migration-law'), 'firm_member',
 'migration_agent',
 '["Skilled visas 189/190", "Regional 491", "Permanent Residency 887", "Citizenship by descent"]'::jsonb,
 'NSW', 'Sydney CBD', 'Sydney CBD, NSW',
 NULL, '83 156 789 012', 'MARN 1812345',
 'Skilled-stream specialist. I manage points-tested 189/190/491 lodgements and skilled occupation assessments. Mandarin-speaking; Sydney + remote.',
 'https://randomuser.me/api/portraits/men/85.jpg',
 'https://apexmigration.example.com.au/team/henry-zhang', '02 8000 5002',
 'henry.zhang@apexmigration.example.com.au',
 'flat', '189 skilled visa: $4,400. 190/491 with state nomination: $6,000 staged.',
 4.8, 24, true, 'active', NOW(), true,
 '["English", "Mandarin", "Cantonese"]'::jsonb, true, true)
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. Expert teams ──────────────────────────────────────────────────────
-- All 5 teams: public=true, verification_status='verified', accepts_briefs=true.
-- Wrapped in a DO block so this migration is safe to apply BEFORE the
-- PMP foundation migration (20260723_pmp01_provider_marketplace_foundation)
-- — without the wrapper the INSERT would fail on `relation expert_teams
-- does not exist`. When PMP lands, re-run this seed and the expert_teams
-- rows will be inserted (ON CONFLICT DO NOTHING keeps it idempotent).
DO $expert_teams_seed$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='expert_teams'
  ) THEN

INSERT INTO expert_teams (
  slug, name, team_category, team_type, description, niche,
  location_state, owner_professional_id, lead_professional_id, firm_id,
  accepted_brief_templates, accepts_briefs,
  verification_status, verified_at, public
) VALUES
('au-smsf-property-squad', 'AU SMSF Property Squad',
 'smsf_property', 'independent',
 'Cross-disciplinary squad for SMSF property purchases: SMSF accountant, mortgage broker, buyers agent, and tax planner. We handle setup, LRBA structuring, acquisition, and post-settlement compliance under one engagement.',
 'SMSF property end-to-end',
 'NSW',
 (SELECT id FROM professionals WHERE slug='aisha-rahman-blueprint'),
 (SELECT id FROM professionals WHERE slug='aisha-rahman-blueprint'),
 NULL,
 ARRAY['smsf_property', 'general']::text[], true,
 'verified', NOW(), true),

('cross-border-tax-team', 'Cross-Border Tax Team',
 'foreign_investor', 'independent',
 'Coordinated team for foreign investors and expats with Australian tax exposure. Cross-border tax agent, financial planner, and migration agent collaborate on holistic structuring across residency transitions.',
 'Foreign investor + expat coordination',
 'NSW',
 (SELECT id FROM professionals WHERE slug='kai-tanaka-nexus'),
 (SELECT id FROM professionals WHERE slug='kai-tanaka-nexus'),
 NULL,
 ARRAY['foreign_investor', 'expat', 'general']::text[], true,
 'verified', NOW(), true),

('expat-return-planning', 'Expat Return Planning',
 'expat', 'independent',
 'For Australian expats moving home: super consolidation, foreign-pension wind-down, CGT exit-vs-entry planning, and tax-residency timing. Includes a financial planner and a registered tax agent.',
 'Coming home — financial transition',
 'VIC',
 (SELECT id FROM professionals WHERE slug='leon-fischer-blueprint'),
 (SELECT id FROM professionals WHERE slug='leon-fischer-blueprint'),
 NULL,
 ARRAY['expat', 'general']::text[], true,
 'verified', NOW(), true),

('cbd-commercial-property-team', 'CBD Commercial Property Team',
 'commercial_property', 'same_firm',
 'Acquisition team for SMSF and family-office commercial property. Buyers agent + commercial property advisor + mortgage broker, all within one engagement and one written scope.',
 'Industrial + office acquisitions',
 'NSW',
 (SELECT id FROM professionals WHERE slug='natalie-vaughan-sovereign'),
 (SELECT id FROM professionals WHERE slug='natalie-vaughan-sovereign'),
 (SELECT id FROM advisor_firms WHERE slug='sovereign-property-advisory'),
 ARRAY['commercial_property', 'general']::text[], true,
 'verified', NOW(), true),

('sme-acquisition-team', 'SME Acquisition Team',
 'business_acquisition', 'independent',
 'For buyers of small-to-mid Australian businesses ($500k–$10M): legal due-diligence checklist, financial DD, vendor-finance modelling, and post-completion tax structuring. CFP-led with embedded tax-agent capacity.',
 'Buy-side, $500k–$10M deals',
 'NSW',
 (SELECT id FROM professionals WHERE slug='priya-shah-nexus'),
 (SELECT id FROM professionals WHERE slug='priya-shah-nexus'),
 NULL,
 ARRAY['business_acquisition', 'due_diligence', 'general']::text[], true,
 'verified', NOW(), true)
ON CONFLICT (slug) DO NOTHING;

-- ─── 4. Expert team members ───────────────────────────────────────────────
-- Three active, publicly-visible members per team.

INSERT INTO expert_team_members (
  team_id, professional_id, member_role, public_title,
  can_receive_briefs, can_appear_publicly, status, accepted_at
) VALUES
-- AU SMSF Property Squad
((SELECT id FROM expert_teams WHERE slug='au-smsf-property-squad'),
 (SELECT id FROM professionals WHERE slug='aisha-rahman-blueprint'),
 'lead', 'SMSF accountant & lead', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='au-smsf-property-squad'),
 (SELECT id FROM professionals WHERE slug='oliver-grant-sovereign'),
 'member', 'Buyers agent', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='au-smsf-property-squad'),
 (SELECT id FROM professionals WHERE slug='jordan-blake-coastal'),
 'member', 'Mortgage broker', true, true, 'active', NOW()),

-- Cross-Border Tax Team
((SELECT id FROM expert_teams WHERE slug='cross-border-tax-team'),
 (SELECT id FROM professionals WHERE slug='kai-tanaka-nexus'),
 'lead', 'Cross-border planner', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='cross-border-tax-team'),
 (SELECT id FROM professionals WHERE slug='leon-fischer-blueprint'),
 'member', 'Tax agent', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='cross-border-tax-team'),
 (SELECT id FROM professionals WHERE slug='rachel-okonkwo-apex'),
 'member', 'Migration agent', true, true, 'active', NOW()),

-- Expat Return Planning
((SELECT id FROM expert_teams WHERE slug='expat-return-planning'),
 (SELECT id FROM professionals WHERE slug='leon-fischer-blueprint'),
 'lead', 'Tax agent — lead', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='expat-return-planning'),
 (SELECT id FROM professionals WHERE slug='sara-mitchell-nexus'),
 'member', 'Financial planner', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='expat-return-planning'),
 (SELECT id FROM professionals WHERE slug='kai-tanaka-nexus'),
 'member', 'Cross-border planner', true, true, 'active', NOW()),

-- CBD Commercial Property Team
((SELECT id FROM expert_teams WHERE slug='cbd-commercial-property-team'),
 (SELECT id FROM professionals WHERE slug='natalie-vaughan-sovereign'),
 'lead', 'Commercial property lead', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='cbd-commercial-property-team'),
 (SELECT id FROM professionals WHERE slug='oliver-grant-sovereign'),
 'member', 'Buyers agent', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='cbd-commercial-property-team'),
 (SELECT id FROM professionals WHERE slug='mia-novak-coastal'),
 'member', 'Commercial mortgage broker', true, true, 'active', NOW()),

-- SME Acquisition Team
((SELECT id FROM expert_teams WHERE slug='sme-acquisition-team'),
 (SELECT id FROM professionals WHERE slug='priya-shah-nexus'),
 'lead', 'Acquisition lead — wealth & DD', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='sme-acquisition-team'),
 (SELECT id FROM professionals WHERE slug='leon-fischer-blueprint'),
 'member', 'Tax structuring', true, true, 'active', NOW()),
((SELECT id FROM expert_teams WHERE slug='sme-acquisition-team'),
 (SELECT id FROM professionals WHERE slug='aisha-rahman-blueprint'),
 'member', 'SMSF deal-structure (when relevant)', true, true, 'active', NOW())
ON CONFLICT (team_id, professional_id) DO NOTHING;

  ELSE
    RAISE NOTICE 'Skipping expert_teams seed — table does not exist yet. Apply 20260723_pmp01_provider_marketplace_foundation first, then re-run this migration.';
  END IF;
END
$expert_teams_seed$;

COMMIT;
