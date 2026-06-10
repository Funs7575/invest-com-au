-- ============================================================================
-- Migration: 20260725180100_seed_expert_teams.sql
-- Purpose: Seed 5 verified public expert_teams (with 3 active members each)
--          for the unified /advisors directory. Companion to
--          20260725180000_seed_firms_and_expert_teams.sql which seeds
--          the firms + firm-member professionals.
--
-- Depends on: 20260723_pmp01_provider_marketplace_foundation.sql which
--             creates public.expert_teams + public.expert_team_members.
--             If that foundation migration has not been applied, this
--             seed will fail with `relation "expert_teams" does not exist`
--             — by design (fail loudly so the foundation gets applied
--             first, instead of silently no-op and never being re-run
--             after foundation lands). The previous DO $$ ... IF EXISTS
--             $$ guard caused exactly that silent-skip pattern in
--             Codex review on PR #865.
--
-- Rollback: in reverse order:
--   1. DELETE FROM expert_team_members WHERE team_id IN
--        (SELECT id FROM expert_teams WHERE slug IN (...));
--   2. DELETE FROM expert_teams WHERE slug IN (
--        'au-smsf-property-squad', 'cross-border-tax-team',
--        'expat-return-planning', 'cbd-commercial-property-team',
--        'sme-acquisition-team');
--
-- Risk: low — all seeded rows are mock content. Idempotent via
--       ON CONFLICT DO NOTHING.
-- ============================================================================

BEGIN;

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



COMMIT;
