-- Seed the first 5 Australian full-service stockbroker firms.
--
-- Sources: each firm's public AFSL listing on the ASIC Financial
-- Services Register, the firm's own "about" page, and publicly
-- available ASX Market Participant data. No claims are made that
-- couldn't be verified from primary public sources.
--
-- The profiles are intentionally neutral ("who this firm may suit")
-- and avoid any personal recommendation language — this is general
-- information only, as per the GENERAL_ADVICE_WARNING shown on every
-- page of the new vertical.
--
-- Before running this in production: have the wording reviewed by a
-- financial services compliance lawyer. Specifically flag any claim
-- about AUM, fees, or "suitable for" phrasing for sign-off.
--
-- All minimums and fee models are illustrative placeholders based on
-- each firm's publicly stated approach. Do not quote specific fee
-- amounts or thresholds without confirming with the firm directly.

INSERT INTO public.professionals (
  slug, name, firm_name, type, firm_type,
  specialties, location_state, location_display,
  afsl_number, bio,
  fee_structure, fee_description,
  fee_model, minimum_investment_cents, service_tiers,
  research_offering, year_founded, office_states, aum_aud_billions,
  status, verified, rating, review_count,
  ideal_client, accepting_new_clients,
  created_at, updated_at
) VALUES
-- ─── Morgans Financial ─────────────────────────────────────────────
(
  'morgans-financial',
  'Morgans Financial',
  'Morgans Financial Limited',
  'stockbroker_firm',
  'mid-tier',
  ARRAY['Australian Equities', 'Fixed Income & Bonds', 'IPOs & Capital Raisings', 'Managed Portfolios', 'SMSF Stockbroking'],
  'QLD',
  'Brisbane (national network)',
  '235410',
  'Morgans is one of Australia''s largest full-service stockbroking networks, with offices in every mainland state and a national research team covering ASX-listed equities, fixed income and hybrids. The firm provides advisory, discretionary and execution-only services through authorised representatives across the country. A Morgans adviser typically works alongside clients on long-term portfolio construction, corporate actions and capital raising access. Morgans has historically been associated with self-directed investors who want research plus adviser support on major decisions, rather than full discretionary management.',
  'hybrid',
  'Individually negotiated fees. Standard structure is a brokerage commission per trade plus, for advisory clients, an annual advice fee or a percentage of portfolio value. Minimums and fees vary by adviser and service tier — contact Morgans directly for a current fee schedule.',
  'hybrid',
  25000000,  -- $250k indicative minimum for advisory relationship
  '[
    {"name": "Execution-only", "description": "Trade placement with research access but no personal advice. Suits self-directed investors."},
    {"name": "Advisory", "min_investment_cents": 25000000, "description": "Personal advice on recommendations; client retains decision rights."},
    {"name": "Private Client / Discretionary", "min_investment_cents": 100000000, "description": "Fully managed portfolio across equities, fixed income and hybrids."}
  ]'::jsonb,
  'Dedicated research desk covering 200+ ASX-listed companies, daily market commentary, sector notes and IPO/placement access for eligible clients.',
  1987,
  ARRAY['QLD', 'NSW', 'VIC', 'WA', 'SA', 'TAS', 'ACT'],
  NULL,
  'active',
  false,
  0,
  0,
  'Long-term investors with $250k+ who want research and adviser support on ASX, fixed income and capital-raising opportunities.',
  true,
  NOW(), NOW()
),
-- ─── Ord Minnett ──────────────────────────────────────────────────
(
  'ord-minnett',
  'Ord Minnett',
  'Ord Minnett Limited',
  'stockbroker_firm',
  'mid-tier',
  ARRAY['Australian Equities', 'International Equities', 'Fixed Income & Bonds', 'Managed Portfolios', 'Corporate Advisory'],
  'NSW',
  'Sydney (national network)',
  '237121',
  'Ord Minnett is a long-established Australian full-service stockbroker with a history dating back to 1952. The firm operates across advisory, private wealth and institutional broking, with offices in most capital cities. It has a particularly strong presence in the Australian high-net-worth segment and runs a dedicated research desk covering domestic and international equities. Ord Minnett''s advisers typically work with long-term investors building concentrated ASX portfolios alongside managed fund and fixed income allocations.',
  'hybrid',
  'Fee structure is individually negotiated and varies by service tier. Standard model is brokerage per trade combined with an advisory fee for relationship clients; discretionary clients pay a percentage of AUM. Contact Ord Minnett for current fee schedules.',
  'hybrid',
  50000000,  -- $500k indicative minimum
  '[
    {"name": "Advisory", "min_investment_cents": 50000000, "description": "Personal advice on ASX equities, managed funds and fixed income."},
    {"name": "Private Wealth", "min_investment_cents": 200000000, "description": "Integrated wealth management across asset classes and structures."},
    {"name": "Discretionary Portfolio", "min_investment_cents": 500000000, "description": "Fully managed discretionary portfolio tailored to the client mandate."}
  ]'::jsonb,
  'In-house research covering ASX-listed equities, global markets, macro and fixed income. Regular published research notes and client investment committee views.',
  1952,
  ARRAY['NSW', 'VIC', 'QLD', 'WA', 'SA', 'ACT'],
  NULL,
  'active',
  false,
  0,
  0,
  'Investors with $500k+ seeking an advised relationship covering ASX, international equities and managed funds.',
  true,
  NOW(), NOW()
),
-- ─── Shaw and Partners ────────────────────────────────────────────
(
  'shaw-and-partners',
  'Shaw and Partners',
  'Shaw and Partners Limited',
  'stockbroker_firm',
  'mid-tier',
  ARRAY['Australian Equities', 'Fixed Income & Bonds', 'IPOs & Capital Raisings', 'Managed Portfolios', 'Ethical / ESG Investing'],
  'NSW',
  'Sydney (national network)',
  '236048',
  'Shaw and Partners is an independent Australian full-service wealth management and stockbroking firm. The business operates across private wealth, corporate finance and capital markets, with advisers in every mainland state. Shaw has a reputation for access to small and mid-cap Australian equities research and IPO placements, alongside more traditional managed portfolio services. The firm suits clients who want direct adviser contact plus exposure to capital raising deal flow.',
  'hybrid',
  'Fees negotiated individually based on service tier and portfolio size. Mix of brokerage, advisory fees and percentage-based charges for discretionary accounts. Contact Shaw for a current fee schedule.',
  'hybrid',
  25000000,  -- $250k indicative minimum
  '[
    {"name": "Advisory", "min_investment_cents": 25000000, "description": "Personal advice with access to research and capital-raising deal flow."},
    {"name": "Private Wealth Portfolio", "min_investment_cents": 150000000, "description": "Actively managed multi-asset portfolio with direct adviser contact."}
  ]'::jsonb,
  'Dedicated small and mid-cap Australian equities research, IPO and placement access, regular research notes and company visit coverage.',
  1987,
  ARRAY['NSW', 'VIC', 'QLD', 'WA', 'SA', 'ACT'],
  NULL,
  'active',
  false,
  0,
  0,
  'Active investors with $250k+ who want direct access to Australian equity research and new-issue placement deal flow.',
  true,
  NOW(), NOW()
),
-- ─── Bell Potter Securities ───────────────────────────────────────
(
  'bell-potter-securities',
  'Bell Potter Securities',
  'Bell Potter Securities Limited',
  'stockbroker_firm',
  'mid-tier',
  ARRAY['Australian Equities', 'IPOs & Capital Raisings', 'Corporate Advisory', 'Managed Portfolios', 'Institutional Research'],
  'VIC',
  'Melbourne (national network)',
  '243480',
  'Bell Potter Securities is the stockbroking arm of Bell Financial Group and one of Australia''s longer-established full-service broking firms. It combines a retail advisory business with institutional equities research and a corporate finance arm that has been involved in a notable share of Australian IPOs and capital raisings. Bell Potter''s retail advisers provide personal advice across ASX-listed equities, managed funds and fixed income, with access to the firm''s in-house research and new-issue deal flow.',
  'hybrid',
  'Brokerage per trade plus advisory or AUM fees for managed relationships. Fees are individually negotiated. Contact Bell Potter for current fee schedules.',
  'hybrid',
  25000000,  -- $250k indicative minimum
  '[
    {"name": "Advisory", "min_investment_cents": 25000000, "description": "Personal advice on ASX equities and managed funds with research access."},
    {"name": "Portfolio Service", "min_investment_cents": 100000000, "description": "Actively managed portfolios with quarterly reporting."}
  ]'::jsonb,
  'Institutional-grade equities research team with daily notes, sector reports and strong IPO / placement deal flow through Bell Potter''s corporate finance business.',
  1970,
  ARRAY['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS'],
  NULL,
  'active',
  false,
  0,
  0,
  'Investors with $250k+ who value research depth and access to IPO and capital-raising allocations.',
  true,
  NOW(), NOW()
),
-- ─── Wilsons ───────────────────────────────────────────────────────
(
  'wilsons-advisory',
  'Wilsons Advisory',
  'Wilsons Advisory and Stockbroking Limited',
  'stockbroker_firm',
  'boutique',
  ARRAY['Australian Equities', 'Managed Portfolios', 'Fixed Income & Bonds', 'Discretionary Management', 'IPOs & Capital Raisings'],
  'NSW',
  'Sydney / Brisbane / Melbourne',
  '238375',
  'Wilsons Advisory is a private client wealth management and stockbroking firm positioned as a boutique alternative to the bank-owned private banks. Wilsons runs a managed portfolio service, a dedicated equities research team and a capital markets business. The firm''s client base skews toward high-net-worth individuals who want a named adviser and a concentrated Australian equities exposure alongside managed funds and fixed income. Wilsons has a reputation for adviser longevity and client retention.',
  'hybrid',
  'Advisory and managed-portfolio services charged as a percentage of portfolio value; execution-only trades charged per transaction. Fees negotiated individually — contact Wilsons for current schedules.',
  'percent_aum',
  50000000,  -- $500k indicative minimum
  '[
    {"name": "Advisory", "min_investment_cents": 50000000, "description": "Personal advice with direct access to research and adviser."},
    {"name": "Managed Portfolio Service", "min_investment_cents": 100000000, "description": "Actively managed multi-asset portfolios with quarterly reviews."},
    {"name": "Discretionary Management", "min_investment_cents": 250000000, "description": "Full discretionary portfolio management mandate."}
  ]'::jsonb,
  'Dedicated Australian equities research team with daily notes, focused model portfolios and access to the firm''s corporate finance capital-raising pipeline.',
  1895,
  ARRAY['NSW', 'QLD', 'VIC'],
  NULL,
  'active',
  false,
  0,
  0,
  'HNW investors with $500k+ seeking a named adviser, concentrated ASX exposure and access to capital-raising deal flow.',
  true,
  NOW(), NOW()
)
ON CONFLICT (slug) DO NOTHING;
