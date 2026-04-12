-- Referral program: codes and tracking
CREATE TABLE IF NOT EXISTS referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id serial PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded')),
  reward_granted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_id) -- a user can only be referred once
);

-- RLS: users can only read their own referral code
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referral code"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own referral code"
  ON referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS: users can read referrals where they are the referrer
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals as referrer"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can read own referral as referred"
  ON referrals FOR SELECT
  USING (auth.uid() = referred_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- Review incentive system
CREATE TABLE IF NOT EXISTS incentive_reviews (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_slug text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  body text NOT NULL,
  pros text[] DEFAULT '{}',
  cons text[] DEFAULT '{}',
  incentive_claimed boolean DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, broker_slug) -- one review per broker per user
);

ALTER TABLE incentive_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own incentive reviews"
  ON incentive_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incentive reviews"
  ON incentive_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_incentive_reviews_user ON incentive_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_incentive_reviews_broker ON incentive_reviews(broker_slug);

-- Personalized digest tracking
CREATE TABLE IF NOT EXISTS digest_sends (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_date date NOT NULL,
  sent_at timestamptz DEFAULT now(),
  sections_included text[] DEFAULT '{}',
  UNIQUE(user_id, digest_date)
);

ALTER TABLE digest_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own digest sends"
  ON digest_sends FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_digest_sends_user_date ON digest_sends(user_id, digest_date);
