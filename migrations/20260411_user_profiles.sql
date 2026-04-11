-- User profiles for account personalization and onboarding
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  investing_experience text CHECK (investing_experience IN ('beginner', 'intermediate', 'advanced')),
  investment_goals text CHECK (investment_goals IN ('growth', 'income', 'preservation', 'speculation')),
  portfolio_size text CHECK (portfolio_size IN ('under_10k', '10k_50k', '50k_200k', '200k_500k', 'over_500k')),
  interested_in text[] DEFAULT '{}',
  preferred_broker text,
  state text CHECK (state IN ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only access their own profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
