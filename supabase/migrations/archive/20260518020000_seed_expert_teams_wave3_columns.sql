-- Migration: backfill wave-3 (#896) expert_teams columns on the 5 seeded teams.
--
-- The wave-3 expert-teams ops upgrade (20260518230000) added specialty_tags,
-- auto_claim_mode, auto_claim_member_ids, last_auto_claim_index. The earlier
-- seed migration (20260725180100_seed_expert_teams.sql) pre-dated those
-- columns, so the seeded rows landed on defaults: `specialty_tags='{}'` and
-- `auto_claim_mode='manual'`. This left /teams/[slug] pages with empty
-- specialty pills and no team in round-robin mode, which made dogfood
-- testing of the wave-3 surfaces impossible without first running an
-- Ops-settings flow.
--
-- This migration backfills realistic dogfood data:
--   - Specialty tags per category (drawn from the same preset suggestions
--     the OpsSettingsClient component shows in /teams/[slug]/settings/ops).
--   - One team (au-smsf-property-squad) is flipped to round_robin so the
--     auto-claim behaviour can be exercised end-to-end against the seeded
--     3-member roster (lead first, then the two regular members).
--
-- Idempotent: every UPDATE is scoped by slug and writes a stable value,
-- so re-runs are no-ops. Safe to apply alongside any future seed refresh.
--
-- Rollback (only meaningful for a manual hand-edit, not a versioned
-- rollback — the seed values are intentional defaults):
--   UPDATE public.expert_teams
--     SET specialty_tags = '{}',
--         auto_claim_mode = 'manual',
--         auto_claim_member_ids = '{}',
--         last_auto_claim_index = 0
--   WHERE slug IN ('au-smsf-property-squad', 'cross-border-tax-team',
--                  'expat-return-planning', 'cbd-commercial-property-team',
--                  'sme-acquisition-team');

BEGIN;

UPDATE public.expert_teams
SET specialty_tags = ARRAY['lrba', 'first_smsf', 'commercial_in_smsf', 'nsw_metro', 'vic_metro'],
    auto_claim_mode = 'round_robin',
    auto_claim_member_ids = ARRAY[276, 148, 279],
    last_auto_claim_index = 0
WHERE slug = 'au-smsf-property-squad';

UPDATE public.expert_teams
SET specialty_tags = ARRAY['dual_resident', 'expat_us', 'expat_uk', 'qrops', 'fatca']
WHERE slug = 'cross-border-tax-team';

UPDATE public.expert_teams
SET specialty_tags = ARRAY['returning_resident', 'super_consolidation', 'tax_residency', 'dasp_reversal']
WHERE slug = 'expat-return-planning';

UPDATE public.expert_teams
SET specialty_tags = ARRAY['sydney_cbd', 'melbourne_cbd', 'office', 'retail', 'industrial']
WHERE slug = 'cbd-commercial-property-team';

UPDATE public.expert_teams
SET specialty_tags = ARRAY['business_valuation', 'due_diligence', 'seller_finance', 'cafe_franchise', 'online_business']
WHERE slug = 'sme-acquisition-team';

COMMIT;
