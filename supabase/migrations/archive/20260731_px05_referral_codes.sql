-- Date: 2026-07-31
-- Audit ref: docs/plans/PLATFORM_EXPANSION_BRIEF.md
-- Queue item: PX-05 (Referral programme)
-- Why: The /api/referrals GET handler and /account/referrals UI are already
--   built but reference a `referral_codes` table that was never migrated.
--   This migration creates that table so the existing code becomes functional.
--   Column names match what /api/referrals/route.ts already queries.
-- Idempotency: IF NOT EXISTS guards throughout; safe to re-apply.
-- Rollback: DROP TABLE IF EXISTS referral_claims; DROP TABLE IF EXISTS referral_codes;

BEGIN;

CREATE TABLE IF NOT EXISTS referral_codes (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id BIGINT REFERENCES professionals(id) ON DELETE SET NULL,
  reward_type   TEXT NOT NULL DEFAULT 'pro_1month'
                CHECK (reward_type IN ('pro_1month', 'pro_3months', 'advisor_credit')),
  max_uses      INT NOT NULL DEFAULT 100,
  uses          INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  UNIQUE(user_id)   -- one code per user
);

CREATE TABLE IF NOT EXISTS referral_claims (
  id              BIGSERIAL PRIMARY KEY,
  code_id         BIGINT NOT NULL REFERENCES referral_codes(id) ON DELETE RESTRICT,
  claimant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_applied  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(claimant_user_id)   -- one claim per user lifetime
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code    ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_claims_code   ON referral_claims(code_id);
CREATE INDEX IF NOT EXISTS idx_referral_claims_user   ON referral_claims(claimant_user_id);

ALTER TABLE referral_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_claims ENABLE ROW LEVEL SECURITY;
FORCE ROW LEVEL SECURITY ON referral_codes;
FORCE ROW LEVEL SECURITY ON referral_claims;

DROP POLICY IF EXISTS "User reads own referral code"  ON referral_codes;
DROP POLICY IF EXISTS "User reads own referral claims" ON referral_claims;
DROP POLICY IF EXISTS "Service role all on referral_codes"  ON referral_codes;
DROP POLICY IF EXISTS "Service role all on referral_claims" ON referral_claims;

CREATE POLICY "User reads own referral code"
  ON referral_codes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User reads own referral claims"
  ON referral_claims FOR SELECT
  USING (claimant_user_id = auth.uid());

CREATE POLICY "Service role all on referral_codes"
  ON referral_codes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role all on referral_claims"
  ON referral_claims FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
