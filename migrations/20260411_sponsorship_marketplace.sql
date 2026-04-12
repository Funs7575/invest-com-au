-- Sponsorship self-serve marketplace orders
CREATE TABLE IF NOT EXISTS sponsorship_orders (
  id SERIAL PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('featured_partner', 'category_sponsor', 'deal_of_month')),
  category_slug TEXT,
  duration_months INT NOT NULL CHECK (duration_months IN (1, 3, 6, 12)),
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  amount_cents INT NOT NULL,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sponsorship_orders_status ON sponsorship_orders (status);
CREATE INDEX idx_sponsorship_orders_email ON sponsorship_orders (contact_email);

-- Advisor lead auction system
CREATE TABLE IF NOT EXISTS advisor_auctions (
  id SERIAL PRIMARY KEY,
  lead_id INT NOT NULL,
  lead_type TEXT NOT NULL,
  location TEXT,
  budget_range TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'expired')),
  ends_at TIMESTAMPTZ NOT NULL,
  winning_bid_id INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_advisor_auctions_status ON advisor_auctions (status);
CREATE INDEX idx_advisor_auctions_ends_at ON advisor_auctions (ends_at);

CREATE TABLE IF NOT EXISTS advisor_auction_bids (
  id SERIAL PRIMARY KEY,
  auction_id INT NOT NULL REFERENCES advisor_auctions (id) ON DELETE CASCADE,
  advisor_id INT NOT NULL,
  bid_amount INT NOT NULL CHECK (bid_amount >= 5000), -- minimum $50 in cents
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (auction_id, advisor_id)
);

CREATE INDEX idx_advisor_auction_bids_auction ON advisor_auction_bids (auction_id);
CREATE INDEX idx_advisor_auction_bids_advisor ON advisor_auction_bids (advisor_id);
