-- Migration: Seed 55 realistic mock advisor accounts
-- Covers all 12 advisor types across all major Australian cities
-- Idempotent: uses ON CONFLICT (slug) DO NOTHING

INSERT INTO professionals (slug, name, firm_name, type, specialties, location_state, location_suburb, location_display, afsl_number, abn, registration_number, bio, photo_url, website, phone, email, fee_structure, fee_description, rating, review_count, verified, status, onboarded_at, profile_complete)
VALUES

-- ═══════════════════════════════════════════════
-- SYDNEY (15 advisors)
-- ═══════════════════════════════════════════════

-- 1. Financial Planner - Sydney CBD
('james-wong-sydney', 'James Wong', 'Harbour Wealth Advisory', 'financial_planner',
 '["Retirement planning", "Investment strategy", "Superannuation optimisation", "Insurance needs analysis"]'::jsonb,
 'NSW', 'Sydney CBD', 'Sydney CBD, NSW',
 'AFSL 301456', '51 623 456 789', NULL,
 'With 18 years of experience in comprehensive financial planning, I help high-net-worth professionals build and protect their wealth. I hold a CFP designation and specialise in pre-retirement strategies for executives and business owners. My approach is evidence-based and fee-transparent.',
 'https://ui-avatars.com/api/?name=James+Wong&size=200&background=random',
 'https://harbourwealth.com.au', '0412 345 678', 'james.wong@harbourwealth.com.au',
 'fee-for-service', 'Initial plan: $3,300. Ongoing advice: $4,400/year. Free 30-min discovery call.',
 4.9, 31, true, 'active', NOW(), true),

-- 2. Tax Agent - Surry Hills
('maria-papadopoulos-sydney', 'Maria Papadopoulos', 'Pacific Tax Solutions', 'tax_agent',
 '["Individual tax returns", "Small business tax", "Capital gains tax", "Investment property deductions", "Cryptocurrency tax"]'::jsonb,
 'NSW', 'Surry Hills', 'Surry Hills, Sydney NSW',
 NULL, '22 789 012 345', 'TAN 87654321',
 'I am a registered tax agent with 14 years of experience helping individuals and small businesses navigate the Australian tax system. CPA-qualified with a specialty in investment property and share portfolio tax optimisation. I make tax straightforward and stress-free.',
 'https://ui-avatars.com/api/?name=Maria+Papadopoulos&size=200&background=random',
 'https://pacifictax.com.au', '0423 456 789', 'maria@pacifictax.com.au',
 'fee-for-service', 'Individual returns from $220. Investment property schedule: $165 extra. Small business BAS: from $330/quarter.',
 4.7, 42, true, 'active', NOW(), true),

-- 3. SMSF Accountant - Parramatta
('raj-patel-sydney', 'Raj Patel', 'Patel & Associates SMSF', 'smsf_accountant',
 '["SMSF setup", "Annual compliance", "SMSF auditing", "Pension phase strategies", "Limited recourse borrowing"]'::jsonb,
 'NSW', 'Parramatta', 'Parramatta, Sydney NSW',
 'AFSL 289012', '33 456 789 012', NULL,
 'As a CPA and SMSF Specialist Advisor, I have helped over 400 trustees establish and manage their self-managed super funds. With 20 years in the industry, I specialise in complex SMSF structures including property purchases through super and pension phase transitions.',
 'https://ui-avatars.com/api/?name=Raj+Patel&size=200&background=random',
 'https://patelsmsf.com.au', '0434 567 890', 'raj@patelsmsf.com.au',
 'fee-for-service', 'SMSF setup: $2,750. Annual compliance: $2,400/year. SMSF audit: $550.',
 4.8, 27, true, 'active', NOW(), true),

-- 4. Mortgage Broker - Bondi
('sophie-laurent-sydney', 'Sophie Laurent', 'Coastal Home Loans', 'mortgage_broker',
 '["First home buyers", "Investment property loans", "Refinancing", "Construction loans", "Low-doc loans"]'::jsonb,
 'NSW', 'Bondi', 'Bondi, Sydney NSW',
 NULL, '44 567 890 123', 'MFAA 12345',
 'As an MFAA-accredited mortgage broker with access to over 40 lenders, I help Sydneysiders find the right home loan — whether you are buying your first property, investing, or refinancing. 8 years of experience and a passion for helping people get into the market sooner.',
 'https://ui-avatars.com/api/?name=Sophie+Laurent&size=200&background=random',
 'https://coastalhomeloans.com.au', '0445 678 901', 'sophie@coastalhomeloans.com.au',
 'commission', 'No cost to you — paid by the lender. Upfront and trail commission disclosed in full.',
 4.6, 35, true, 'active', NOW(), true),

-- 5. Property Advisor - North Sydney
('michael-oconnor-sydney', 'Michael O''Connor', 'Northshore Property Advisory', 'property_advisor',
 '["Property investment strategy", "Portfolio review", "Due diligence", "Suburb research", "Auction bidding"]'::jsonb,
 'NSW', 'North Sydney', 'North Sydney, NSW',
 'AFSL 312890', '55 678 901 234', NULL,
 'With 15 years in property and a background in economics, I help investors build diversified property portfolios across Australia. I am a licensed buyers agent and PIPA-qualified property investment advisor. My data-driven approach has helped clients acquire over $180 million in property.',
 'https://ui-avatars.com/api/?name=Michael+OConnor&size=200&background=random',
 'https://northshorepa.com.au', '0456 789 012', 'michael@northshorepa.com.au',
 'fee-for-service', 'Buyers agent fee: 1.5% of purchase price (min $15,000). Strategy session: $660.',
 4.7, 19, true, 'active', NOW(), true),

-- 6. Estate Planner - Chatswood
('helen-tran-sydney', 'Helen Tran', 'Tran Legal & Estate Planning', 'estate_planner',
 '["Wills and testamentary trusts", "Powers of attorney", "Estate administration", "Succession planning", "Blended family estates"]'::jsonb,
 'NSW', 'Chatswood', 'Chatswood, Sydney NSW',
 NULL, '66 789 012 345', NULL,
 'I am a specialist estate planning lawyer with 12 years of experience helping families protect their assets and wishes. I hold a Masters in Applied Law (Wills & Estates) and am a member of the Succession Law Committee of the Law Society of NSW. I work closely with financial planners to ensure holistic planning.',
 'https://ui-avatars.com/api/?name=Helen+Tran&size=200&background=random',
 'https://tranestateplanning.com.au', '0467 890 123', 'helen@tranestateplanning.com.au',
 'fee-for-service', 'Simple will: $660. Testamentary trust will: $2,200. Enduring power of attorney: $440.',
 4.9, 16, true, 'active', NOW(), true),

-- 7. Insurance Broker - Macquarie Park
('david-kowalski-sydney', 'David Kowalski', 'Shield Insurance Brokers', 'insurance_broker',
 '["Life insurance", "Income protection", "Total & permanent disability", "Trauma cover", "Business insurance"]'::jsonb,
 'NSW', 'Macquarie Park', 'Macquarie Park, Sydney NSW',
 'AFSL 345678', '77 890 123 456', 'QPIB 5678',
 'As a QPIB-qualified insurance broker with 10 years of experience, I help Australians protect themselves and their families with the right insurance coverage. I compare policies across 12+ insurers to find the best fit. I specialise in income protection for self-employed professionals.',
 'https://ui-avatars.com/api/?name=David+Kowalski&size=200&background=random',
 'https://shieldinsurance.com.au', '0478 901 234', 'david@shieldinsurance.com.au',
 'commission', 'No upfront fees — commission paid by insurer. Annual review included free of charge.',
 4.5, 22, true, 'active', NOW(), true),

-- 8. Wealth Manager - Double Bay
('anthony-nguyen-sydney', 'Anthony Nguyen', 'Prestige Wealth Management', 'wealth_manager',
 '["High-net-worth advisory", "Investment portfolio management", "Tax-effective structures", "Intergenerational wealth transfer", "Alternative investments"]'::jsonb,
 'NSW', 'Double Bay', 'Double Bay, Sydney NSW',
 'AFSL 356789', '88 901 234 567', NULL,
 'I manage investment portfolios for high-net-worth individuals and families with $1M+ in investable assets. With 22 years in financial markets — including 8 years at a major Australian bank — I provide institutional-grade investment management with a personal touch. CFP and CFA charterholder.',
 'https://ui-avatars.com/api/?name=Anthony+Nguyen&size=200&background=random',
 'https://prestigewm.com.au', '0489 012 345', 'anthony@prestigewm.com.au',
 'percentage', '0.8% of assets under management per annum. Minimum portfolio: $1,000,000.',
 4.8, 14, true, 'active', NOW(), true),

-- 9. Buyers Agent - Mosman
('emma-richardson-sydney', 'Emma Richardson', 'Richardson Buyers Agency', 'buyers_agent',
 '["Residential buyers agent", "Off-market properties", "Auction bidding", "Property negotiation", "Eastern suburbs specialist"]'::jsonb,
 'NSW', 'Mosman', 'Mosman, Sydney NSW',
 NULL, '99 012 345 678', NULL,
 'As a licensed buyers agent specialising in Sydney''s lower north shore and eastern suburbs, I help busy professionals find and secure the right property without the stress. 9 years as a buyers agent with over $250 million in successful acquisitions. Member of REBAA.',
 'https://ui-avatars.com/api/?name=Emma+Richardson&size=200&background=random',
 'https://richardsonbuyers.com.au', '0490 123 456', 'emma@richardsonbuyers.com.au',
 'fee-for-service', 'Full search service: 2% of purchase price + GST. Auction bidding only: $1,650.',
 4.7, 25, true, 'active', NOW(), true),

-- 10. Crypto Advisor - Ultimo
('daniel-stavros-sydney', 'Daniel Stavros', 'Digital Asset Advisory', 'crypto_advisor',
 '["Cryptocurrency investment", "DeFi strategies", "Crypto tax planning", "Digital asset custody", "Blockchain education"]'::jsonb,
 'NSW', 'Ultimo', 'Ultimo, Sydney NSW',
 'AFSL 367890', '10 123 456 789', NULL,
 'I help Australians navigate the world of digital assets with confidence. With a background in fintech and 6 years specialising in cryptocurrency advisory, I provide regulated advice on crypto portfolio construction, tax obligations, and secure custody solutions. CFP and Certified Digital Asset Advisor.',
 'https://ui-avatars.com/api/?name=Daniel+Stavros&size=200&background=random',
 'https://digitalassetadvisory.com.au', '0401 234 567', 'daniel@digitalassetadvisory.com.au',
 'fee-for-service', 'Crypto strategy session: $495. Portfolio review: $880. Ongoing advisory: $2,200/year.',
 4.4, 11, true, 'active', NOW(), true),

-- 11. Debt Counsellor - Bankstown
('fatima-hassan-sydney', 'Fatima Hassan', 'Fresh Start Financial Counselling', 'debt_counsellor',
 '["Debt consolidation", "Budget coaching", "Hardship applications", "Credit repair", "Bankruptcy alternatives"]'::jsonb,
 'NSW', 'Bankstown', 'Bankstown, Sydney NSW',
 NULL, '21 234 567 890', NULL,
 'I am a qualified financial counsellor helping individuals and families overcome debt stress. With 7 years of experience and a Diploma of Financial Counselling, I work with clients to negotiate with creditors, establish manageable repayment plans, and build financial resilience. Compassionate, judgement-free support.',
 'https://ui-avatars.com/api/?name=Fatima+Hassan&size=200&background=random',
 'https://freshstartfc.com.au', '0412 345 098', 'fatima@freshstartfc.com.au',
 'fee-for-service', 'Initial assessment: Free. Ongoing support package: $165/session. Concession rates available.',
 4.9, 38, true, 'active', NOW(), true),

-- 12. Aged Care Advisor - Hornsby
('margaret-campbell-sydney', 'Margaret Campbell', 'Aged Care Pathways', 'aged_care_advisor',
 '["Aged care placement", "Financial assessment", "Home care packages", "Residential aged care", "DVA entitlements"]'::jsonb,
 'NSW', 'Hornsby', 'Hornsby, Sydney NSW',
 'AFSL 378901', '32 345 678 901', NULL,
 'I specialise in helping families navigate the complex aged care system in Australia. With 11 years as an aged care advisor and a background in nursing, I provide guidance on accommodation options, financial assessments, Centrelink implications, and home care packages. Accredited Aged Care Professional.',
 'https://ui-avatars.com/api/?name=Margaret+Campbell&size=200&background=random',
 'https://agedcarepathways.com.au', '0423 456 098', 'margaret@agedcarepathways.com.au',
 'fee-for-service', 'Aged care assessment: $1,650. Placement assistance: $3,300. Initial phone consultation: Free.',
 4.8, 20, true, 'active', NOW(), true),

-- 13. Financial Planner - Penrith
('chris-murphy-sydney', 'Chris Murphy', 'Western Sydney Financial Planning', 'financial_planner',
 '["Retirement planning", "Centrelink optimisation", "Insurance review", "Super consolidation", "Budgeting"]'::jsonb,
 'NSW', 'Penrith', 'Penrith, Sydney NSW',
 'AFSL 389012', '43 456 789 012', NULL,
 'I provide affordable, jargon-free financial planning for everyday Australians in Western Sydney. With 10 years of experience and a CFP designation, I believe quality financial advice should be accessible to everyone, not just the wealthy. Specialising in retirement planning and super optimisation.',
 'https://ui-avatars.com/api/?name=Chris+Murphy&size=200&background=random',
 'https://wsfp.com.au', '0434 567 098', 'chris@wsfp.com.au',
 'fee-for-service', 'Financial plan: $2,200. Ongoing advice: $1,980/year. Super review: $550.',
 4.6, 29, true, 'active', NOW(), true),

-- 14. Tax Agent - Hurstville
('wei-chen-sydney', 'Wei Chen', 'Chen & Partners Taxation', 'tax_agent',
 '["Business tax", "International tax", "R&D tax incentive", "GST compliance", "Company tax returns"]'::jsonb,
 'NSW', 'Hurstville', 'Hurstville, Sydney NSW',
 NULL, '54 567 890 123', 'TAN 98765432',
 'With 16 years as a registered tax agent and CA qualification, I help small and medium businesses optimise their tax position. I have particular expertise in cross-border taxation for clients with interests in the Asia-Pacific region. Fluent in Mandarin and Cantonese.',
 'https://ui-avatars.com/api/?name=Wei+Chen&size=200&background=random',
 'https://chenpartners.com.au', '0445 678 098', 'wei@chenpartners.com.au',
 'fee-for-service', 'Company tax return from $990. Individual return from $250. BAS preparation from $275/quarter.',
 4.7, 33, true, 'active', NOW(), true),

-- 15. Mortgage Broker - Manly
('luke-thompson-sydney', 'Luke Thompson', 'Beachside Mortgages', 'mortgage_broker',
 '["Refinancing", "First home buyer", "Investment loans", "Self-employed lending", "Bridging finance"]'::jsonb,
 'NSW', 'Manly', 'Manly, Sydney NSW',
 NULL, '65 678 901 234', 'MFAA 23456',
 'I have been helping northern beaches residents secure great home loans for 12 years. As an MFAA-accredited broker with access to 35+ lenders, I take the time to understand your situation and find the loan that truly fits. Specialising in self-employed and contractor lending.',
 'https://ui-avatars.com/api/?name=Luke+Thompson&size=200&background=random',
 'https://beachsidemortgages.com.au', '0456 789 098', 'luke@beachsidemortgages.com.au',
 'commission', 'Free service — lender pays commission. Upfront and trail commission fully disclosed.',
 4.8, 41, true, 'active', NOW(), true),

-- ═══════════════════════════════════════════════
-- MELBOURNE (12 advisors)
-- ═══════════════════════════════════════════════

-- 16. Financial Planner - South Yarra
('olivia-martinez-melbourne', 'Olivia Martinez', 'Yarra Financial Group', 'financial_planner',
 '["Wealth accumulation", "Salary packaging", "Investment strategy", "Ethical investing", "Women''s wealth"]'::jsonb,
 'VIC', 'South Yarra', 'South Yarra, Melbourne VIC',
 'AFSL 401234', '76 789 012 345', NULL,
 'I am passionate about helping women take control of their finances. With 13 years as a financial planner and a CFP designation, I specialise in wealth building for professional women navigating career breaks, divorce, or starting businesses. Evidence-based, values-aligned investing is at the heart of what I do.',
 'https://ui-avatars.com/api/?name=Olivia+Martinez&size=200&background=random',
 'https://yarrafinancial.com.au', '0467 890 123', 'olivia@yarrafinancial.com.au',
 'fee-for-service', 'Comprehensive plan: $3,850. Ongoing advice: $3,300/year. Discovery meeting: Free.',
 4.9, 26, true, 'active', NOW(), true),

-- 17. SMSF Accountant - Carlton
('george-papadimitriou-melbourne', 'George Papadimitriou', 'Melbourne SMSF Centre', 'smsf_accountant',
 '["SMSF administration", "SMSF compliance", "SMSF wind-up", "Corporate trustee setup", "SMSF investment strategy"]'::jsonb,
 'VIC', 'Carlton', 'Carlton, Melbourne VIC',
 'AFSL 412345', '87 890 123 456', NULL,
 'With 25 years in accounting and 15 years specialising in SMSFs, I have managed over 600 self-managed super funds. CPA and SMSF Specialist Advisor with deep expertise in complex fund structures, property within super, and pension strategies. I pride myself on proactive compliance and clear communication.',
 'https://ui-avatars.com/api/?name=George+Papadimitriou&size=200&background=random',
 'https://melbournesmsf.com.au', '0478 901 123', 'george@melbournesmsf.com.au',
 'fee-for-service', 'SMSF setup: $2,900. Annual administration: $2,600/year. Corporate trustee: $1,100.',
 4.7, 34, true, 'active', NOW(), true),

-- 18. Tax Agent - Richmond
('anita-desai-melbourne', 'Anita Desai', 'Desai Tax & Advisory', 'tax_agent',
 '["Individual tax", "Sole trader tax", "Negative gearing", "Share trading tax", "Rental property deductions"]'::jsonb,
 'VIC', 'Richmond', 'Richmond, Melbourne VIC',
 NULL, '98 901 234 567', 'TAN 76543210',
 'I am a CA-qualified registered tax agent with 9 years of experience helping individuals and sole traders maximise their returns. I specialise in property investors and share traders, ensuring you claim everything you are entitled to while staying fully compliant with ATO requirements.',
 'https://ui-avatars.com/api/?name=Anita+Desai&size=200&background=random',
 'https://desaitax.com.au', '0489 012 123', 'anita@desaitax.com.au',
 'fee-for-service', 'Individual return from $198. Share trader schedule from $330. Rental schedule from $165.',
 4.6, 47, true, 'active', NOW(), true),

-- 19. Mortgage Broker - Hawthorn
('tom-fitzgerald-melbourne', 'Tom Fitzgerald', 'Fitzgerald Finance', 'mortgage_broker',
 '["Home loans", "Investment loans", "Commercial lending", "SMSF lending", "Debt restructuring"]'::jsonb,
 'VIC', 'Hawthorn', 'Hawthorn, Melbourne VIC',
 NULL, '09 012 345 678', 'MFAA 34567',
 'With 14 years as a mortgage broker and MFAA accreditation, I have settled over $500 million in home and investment loans. I specialise in complex lending scenarios including SMSF property purchases and commercial lending for small business owners. Panel of 45+ lenders.',
 'https://ui-avatars.com/api/?name=Tom+Fitzgerald&size=200&background=random',
 'https://fitzgeraldfinance.com.au', '0490 123 234', 'tom@fitzgeraldfinance.com.au',
 'commission', 'No broker fees — commission paid by lender. Fully transparent commission disclosure.',
 4.8, 52, true, 'active', NOW(), true),

-- 20. Estate Planner - Toorak
('victoria-aldridge-melbourne', 'Victoria Aldridge', 'Aldridge Estate Law', 'estate_planner',
 '["Complex estate planning", "Testamentary trusts", "Business succession", "Asset protection", "Charitable trusts"]'::jsonb,
 'VIC', 'Toorak', 'Toorak, Melbourne VIC',
 NULL, '10 234 567 890', NULL,
 'I am an accredited estate planning specialist with 17 years in private practice. I help high-net-worth families create robust estate plans that protect wealth across generations. I hold a Masters in Tax Law and work collaboratively with accountants and financial planners to ensure integrated planning.',
 'https://ui-avatars.com/api/?name=Victoria+Aldridge&size=200&background=random',
 'https://aldridgeestatelaw.com.au', '0401 234 345', 'victoria@aldridgeestatelaw.com.au',
 'fee-for-service', 'Testamentary trust will: $3,300. Business succession plan: $5,500. Initial consultation: $330.',
 4.9, 12, true, 'active', NOW(), true),

-- 21. Insurance Broker - Docklands
('sam-ibrahim-melbourne', 'Sam Ibrahim', 'Ibrahim Insurance Solutions', 'insurance_broker',
 '["Life insurance", "Income protection", "Key person insurance", "Business overhead cover", "Group insurance"]'::jsonb,
 'VIC', 'Docklands', 'Docklands, Melbourne VIC',
 'AFSL 423456', '21 345 678 901', 'QPIB 6789',
 'As a QPIB-accredited insurance broker with 11 years of experience, I help professionals and business owners protect their most important asset — their ability to earn. I compare policies from 15+ insurers and provide ongoing claims support. Specialising in income protection for medical professionals.',
 'https://ui-avatars.com/api/?name=Sam+Ibrahim&size=200&background=random',
 'https://ibrahiminsurance.com.au', '0412 345 456', 'sam@ibrahiminsurance.com.au',
 'commission', 'No upfront fees — insurer pays commission. Free annual review and claims assistance.',
 4.6, 18, true, 'active', NOW(), true),

-- 22. Wealth Manager - Collins Street
('alexander-reid-melbourne', 'Alexander Reid', 'Reid Capital Partners', 'wealth_manager',
 '["Family office services", "Private equity access", "Fixed income strategy", "Currency hedging", "Philanthropic advisory"]'::jsonb,
 'VIC', 'Melbourne CBD', 'Melbourne CBD, VIC',
 'AFSL 434567', '32 456 789 012', NULL,
 'I lead a boutique wealth management firm serving ultra-high-net-worth families with $5M+ in investable assets. With 28 years in financial markets including 12 years at a global investment bank, I bring institutional capabilities to private wealth management. CFA Charterholder.',
 'https://ui-avatars.com/api/?name=Alexander+Reid&size=200&background=random',
 'https://reidcapital.com.au', '0423 456 567', 'alexander@reidcapital.com.au',
 'percentage', '0.65% of AUM per annum. Minimum portfolio: $5,000,000. Performance fee on alternatives.',
 4.8, 8, true, 'active', NOW(), true),

-- 23. Buyers Agent - Brunswick
('nina-volkov-melbourne', 'Nina Volkov', 'Inner North Buyers Agency', 'buyers_agent',
 '["Inner north specialist", "First home buyers", "Off-market sourcing", "Apartment assessment", "Renovation potential"]'::jsonb,
 'VIC', 'Brunswick', 'Brunswick, Melbourne VIC',
 NULL, '43 567 890 123', NULL,
 'I am a licensed buyers agent specialising in Melbourne''s inner north — Brunswick, Fitzroy, Northcote, and surrounds. With 7 years as a buyers agent and a background in architecture, I bring a unique eye for property potential and renovation opportunity. Member of REBAA.',
 'https://ui-avatars.com/api/?name=Nina+Volkov&size=200&background=random',
 'https://innernorthbuyers.com.au', '0434 567 678', 'nina@innernorthbuyers.com.au',
 'fee-for-service', 'Full search: 2% + GST. Assess and negotiate only: $8,800. Auction bidding: $1,100.',
 4.7, 21, true, 'active', NOW(), true),

-- 24. Crypto Advisor - Fitzroy
('liam-chen-melbourne', 'Liam Chen', 'Blockchain Wealth Advisory', 'crypto_advisor',
 '["Bitcoin strategy", "Crypto portfolio", "NFT advisory", "DeFi yield", "Crypto estate planning"]'::jsonb,
 'VIC', 'Fitzroy', 'Fitzroy, Melbourne VIC',
 'AFSL 445678', '54 678 901 234', NULL,
 'I provide licensed financial advice on digital assets, bridging the gap between traditional finance and the crypto ecosystem. With 5 years in crypto advisory and a prior career in software engineering, I help clients integrate digital assets into a diversified portfolio. CFP and Certified Bitcoin Professional.',
 'https://ui-avatars.com/api/?name=Liam+Chen&size=200&background=random',
 'https://blockchainwealth.com.au', '0445 678 789', 'liam@blockchainwealth.com.au',
 'fee-for-service', 'Crypto strategy session: $550. Portfolio construction: $1,100. Ongoing advisory: $1,980/year.',
 4.3, 9, true, 'active', NOW(), true),

-- 25. Debt Counsellor - Footscray
('jenny-le-melbourne', 'Jenny Le', 'New Horizons Financial Counselling', 'debt_counsellor',
 '["Consumer debt", "Mortgage stress", "Centrelink disputes", "Utility hardship", "Financial capability"]'::jsonb,
 'VIC', 'Footscray', 'Footscray, Melbourne VIC',
 NULL, '65 789 012 345', NULL,
 'I am a registered financial counsellor passionate about helping people in Melbourne''s west escape the cycle of debt. With 8 years of experience and qualifications in financial counselling and community services, I provide free and confidential support. I speak Vietnamese and English fluently.',
 'https://ui-avatars.com/api/?name=Jenny+Le&size=200&background=random',
 'https://newhorizonsfc.com.au', '0456 789 890', 'jenny@newhorizonsfc.com.au',
 'fee-for-service', 'Free financial counselling service. Funded by community grants. No cost to clients.',
 4.9, 44, true, 'active', NOW(), true),

-- 26. Aged Care Advisor - Camberwell
('patricia-wright-melbourne', 'Patricia Wright', 'Eldercare Advisory Services', 'aged_care_advisor',
 '["Residential aged care", "In-home care", "Financial assessment", "Centrelink aged pension", "Respite care"]'::jsonb,
 'VIC', 'Camberwell', 'Camberwell, Melbourne VIC',
 'AFSL 456789', '76 890 123 456', NULL,
 'With 13 years as an aged care advisor and a former career in nursing management, I guide families through every step of the aged care journey. From understanding home care packages to navigating the means-tested fee structure, I provide clarity during a difficult time. Accredited Aged Care Professional.',
 'https://ui-avatars.com/api/?name=Patricia+Wright&size=200&background=random',
 'https://eldercareadvisory.com.au', '0467 890 901', 'patricia@eldercareadvisory.com.au',
 'fee-for-service', 'Comprehensive aged care plan: $2,200. Placement assistance: $3,850. Phone consultation: Free.',
 4.8, 15, true, 'active', NOW(), true),

-- 27. Property Advisor - St Kilda
('nick-constantine-melbourne', 'Nick Constantine', 'Port Phillip Property Advisory', 'property_advisor',
 '["Bayside property", "Investment analysis", "Development feasibility", "Vendor advocacy", "Market research"]'::jsonb,
 'VIC', 'St Kilda', 'St Kilda, Melbourne VIC',
 'AFSL 467890', '87 901 234 567', NULL,
 'I help investors and owner-occupiers make smarter property decisions across Melbourne''s bayside and inner-city suburbs. With 11 years in the property industry and a degree in property economics, I provide independent, data-driven advice. Licensed estate agent and PIPA member.',
 'https://ui-avatars.com/api/?name=Nick+Constantine&size=200&background=random',
 'https://portphillippa.com.au', '0478 901 012', 'nick@portphillippa.com.au',
 'fee-for-service', 'Buyers agent: 1.8% + GST. Property assessment: $770. Strategy session: $550.',
 4.5, 17, true, 'active', NOW(), true),

-- ═══════════════════════════════════════════════
-- BRISBANE (8 advisors)
-- ═══════════════════════════════════════════════

-- 28. Financial Planner - Fortitude Valley
('ben-walker-brisbane', 'Ben Walker', 'Walker Financial Planning', 'financial_planner',
 '["Retirement planning", "Super strategies", "Insurance advice", "Salary sacrifice", "First-time investors"]'::jsonb,
 'QLD', 'Fortitude Valley', 'Fortitude Valley, Brisbane QLD',
 'AFSL 478901', '98 012 345 678', NULL,
 'I make financial planning approachable for Queenslanders. With 8 years as a CFP professional, I specialise in helping young professionals and first-time investors get their financial foundations right. Fee-only, no product commissions, and always in your corner.',
 'https://ui-avatars.com/api/?name=Ben+Walker&size=200&background=random',
 'https://walkerfp.com.au', '0489 012 123', 'ben@walkerfp.com.au',
 'fee-for-service', 'Financial plan: $2,750. Ongoing advice: $2,420/year. Free 20-minute intro call.',
 4.7, 23, true, 'active', NOW(), true),

-- 29. SMSF Accountant - Toowong
('karen-li-brisbane', 'Karen Li', 'Queensland SMSF Solutions', 'smsf_accountant',
 '["SMSF establishment", "Annual compliance", "Pension commencement", "SMSF property", "Member insurance"]'::jsonb,
 'QLD', 'Toowong', 'Toowong, Brisbane QLD',
 'AFSL 489012', '09 123 456 789', NULL,
 'I am a CPA-qualified SMSF specialist with 12 years of experience helping Queenslanders take control of their superannuation. I manage over 200 funds and pride myself on proactive service, timely lodgements, and clear communication. SMSF Association member and registered SMSF auditor.',
 'https://ui-avatars.com/api/?name=Karen+Li&size=200&background=random',
 'https://qldsmsf.com.au', '0490 123 234', 'karen@qldsmsf.com.au',
 'fee-for-service', 'SMSF setup: $2,500. Annual compliance: $2,200/year. Investment strategy review: $440.',
 4.6, 19, true, 'active', NOW(), true),

-- 30. Mortgage Broker - New Farm
('josh-anderson-brisbane', 'Josh Anderson', 'River City Home Loans', 'mortgage_broker',
 '["Owner-occupier loans", "Investment property", "First home guarantee", "Construction finance", "SMSF lending"]'::jsonb,
 'QLD', 'New Farm', 'New Farm, Brisbane QLD',
 NULL, '10 345 678 901', 'MFAA 45678',
 'I have been helping Brisbanites get into homes and investments for 11 years. As an award-winning MFAA broker, I work with 40+ lenders to find the right loan for your situation. Especially experienced with the Queensland first home owner grant and family guarantee loans.',
 'https://ui-avatars.com/api/?name=Josh+Anderson&size=200&background=random',
 'https://rivercityhomeloans.com.au', '0401 234 345', 'josh@rivercityhomeloans.com.au',
 'commission', 'Zero cost to borrower — lender pays all fees. Full commission disclosure provided.',
 4.8, 58, true, 'active', NOW(), true),

-- 31. Tax Agent - Paddington (QLD)
('rachel-green-brisbane', 'Rachel Green', 'Green Tax & Accounting', 'tax_agent',
 '["Small business tax", "Sole trader returns", "BAS and GST", "FBT compliance", "Tax planning"]'::jsonb,
 'QLD', 'Paddington', 'Paddington, Brisbane QLD',
 NULL, '21 456 789 012', 'TAN 65432109',
 'I am a registered tax agent and CPA with 10 years of experience helping Brisbane small businesses stay on top of their tax obligations. I specialise in trades, hospitality, and professional services businesses. Proactive tax planning, not just compliance.',
 'https://ui-avatars.com/api/?name=Rachel+Green&size=200&background=random',
 'https://greentax.com.au', '0412 345 456', 'rachel@greentax.com.au',
 'fee-for-service', 'Individual return from $220. Sole trader from $385. Company return from $880.',
 4.5, 36, true, 'active', NOW(), true),

-- 32. Estate Planner - Ascot
('stuart-mackenzie-brisbane', 'Stuart Mackenzie', 'Mackenzie Wills & Estates', 'estate_planner',
 '["Wills", "Enduring power of attorney", "Advance health directive", "Estate disputes", "Probate"]'::jsonb,
 'QLD', 'Ascot', 'Ascot, Brisbane QLD',
 NULL, '32 567 890 123', NULL,
 'As a Queensland Law Society accredited specialist in succession law, I have 19 years of experience drafting wills, establishing testamentary trusts, and resolving estate disputes. I work closely with families to ensure their wishes are clearly documented and legally sound.',
 'https://ui-avatars.com/api/?name=Stuart+Mackenzie&size=200&background=random',
 'https://mackenziewills.com.au', '0423 456 567', 'stuart@mackenziewills.com.au',
 'fee-for-service', 'Simple will: $550. Mirror wills (couple): $880. Testamentary trust will: $2,750.',
 4.8, 13, true, 'active', NOW(), true),

-- 33. Insurance Broker - West End
('tanya-russo-brisbane', 'Tanya Russo', 'Guardian Risk Insurance', 'insurance_broker',
 '["Life insurance", "Total & permanent disability", "Income protection", "Child cover", "Insurance within super"]'::jsonb,
 'QLD', 'West End', 'West End, Brisbane QLD',
 'AFSL 490123', '43 678 901 234', 'QPIB 7890',
 'With 8 years as a QPIB-qualified insurance broker, I help families and professionals protect what matters most. I compare policies across major Australian insurers and specialise in structuring insurance within superannuation for tax efficiency. Claims support is a core part of my service.',
 'https://ui-avatars.com/api/?name=Tanya+Russo&size=200&background=random',
 'https://guardianrisk.com.au', '0434 567 678', 'tanya@guardianrisk.com.au',
 'commission', 'No upfront fees — paid by insurer. Annual review and claims support included.',
 4.6, 15, true, 'active', NOW(), true),

-- 34. Buyers Agent - Bulimba
('hassan-ali-brisbane', 'Hassan Ali', 'Brisbane Buyers Collective', 'buyers_agent',
 '["Inner-city Brisbane", "House and land packages", "Auction strategy", "Off-market sourcing", "Interstate investors"]'::jsonb,
 'QLD', 'Bulimba', 'Bulimba, Brisbane QLD',
 NULL, '54 789 012 345', NULL,
 'I help local and interstate buyers find the right property in Brisbane''s growth corridors. With 6 years as a licensed buyers agent and deep knowledge of Brisbane''s inner suburbs, I provide end-to-end acquisition services. Member of REBAA and PIPA.',
 'https://ui-avatars.com/api/?name=Hassan+Ali&size=200&background=random',
 'https://brisbanebuyers.com.au', '0445 678 789', 'hassan@brisbanebuyers.com.au',
 'fee-for-service', 'Full search: 2.2% + GST. Appraisal and negotiation: $7,700. Auction bidding: $1,320.',
 4.5, 14, true, 'active', NOW(), true),

-- 35. Wealth Manager - Hamilton
('diana-zhou-brisbane', 'Diana Zhou', 'Meridian Wealth Partners', 'wealth_manager',
 '["Portfolio management", "Private wealth", "Tax-effective investing", "Managed accounts", "Retirement income"]'::jsonb,
 'QLD', 'Hamilton', 'Hamilton, Brisbane QLD',
 'AFSL 501234', '65 890 123 456', NULL,
 'I manage investment portfolios for Queensland professionals and retirees with $500k+ in investable assets. With 16 years in financial markets and CFA and CFP qualifications, I combine rigorous analysis with personalised service to help clients grow and protect their wealth.',
 'https://ui-avatars.com/api/?name=Diana+Zhou&size=200&background=random',
 'https://meridianwealth.com.au', '0456 789 890', 'diana@meridianwealth.com.au',
 'percentage', '0.9% of AUM per annum. Minimum portfolio: $500,000. No entry or exit fees.',
 4.7, 11, true, 'active', NOW(), true),

-- ═══════════════════════════════════════════════
-- PERTH (5 advisors)
-- ═══════════════════════════════════════════════

-- 36. Financial Planner - Subiaco
('andrew-mitchell-perth', 'Andrew Mitchell', 'Mitchell Financial Advisory', 'financial_planner',
 '["Mining sector specialisation", "Redundancy planning", "Investment strategy", "FIFO worker planning", "Super optimisation"]'::jsonb,
 'WA', 'Subiaco', 'Subiaco, Perth WA',
 'AFSL 512345', '76 901 234 567', NULL,
 'I specialise in financial planning for WA''s mining and resources sector professionals. With 15 years of experience and a CFP designation, I understand the unique financial challenges of FIFO workers, contractors, and mining executives — from managing irregular income to planning for career transitions.',
 'https://ui-avatars.com/api/?name=Andrew+Mitchell&size=200&background=random',
 'https://mitchellfa.com.au', '0467 890 901', 'andrew@mitchellfa.com.au',
 'fee-for-service', 'Comprehensive plan: $3,300. FIFO financial roadmap: $1,650. Ongoing advice: $3,520/year.',
 4.7, 20, true, 'active', NOW(), true),

-- 37. Tax Agent - Fremantle
('lisa-tan-perth', 'Lisa Tan', 'Fremantle Tax Centre', 'tax_agent',
 '["Individual tax", "Investment property", "Small business", "PAYG instalment", "Crypto tax reporting"]'::jsonb,
 'WA', 'Fremantle', 'Fremantle, Perth WA',
 NULL, '87 012 345 678', 'TAN 54321098',
 'I am a CPA-qualified registered tax agent serving the Fremantle and south-of-river Perth community for 11 years. I make tax time painless and proactive — helping clients maximise deductions, plan for capital gains, and stay ahead of ATO requirements. Friendly, efficient service.',
 'https://ui-avatars.com/api/?name=Lisa+Tan&size=200&background=random',
 'https://fremantletax.com.au', '0478 901 012', 'lisa@fremantletax.com.au',
 'fee-for-service', 'Individual return from $195. Rental property schedule: $143. Crypto tax report: $330.',
 4.6, 28, true, 'active', NOW(), true),

-- 38. Mortgage Broker - Cottesloe
('ryan-kelly-perth', 'Ryan Kelly', 'WA Home Finance', 'mortgage_broker',
 '["Home purchase", "Refinancing", "Investment lending", "Regional WA property", "First home owners"]'::jsonb,
 'WA', 'Cottesloe', 'Cottesloe, Perth WA',
 NULL, '98 123 456 789', 'MFAA 56789',
 'As Perth''s leading independent mortgage broker with 13 years in the industry, I have helped over 1,500 Western Australians secure the right home loan. MFAA-accredited with access to 50+ lenders, including specialist lenders for regional WA properties.',
 'https://ui-avatars.com/api/?name=Ryan+Kelly&size=200&background=random',
 'https://wahomefinance.com.au', '0489 012 123', 'ryan@wahomefinance.com.au',
 'commission', 'Free to borrowers — lender pays commission. No hidden fees, full transparency.',
 4.8, 45, true, 'active', NOW(), true),

-- 39. SMSF Accountant - West Perth
('deepak-sharma-perth', 'Deepak Sharma', 'Sharma SMSF & Tax', 'smsf_accountant',
 '["SMSF administration", "Annual audit", "Pension strategies", "SMSF wind-up", "ATO compliance"]'::jsonb,
 'WA', 'West Perth', 'West Perth, WA',
 'AFSL 523456', '09 234 567 890', NULL,
 'I am a CPA and SMSF Specialist Advisor with 14 years of experience managing self-managed super funds for Western Australian families. I provide end-to-end SMSF services from setup to wind-up, with a focus on proactive compliance and clear reporting.',
 'https://ui-avatars.com/api/?name=Deepak+Sharma&size=200&background=random',
 'https://sharmasmsf.com.au', '0490 123 234', 'deepak@sharmasmsf.com.au',
 'fee-for-service', 'SMSF setup: $2,600. Annual compliance: $2,300/year. SMSF audit: $495.',
 4.6, 16, true, 'active', NOW(), true),

-- 40. Property Advisor - Claremont
('jessica-harris-perth', 'Jessica Harris', 'Perth Property Insights', 'property_advisor',
 '["WA property market", "Investment analysis", "Suburb research", "Development site assessment", "FIFO investor strategy"]'::jsonb,
 'WA', 'Claremont', 'Claremont, Perth WA',
 'AFSL 534567', '10 345 678 901', NULL,
 'I help investors navigate Perth''s unique property market with data-driven insights and local expertise. With 9 years as a property advisor and a background in urban planning, I specialise in identifying high-growth suburbs and emerging corridors in metropolitan and regional WA.',
 'https://ui-avatars.com/api/?name=Jessica+Harris&size=200&background=random',
 'https://perthpropertyinsights.com.au', '0401 234 345', 'jessica@perthpropertyinsights.com.au',
 'fee-for-service', 'Property strategy session: $550. Suburb research report: $880. Buyers agent: 1.8% + GST.',
 4.5, 12, true, 'active', NOW(), true),

-- ═══════════════════════════════════════════════
-- ADELAIDE (4 advisors)
-- ═══════════════════════════════════════════════

-- 41. Financial Planner - Unley
('peter-rossi-adelaide', 'Peter Rossi', 'Rossi Financial Services', 'financial_planner',
 '["Retirement income", "Centrelink strategies", "Estate planning integration", "Ethical investing", "Super consolidation"]'::jsonb,
 'SA', 'Unley', 'Unley, Adelaide SA',
 'AFSL 545678', '21 456 789 012', NULL,
 'I have been helping South Australians plan for a comfortable retirement for 20 years. As a CFP professional with a passion for ethical investing, I help clients align their investments with their values without sacrificing returns. Specialising in pre-retirees aged 50-65.',
 'https://ui-avatars.com/api/?name=Peter+Rossi&size=200&background=random',
 'https://rossifinancial.com.au', '0412 345 456', 'peter@rossifinancial.com.au',
 'fee-for-service', 'Retirement plan: $2,970. Ongoing advice: $2,640/year. Centrelink optimisation: $660.',
 4.8, 24, true, 'active', NOW(), true),

-- 42. Tax Agent - Norwood
('sarah-campbell-adelaide', 'Sarah Campbell', 'Campbell & Co Accounting', 'tax_agent',
 '["Individual tax", "Partnership returns", "Trust tax", "BAS lodgement", "Tax planning"]'::jsonb,
 'SA', 'Norwood', 'Norwood, Adelaide SA',
 NULL, '32 567 890 123', 'TAN 43210987',
 'I am a CA-qualified registered tax agent with 13 years of experience serving Adelaide''s small business community. I specialise in trusts, partnerships, and family business structures. My goal is proactive tax planning year-round, not just at tax time.',
 'https://ui-avatars.com/api/?name=Sarah+Campbell&size=200&background=random',
 'https://campbellco.com.au', '0423 456 567', 'sarah@campbellco.com.au',
 'fee-for-service', 'Individual return from $220. Trust return from $770. Tax planning session: $385.',
 4.7, 30, true, 'active', NOW(), true),

-- 43. Mortgage Broker - Glenelg
('mark-katsaros-adelaide', 'Mark Katsaros', 'Adelaide Lending Solutions', 'mortgage_broker',
 '["Home loans", "Refinancing", "Construction loans", "Investment property", "First home buyers"]'::jsonb,
 'SA', 'Glenelg', 'Glenelg, Adelaide SA',
 NULL, '43 678 901 234', 'MFAA 67890',
 'With 10 years as an MFAA-accredited mortgage broker in Adelaide, I have helped hundreds of South Australians find the right home loan. Specialising in first home buyers and the HomeBuilder and First Home Owner Grant schemes. Access to 35+ lenders.',
 'https://ui-avatars.com/api/?name=Mark+Katsaros&size=200&background=random',
 'https://adelaidelending.com.au', '0434 567 678', 'mark@adelaidelending.com.au',
 'commission', 'Zero broker fees — paid by lender. Transparent commission disclosure at every stage.',
 4.6, 37, true, 'active', NOW(), true),

-- 44. Estate Planner - Hyde Park
('catherine-singh-adelaide', 'Catherine Singh', 'Singh Estate Planning', 'estate_planner',
 '["Wills", "Testamentary trusts", "Enduring powers of attorney", "Advance care directives", "Probate"]'::jsonb,
 'SA', 'Hyde Park', 'Hyde Park, Adelaide SA',
 NULL, '54 789 012 345', NULL,
 'I am a Law Society of SA accredited specialist in wills and estates with 14 years of experience. I help Adelaide families create comprehensive estate plans that protect their assets and provide for their loved ones. I work in close collaboration with accountants and financial planners.',
 'https://ui-avatars.com/api/?name=Catherine+Singh&size=200&background=random',
 'https://singhestate.com.au', '0445 678 789', 'catherine@singhestate.com.au',
 'fee-for-service', 'Simple will: $495. Mirror wills: $770. Testamentary trust will: $2,420.',
 4.9, 10, true, 'active', NOW(), true),

-- ═══════════════════════════════════════════════
-- CANBERRA (3 advisors)
-- ═══════════════════════════════════════════════

-- 45. Financial Planner - Kingston
('robert-jenkins-canberra', 'Robert Jenkins', 'Capital Financial Planning', 'financial_planner',
 '["Public sector super (CSS/PSS)", "Defined benefit analysis", "Redundancy planning", "Military super (MSBS)", "Investment strategy"]'::jsonb,
 'ACT', 'Kingston', 'Kingston, Canberra ACT',
 'AFSL 556789', '65 890 123 456', NULL,
 'I specialise in financial planning for Australian Public Service employees and Defence personnel. With 17 years of experience and expertise in CSS, PSS, and MSBS defined benefit schemes, I help public servants maximise their unique super entitlements. CFP and Fellow of the FPA.',
 'https://ui-avatars.com/api/?name=Robert+Jenkins&size=200&background=random',
 'https://capitalfp.com.au', '0456 789 890', 'robert@capitalfp.com.au',
 'fee-for-service', 'Defined benefit analysis: $1,980. Comprehensive plan: $3,520. Ongoing advice: $3,300/year.',
 4.9, 22, true, 'active', NOW(), true),

-- 46. Tax Agent - Braddon
('elena-petrov-canberra', 'Elena Petrov', 'Petrov Tax Advisory', 'tax_agent',
 '["Public sector employees", "Rental properties", "Share portfolios", "Capital gains", "Salary sacrifice optimisation"]'::jsonb,
 'ACT', 'Braddon', 'Braddon, Canberra ACT',
 NULL, '76 901 234 567', 'TAN 32109876',
 'I am a registered tax agent and CPA with 9 years of experience serving Canberra''s public service community. I understand the unique tax considerations for APS employees, including salary sacrifice, HECS repayments, and relocation allowances. Efficient, accurate, and always available.',
 'https://ui-avatars.com/api/?name=Elena+Petrov&size=200&background=random',
 'https://petrovtax.com.au', '0467 890 901', 'elena@petrovtax.com.au',
 'fee-for-service', 'Individual return from $220. Rental property schedule: $154. Share portfolio: $220.',
 4.6, 25, true, 'active', NOW(), true),

-- 47. SMSF Accountant - Woden
('philip-chang-canberra', 'Philip Chang', 'ACT SMSF Advisory', 'smsf_accountant',
 '["SMSF setup", "Compliance", "Pension strategies", "SMSF investment", "Defined benefit rollovers"]'::jsonb,
 'ACT', 'Woden', 'Woden, Canberra ACT',
 'AFSL 567890', '87 012 345 678', NULL,
 'I am a CPA and SMSF Specialist Advisor with 11 years of experience helping Canberra professionals transition from defined benefit schemes to SMSFs. I provide end-to-end SMSF services with a focus on maximising outcomes for public sector retirees rolling over CSS/PSS benefits.',
 'https://ui-avatars.com/api/?name=Philip+Chang&size=200&background=random',
 'https://actsmsf.com.au', '0478 901 012', 'philip@actsmsf.com.au',
 'fee-for-service', 'SMSF setup: $2,750. Annual compliance: $2,400/year. Defined benefit rollover analysis: $880.',
 4.7, 14, true, 'active', NOW(), true),

-- ═══════════════════════════════════════════════
-- HOBART (2 advisors)
-- ═══════════════════════════════════════════════

-- 48. Financial Planner - Battery Point
('amanda-jones-hobart', 'Amanda Jones', 'Island Financial Planning', 'financial_planner',
 '["Retirement planning", "Centrelink", "Insurance review", "Super consolidation", "Downsizer contributions"]'::jsonb,
 'TAS', 'Battery Point', 'Battery Point, Hobart TAS',
 'AFSL 578901', '98 123 456 789', NULL,
 'I am Tasmania''s most experienced independent financial planner with 21 years of practice. As a CFP professional, I help Tasmanians plan for retirement with a focus on Centrelink optimisation and downsizer super contributions. I believe every Tasmanian deserves access to quality financial advice.',
 'https://ui-avatars.com/api/?name=Amanda+Jones&size=200&background=random',
 'https://islandfp.com.au', '0489 012 123', 'amanda@islandfp.com.au',
 'fee-for-service', 'Financial plan: $2,420. Ongoing advice: $1,980/year. Centrelink strategy: $550.',
 4.8, 18, true, 'active', NOW(), true),

-- 49. Mortgage Broker - Sandy Bay
('nathan-williams-hobart', 'Nathan Williams', 'Hobart Home Loans', 'mortgage_broker',
 '["First home buyer", "Refinancing", "Rural property", "Investment loans", "Tasmanian market specialist"]'::jsonb,
 'TAS', 'Sandy Bay', 'Sandy Bay, Hobart TAS',
 NULL, '09 234 567 890', 'MFAA 78901',
 'I am Hobart''s go-to mortgage broker with 7 years of local experience. Specialising in Tasmania''s unique property market, I help first-time buyers, interstate investors, and refinancers navigate lending options from 30+ lenders. MFAA-accredited and deeply connected to the Tasmanian community.',
 'https://ui-avatars.com/api/?name=Nathan+Williams&size=200&background=random',
 'https://hobarthomeloans.com.au', '0490 123 234', 'nathan@hobarthomeloans.com.au',
 'commission', 'No cost to you — lender pays commission. Transparent, no-pressure service.',
 4.7, 32, true, 'active', NOW(), true),

-- ═══════════════════════════════════════════════
-- GOLD COAST (2 advisors)
-- ═══════════════════════════════════════════════

-- 50. Financial Planner - Broadbeach
('steve-hall-goldcoast', 'Steve Hall', 'Gold Coast Wealth Advisory', 'financial_planner',
 '["Retirement planning", "Investment portfolio", "Small business owners", "Insurance", "Superannuation"]'::jsonb,
 'QLD', 'Broadbeach', 'Broadbeach, Gold Coast QLD',
 'AFSL 589012', '10 345 678 901', NULL,
 'With 12 years on the Gold Coast, I help local business owners and professionals build wealth and plan for retirement. CFP-qualified with a focus on practical, actionable strategies. I believe the best financial plan is the one you actually follow.',
 'https://ui-avatars.com/api/?name=Steve+Hall&size=200&background=random',
 'https://gcwealth.com.au', '0401 234 345', 'steve@gcwealth.com.au',
 'fee-for-service', 'Financial plan: $2,750. Ongoing advice: $2,640/year. Business owner strategy: $1,650.',
 4.6, 17, true, 'active', NOW(), true),

-- 51. Property Advisor - Surfers Paradise
('tina-nguyen-goldcoast', 'Tina Nguyen', 'Coastal Property Advisory', 'property_advisor',
 '["Gold Coast property", "Holiday rental investment", "Off-the-plan assessment", "Beachside suburbs", "Interstate investor guidance"]'::jsonb,
 'QLD', 'Surfers Paradise', 'Surfers Paradise, Gold Coast QLD',
 'AFSL 590123', '21 456 789 012', NULL,
 'I help investors make smart property decisions on the Gold Coast and south-east Queensland. With 8 years in the local market and a real estate licence, I specialise in high-growth beachside and hinterland suburbs. I provide independent advice free from developer commissions.',
 'https://ui-avatars.com/api/?name=Tina+Nguyen&size=200&background=random',
 'https://coastalpa.com.au', '0412 345 456', 'tina@coastalpa.com.au',
 'fee-for-service', 'Buyers agent: 2% + GST. Property assessment: $660. Suburb analysis: $440.',
 4.5, 13, true, 'active', NOW(), true),

-- ═══════════════════════════════════════════════
-- ADDITIONAL TO REACH 55+ (Darwin, Newcastle, Wollongong, Sunshine Coast)
-- ═══════════════════════════════════════════════

-- 52. Tax Agent - Darwin
('marco-santos-darwin', 'Marco Santos', 'Top End Tax & Business', 'tax_agent',
 '["Small business tax", "Mining and resources workers", "Zone tax offset", "Indigenous business", "BAS preparation"]'::jsonb,
 'NT', 'Darwin CBD', 'Darwin CBD, NT',
 NULL, '32 567 890 123', 'TAN 21098765',
 'I am a registered tax agent and CPA based in Darwin with 10 years of experience helping Top End workers and businesses. Specialising in zone tax offsets, FIFO worker deductions, and Indigenous business advisory. I understand the unique tax landscape of the Northern Territory.',
 'https://ui-avatars.com/api/?name=Marco+Santos&size=200&background=random',
 'https://topendtax.com.au', '0423 456 567', 'marco@topendtax.com.au',
 'fee-for-service', 'Individual return from $220. Zone offset assessment: included. Small business from $660.',
 4.5, 15, true, 'active', NOW(), true),

-- 53. Debt Counsellor - Newcastle
('laura-smith-newcastle', 'Laura Smith', 'Hunter Valley Financial Counselling', 'debt_counsellor',
 '["Consumer debt", "Mortgage stress", "Small business debt", "Centrelink issues", "Financial hardship"]'::jsonb,
 'NSW', 'Newcastle', 'Newcastle, NSW',
 NULL, '43 678 901 234', NULL,
 'I am a registered financial counsellor serving the Hunter Valley and Newcastle region. With 6 years of experience, I provide free and confidential support to individuals and families experiencing financial hardship. Diploma of Financial Counselling and member of Financial Counselling Australia.',
 'https://ui-avatars.com/api/?name=Laura+Smith&size=200&background=random',
 'https://huntervalleyfc.com.au', '0434 567 678', 'laura@huntervalleyfc.com.au',
 'fee-for-service', 'Free service. Funded by community grants and government support. No cost to clients.',
 4.9, 29, true, 'active', NOW(), true),

-- 54. Aged Care Advisor - Wollongong
('bruce-taylor-wollongong', 'Bruce Taylor', 'Illawarra Aged Care Solutions', 'aged_care_advisor',
 '["Aged care placement", "Home care packages", "Financial assessment", "Veterans aged care", "Respite care"]'::jsonb,
 'NSW', 'Wollongong', 'Wollongong, NSW',
 'AFSL 601234', '54 789 012 345', NULL,
 'With 9 years as an aged care advisor serving the Illawarra region, I help families find the right care solution for their loved ones. From navigating My Aged Care to understanding RADs and DAPs, I provide clear guidance through a complex system. Accredited Aged Care Professional.',
 'https://ui-avatars.com/api/?name=Bruce+Taylor&size=200&background=random',
 'https://illawarraaged.com.au', '0445 678 789', 'bruce@illawarraaged.com.au',
 'fee-for-service', 'Aged care assessment: $1,430. Full placement service: $2,970. Initial call: Free.',
 4.7, 11, true, 'active', NOW(), true),

-- 55. Crypto Advisor - Sunshine Coast
('zac-miller-sunshinecoast', 'Zac Miller', 'Hinterland Digital Wealth', 'crypto_advisor',
 '["Bitcoin investment", "Crypto portfolio", "DeFi advisory", "Crypto tax compliance", "Web3 strategy"]'::jsonb,
 'QLD', 'Maroochydore', 'Maroochydore, Sunshine Coast QLD',
 'AFSL 612345', '65 890 123 456', NULL,
 'I provide regulated financial advice on cryptocurrency and digital assets from the Sunshine Coast. With 4 years as a specialist crypto advisor and a background in IT, I help investors understand blockchain technology and build responsible digital asset allocations. Certified Digital Asset Advisor and CFP.',
 'https://ui-avatars.com/api/?name=Zac+Miller&size=200&background=random',
 'https://hinterlanddigital.com.au', '0456 789 890', 'zac@hinterlanddigital.com.au',
 'fee-for-service', 'Crypto intro session: $330. Portfolio review: $770. Ongoing advisory: $1,760/year.',
 4.3, 7, true, 'active', NOW(), true)

ON CONFLICT (slug) DO NOTHING;
