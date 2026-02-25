-- Sponsor invoices for recurring sponsorship tier billing
CREATE TABLE IF NOT EXISTS sponsor_invoices (
  id SERIAL PRIMARY KEY,
  broker_slug TEXT NOT NULL,
  tier TEXT NOT NULL,
  amount_cents INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_invoices_slug ON sponsor_invoices(broker_slug);
CREATE INDEX IF NOT EXISTS idx_sponsor_invoices_period ON sponsor_invoices(period_start, period_end);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsor_invoices_unique ON sponsor_invoices(broker_slug, period_start);
