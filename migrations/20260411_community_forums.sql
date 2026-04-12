-- Community Forums
-- Categories, threads, posts, reputation, moderation

-- Forum categories (pre-seeded, admin-managed)
CREATE TABLE IF NOT EXISTS forum_categories (
  id serial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text, -- icon name for UI
  color text DEFAULT '#0f172a',
  sort_order int DEFAULT 0,
  thread_count int DEFAULT 0,
  post_count int DEFAULT 0,
  last_thread_id int,
  last_post_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz DEFAULT now()
);

-- Forum threads
CREATE TABLE IF NOT EXISTS forum_threads (
  id serial PRIMARY KEY,
  category_id int NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  body text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  is_removed boolean DEFAULT false,
  reply_count int DEFAULT 0,
  view_count int DEFAULT 0,
  vote_score int DEFAULT 0,
  last_reply_at timestamptz,
  last_reply_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Forum posts (replies)
CREATE TABLE IF NOT EXISTS forum_posts (
  id serial PRIMARY KEY,
  thread_id int NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  body text NOT NULL,
  is_accepted boolean DEFAULT false,
  is_removed boolean DEFAULT false,
  vote_score int DEFAULT 0,
  parent_id int REFERENCES forum_posts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Forum votes (threads + posts)
CREATE TABLE IF NOT EXISTS forum_votes (
  id serial PRIMARY KEY,
  target_type text NOT NULL CHECK (target_type IN ('thread', 'post')),
  target_id int NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE(target_type, target_id, user_id)
);

-- User forum profiles (reputation, badges)
CREATE TABLE IF NOT EXISTS forum_user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  reputation int DEFAULT 0,
  thread_count int DEFAULT 0,
  post_count int DEFAULT 0,
  badge text CHECK (badge IN ('newcomer', 'contributor', 'expert', 'moderator')),
  is_moderator boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id, is_removed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id, is_removed, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_target ON forum_votes(target_type, target_id);

-- RLS
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_user_profiles ENABLE ROW LEVEL SECURITY;

-- Public read for threads and posts
CREATE POLICY "Public can read threads" ON forum_threads FOR SELECT USING (NOT is_removed);
CREATE POLICY "Public can read posts" ON forum_posts FOR SELECT USING (NOT is_removed);
CREATE POLICY "Public can read forum profiles" ON forum_user_profiles FOR SELECT USING (true);

-- Auth users can create/edit own
CREATE POLICY "Users can create threads" ON forum_threads FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own threads" ON forum_threads FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can create posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own posts" ON forum_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can vote" ON forum_votes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own forum profile" ON forum_user_profiles FOR ALL USING (auth.uid() = user_id);

-- Seed categories
INSERT INTO forum_categories (slug, name, description, icon, color, sort_order) VALUES
  ('share-trading', 'Share Trading', 'ASX & international share investing discussion', 'trending-up', '#059669', 1),
  ('etfs-index-funds', 'ETFs & Index Funds', 'Passive investing, ETF selection, and portfolio construction', 'pie-chart', '#2563eb', 2),
  ('crypto', 'Cryptocurrency', 'Bitcoin, Ethereum, altcoins, and DeFi discussion', 'bitcoin', '#f59e0b', 3),
  ('super-retirement', 'Super & Retirement', 'Superannuation strategies, SMSFs, and retirement planning', 'piggy-bank', '#7c3aed', 4),
  ('property', 'Property Investment', 'Residential, commercial, REITs, and property strategies', 'home', '#dc2626', 5),
  ('tax-strategy', 'Tax & Strategy', 'Capital gains, franking credits, negative gearing, and tax planning', 'calculator', '#0891b2', 6),
  ('broker-reviews', 'Broker Reviews & Feedback', 'Share your experiences with brokers and platforms', 'star', '#ea580c', 7),
  ('beginners', 'Beginners Corner', 'New to investing? Ask anything here — no question is too basic', 'sprout', '#16a34a', 8),
  ('off-topic', 'Off Topic', 'Market news, general finance chat, and everything else', 'message-circle', '#64748b', 9)
ON CONFLICT (slug) DO NOTHING;
