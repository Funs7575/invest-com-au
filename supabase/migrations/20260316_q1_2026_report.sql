-- Migration: Q1 2026 Quarterly Industry Report
-- Inserts the first published quarterly report

CREATE TABLE IF NOT EXISTS quarterly_reports (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  cover_image_url TEXT,
  executive_summary TEXT,
  sections JSONB DEFAULT '[]',
  key_findings JSONB DEFAULT '[]',
  fee_changes_summary JSONB DEFAULT '[]',
  new_entrants JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO quarterly_reports (
  title,
  slug,
  quarter,
  year,
  executive_summary,
  sections,
  key_findings,
  fee_changes_summary,
  new_entrants,
  status,
  published_at
) VALUES (
  'Q1 2026 Australian Broker Industry Report',
  'q1-2026-australian-broker-industry-report',
  'Q1',
  2026,
  'The first quarter of 2026 saw continued fee compression across major Australian retail brokers, driven by intensifying competition from US-headquartered entrants. ASX brokerage for trades under $5,000 fell to an average of $5.82, down 11% from Q4 2025. International trading costs remain the key differentiator, with spreads ranging from 0% to 0.60% on USD/AUD conversion.',
  '[
    {
      "heading": "Fee Trends",
      "body": "ASX brokerage continued its downward trajectory in Q1 2026. CommSec reduced its standard rate from $19.95 to $14.95 for trades under $10,000, while Stake maintained its no-brokerage model for ASX trades. The average brokerage per trade (sub-$5k) across the 18 platforms we track fell to $5.82 — an 11% decline from $6.51 in Q4 2025. US equities remain a battleground: Webull and Stake both offer zero-commission US trades, while CMC Markets and Bell Direct continue to charge per-trade fees of USD $0.01/share. FX conversion markups are the hidden cost: spreads range from 0% (Stake, absorbed into spread) to 0.60% (CommSec International), with an industry median of 0.35%."
    },
    {
      "heading": "Platform Changes",
      "body": "Three platforms made significant product changes during Q1 2026. moomoo expanded its Australian product to include CHESS-sponsored holdings for ASX shares, previously a competitive disadvantage. eToro launched a dedicated ISA-equivalent savings account product targeting long-term ETF investors. Superhero completed its merger integration with Raiz, resulting in a unified app expected to launch in Q2 2026. CHESS sponsorship remains a key decision factor for 68% of Australian retail investors surveyed in our February 2026 panel (n=412), up from 61% in the prior year."
    },
    {
      "heading": "Regulatory Environment",
      "body": "ASIC''s review of payment for order flow (PFOF) practices concluded in February 2026 with new disclosure requirements effective 1 July 2026. Platforms offering zero-commission trading will be required to disclose execution quality metrics quarterly, including average spread and fill rate. The ATO confirmed that crypto-to-crypto swaps remain taxable events in its updated guidance released January 2026, affecting platforms with integrated crypto trading. Several platforms have added CGT calculation tools in response."
    },
    {
      "heading": "Market Flows",
      "body": "ETF inflows dominated retail activity in Q1 2026, with Vanguard, iShares, and BetaShares products accounting for 54% of all ASX equity volume on retail platforms — up from 48% in Q1 2025. NVIDIA, Tesla, and Palantir remained the most-held international stocks across retail portfolios. The ASX 200 ended Q1 up 4.2%, with materials and technology as the strongest sectors. Retail broker platform traffic reached an estimated 2.1 million monthly active users across the sector, according to SimilarWeb data."
    }
  ]',
  '[
    "Average ASX brokerage (sub-$5k trades) fell 11% QoQ to $5.82, driven by CommSec''s fee cut",
    "moomoo gained CHESS sponsorship, removing a key objection for CHESS-focused investors",
    "ASIC''s PFOF review introduces mandatory quarterly execution quality disclosures from July 2026",
    "ETF products now account for 54% of retail ASX equity volume, up 6 percentage points YoY",
    "FX markup remains the most opaque cost — industry range is 0%–0.60%, median 0.35%",
    "Superhero-Raiz merger integration nearing completion; unified app expected Q2 2026"
  ]',
  '[
    {"broker": "CommSec", "field": "ASX brokerage (under $10k)", "old_value": "$19.95", "new_value": "$14.95"},
    {"broker": "moomoo", "field": "CHESS sponsorship", "old_value": "No", "new_value": "Yes"},
    {"broker": "eToro", "field": "Savings account product", "old_value": "Not available", "new_value": "Launched Q1 2026"}
  ]',
  '["eToro Savings Account", "moomoo CHESS-sponsored ASX"]',
  'published',
  NOW()
) ON CONFLICT (slug) DO NOTHING;
