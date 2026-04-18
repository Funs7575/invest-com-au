import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Professional, ProfessionalType } from "@/lib/types";
import type { Metadata } from "next";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import AdvisorsClient from "../AdvisorsClient";

export const revalidate = 1800;

const SLUG_TO_TYPE: Record<string, ProfessionalType> = {
  "smsf-accountants": "smsf_accountant",
  "financial-planners": "financial_planner",
  "property-advisors": "property_advisor",
  "tax-agents": "tax_agent",
  "mortgage-brokers": "mortgage_broker",
  "estate-planners": "estate_planner",
  "insurance-brokers": "insurance_broker",
  "buyers-agents": "buyers_agent",
  "real-estate-agents": "real_estate_agent",
  "wealth-managers": "wealth_manager",
  "aged-care-advisors": "aged_care_advisor",
  "crypto-advisors": "crypto_advisor",
  "debt-counsellors": "debt_counsellor",
  // New types — /advisors/mining-lawyers etc. route through this
  // dynamic page rather than needing their own folder. `migration-agents`
  // is NOT listed here because app/advisors/migration-agents/page.tsx
  // already exists as a specialist (boolean-flag) page and takes
  // precedence over this dynamic route.
  "mining-lawyers": "mining_lawyer",
  "mining-tax-advisors": "mining_tax_advisor",
  "business-brokers": "business_broker",
  "commercial-lawyers": "commercial_lawyer",
  "rural-property-agents": "rural_property_agent",
  "commercial-property-agents": "commercial_property_agent",
  "energy-consultants": "energy_consultant",
  // New — oil-gas expansion (20260429)
  "energy-financial-planners": "energy_financial_planner",
  "resources-fund-managers": "resources_fund_manager",
  "foreign-investment-lawyers": "foreign_investment_lawyer",
  "petroleum-royalties-advisors": "petroleum_royalties_advisor",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  "smsf-accountants": "Compare verified SMSF accountants across Australia. Specialists in SMSF setup, compliance, audit, and tax planning.",
  "financial-planners": "Find a qualified financial planner for retirement planning, wealth management, super consolidation, and investment strategy.",
  "property-advisors": "Browse property investment advisors who can help with investment property analysis, SMSF property, and portfolio construction.",
  "tax-agents": "Find tax agents specialising in investment tax, CGT optimisation, crypto tax, and complex investment structures.",
  "mortgage-brokers": "Compare mortgage brokers for investment property loans, refinancing, and home loan structuring.",
  "estate-planners": "Find estate planning specialists for wills, trusts, succession planning, and intergenerational wealth transfer.",
  "insurance-brokers": "Compare insurance brokers for life insurance, TPD, income protection, and general insurance across Australia.",
  "buyers-agents": "Find qualified buyers agents to help you find, evaluate, and negotiate investment property purchases.",
  "real-estate-agents": "Compare licensed real estate agents across Australia for selling residential and investment property. Find agents with strong local sales records.",
  "wealth-managers": "Browse wealth managers for high-net-worth portfolio management, asset allocation, and comprehensive wealth strategy.",
  "aged-care-advisors": "Find aged care advisors who specialise in residential aged care, home care packages, means testing, and retirement transitions.",
  "crypto-advisors": "Compare crypto and digital asset advisors for portfolio construction, tax planning, and DeFi strategy in Australia.",
  "debt-counsellors": "Find accredited debt counsellors for debt consolidation, hardship applications, budgeting, and financial recovery.",
  "mining-lawyers": "Find specialist mining lawyers for tenement acquisitions, joint ventures, FIRB applications and environmental approvals. Essential for foreign investors in Australian mining.",
  "mining-tax-advisors": "Find mining tax advisors specialising in PRRT, royalties, cross-border transfer pricing, and tax-effective project structuring for resources investors.",
  "business-brokers": "Compare business brokers across Australia. Business sale advisory, valuations, buyer introductions and succession planning for SMEs and franchise networks.",
  "commercial-lawyers": "Find commercial lawyers for contracts, M&A, corporate structuring, shareholder agreements and cross-border transactions.",
  "rural-property-agents": "Compare rural property agents specialising in farms, cattle stations, viticulture, horticulture and agricultural land across Australia.",
  "commercial-property-agents": "Find commercial property agents for office, industrial, retail and healthcare asset sales, leasing and tenant representation.",
  "energy-consultants": "Find energy consultants specialising in renewables project development, PPAs, grid connection, carbon credit strategy and energy transition advisory.",
  "energy-financial-planners": "Find fee-for-service financial planners who specialise in concentrated ASX energy stock portfolios, franking credit strategy, SMSF oil & gas allocations, and tax planning for refinery and LNG sector professionals.",
  "resources-fund-managers": "Compare wholesale and retail Australian resources fund managers — long-only, long-short, and energy transition funds with disclosed AUM, fee structures, and hurdle benchmarks.",
  "foreign-investment-lawyers": "Find specialist FIRB and national-security review lawyers for cross-border acquisitions of Australian energy, LNG, and critical-infrastructure assets. Experienced with Japanese, Korean, US, EU and Middle Eastern capital.",
  "petroleum-royalties-advisors": "Find specialists in Australian petroleum royalty structures — overriding, net-profits, and sliding-scale royalties, PRRT interaction, state royalty audits, and secondary-market royalty trading.",
};

const TYPE_FAQS: Record<string, { q: string; a: string }[]> = {
  "smsf-accountants": [
    { q: "How much does an SMSF accountant cost?", a: "SMSF accountants typically charge $1,500–$5,000 per year for ongoing compliance, administration, and annual audit. Setup fees range from $1,000–$3,000." },
    { q: "Do I need a separate SMSF auditor?", a: "Yes. Australian law requires your SMSF to be audited annually by an independent ASIC-registered auditor. Your SMSF accountant will usually arrange this." },
    { q: "Can my regular accountant manage my SMSF?", a: "They can, but it's recommended to use a specialist. SMSF compliance is complex and penalties for non-compliance are severe. A specialist reduces your risk." },
  ],
  "financial-planners": [
    { q: "How much does a financial planner charge?", a: "A Statement of Advice (SOA) typically costs $2,500–$5,500. Ongoing advice fees range from $2,000–$8,000 per year depending on complexity." },
    { q: "What's the difference between a financial planner and a financial advisor?", a: "In Australia, both terms are regulated. A 'financial planner' and 'financial adviser' must hold an AFSL or be an authorised representative of an AFSL holder. They're functionally the same." },
    { q: "Do I need a financial planner or can I invest myself?", a: "It depends on your complexity. For straightforward ETF investing, a platform comparison may be enough. For retirement planning, tax structuring, or amounts over $200k, professional advice often pays for itself." },
  ],
  "property-advisors": [
    { q: "What does a property investment advisor do?", a: "They help you assess investment properties, model returns, understand tax implications, and decide whether property fits your overall investment strategy. Some also help with SMSF property purchases." },
    { q: "How are property advisors paid?", a: "Fee-for-service advisors charge $2,000–$5,000 for a property strategy. Be cautious of 'free' advisors who earn commissions from developers — this creates conflicts of interest." },
    { q: "Should I buy property or invest in shares?", a: "This depends on your goals, timeline, and risk tolerance. A property advisor can model both scenarios for your specific situation." },
  ],
  "tax-agents": [
    { q: "When do I need a tax agent for investments?", a: "If you have capital gains events, international income, crypto holdings, investment property, or complex structures like trusts or SMSFs. A standard tax return with only salary and a few dividends is usually manageable yourself." },
    { q: "How much does a tax agent cost for investment tax?", a: "Expect $300–$800 for a return with investment income, CGT events, and deductions. Complex returns with crypto, property, or international holdings can be $800–$2,000+." },
    { q: "Can a tax agent help reduce my capital gains tax?", a: "Yes. They can advise on CGT discount eligibility, tax-loss harvesting, timing of disposals, and structuring to minimise tax. The savings often exceed their fee." },
  ],
  "mortgage-brokers": [
    { q: "Do mortgage brokers charge a fee?", a: "Most Australian mortgage brokers don't charge the borrower directly — they earn commission from lenders. Some charge a fee for complex scenarios." },
    { q: "Is a mortgage broker better than going to my bank?", a: "Brokers compare products from 20-40+ lenders, which often results in better rates or features than your bank's single offering." },
    { q: "Can a mortgage broker help with investment property loans?", a: "Yes, and investment property lending has specific requirements (higher deposits, different interest rates) that brokers specialise in." },
  ],
  "estate-planners": [
    { q: "When do I need estate planning?", a: "If you have assets worth more than $500k, dependents, a blended family, business interests, or an SMSF. Estate planning ensures your wealth is distributed according to your wishes." },
    { q: "What does estate planning include?", a: "Typically: wills, powers of attorney, trust structures, superannuation death benefit nominations, and succession planning for businesses or farms." },
    { q: "How much does estate planning cost?", a: "A basic will costs $500–$1,500. Comprehensive estate planning with trusts and complex structures can be $3,000–$10,000+." },
  ],
  "insurance-brokers": [
    { q: "What does an insurance broker do?", a: "An insurance broker compares policies across multiple insurers to find the best life, TPD, income protection, or trauma cover for your situation. They handle claims and annual reviews." },
    { q: "How much does an insurance broker cost?", a: "Most insurance brokers are paid by commission from insurers — their service is typically free to you. Some fee-for-service brokers charge $500–$2,000 for comprehensive advice." },
    { q: "Should I use a broker or go directly to an insurer?", a: "Brokers compare dozens of insurers and can find better value, particularly for complex needs. Going direct limits you to one insurer's products." },
  ],
  "buyers-agents": [
    { q: "What does a buyers agent do?", a: "A buyers agent searches for, evaluates, and negotiates property purchases on your behalf. They work exclusively for you — not the seller — and have access to off-market properties." },
    { q: "How much does a buyers agent charge?", a: "Typically 1.5–3% of the purchase price, or a fixed fee of $10,000–$25,000. Some charge a retainer plus a success fee." },
    { q: "Is a buyers agent worth it?", a: "For investment property, buyers agents often negotiate savings that exceed their fee. They also save significant time and reduce emotional decision-making." },
  ],
  "real-estate-agents": [
    { q: "How much do real estate agents charge?", a: "Most Australian real estate agents charge a commission of 1.5–2.5% of the sale price, plus marketing costs ($2,000–$10,000+). Rates vary by state and property value." },
    { q: "How do I choose a good real estate agent?", a: "Look at their recent sales in your suburb, average days on market, sale-to-list price ratio, and marketing approach. Ask for references from recent sellers." },
    { q: "Should I use one agent or list with multiple?", a: "An exclusive listing with one agent is standard in Australia and usually gets better results — the agent invests more in marketing and is more motivated to achieve the best price." },
  ],
  "wealth-managers": [
    { q: "What's the difference between a wealth manager and a financial planner?", a: "Wealth managers typically serve high-net-worth clients ($500k+ portfolios) with comprehensive services including investment management, tax strategy, estate planning, and philanthropic giving — all under one roof." },
    { q: "How much do wealth managers charge?", a: "Most charge 0.5–1.5% of assets under management (AUM) per year. On a $1M portfolio, that's $5,000–$15,000 annually. Some also charge performance fees." },
    { q: "When do I need a wealth manager vs a financial planner?", a: "If you have $500k+ in investable assets and want active portfolio management, tax optimisation, and integrated advice across multiple areas, a wealth manager may be more appropriate." },
  ],
  "aged-care-advisors": [
    { q: "What does an aged care advisor do?", a: "They help navigate residential aged care, home care packages, means testing for government subsidies, Refundable Accommodation Deposits (RADs), and the financial implications of aged care decisions." },
    { q: "How much does aged care advice cost?", a: "Aged care financial advice typically costs $2,000–$5,000 for a comprehensive plan covering accommodation, means testing, and asset strategies." },
    { q: "When should I get aged care advice?", a: "Ideally before a crisis — when a parent or loved one starts needing care. Early planning can save tens of thousands in accommodation costs and maximise government subsidies." },
  ],
  "crypto-advisors": [
    { q: "Do I need a crypto advisor?", a: "If you hold significant crypto assets, use DeFi protocols, have complex tax events from trading, or want to integrate crypto into your broader investment strategy, a specialist advisor can help." },
    { q: "What qualifications should a crypto advisor have?", a: "They should hold an AFSL or be an authorised representative, and have specific experience with digital assets. Look for CFP or CFA credentials alongside crypto-specific knowledge." },
    { q: "How can a crypto advisor help with tax?", a: "They can advise on CGT treatment of crypto disposals, DeFi income classification, airdrop and staking tax treatment, and cost base tracking — often saving thousands in tax." },
  ],
  "debt-counsellors": [
    { q: "Is debt counselling free?", a: "Financial counselling through not-for-profit services (like the National Debt Helpline) is free. Private debt management services may charge fees — always ask upfront." },
    { q: "What can a debt counsellor help with?", a: "They help with budgeting, debt consolidation strategies, negotiating hardship arrangements with creditors, understanding your rights, and creating a plan to become debt-free." },
    { q: "Will debt counselling affect my credit score?", a: "Seeing a counsellor does not affect your credit score. However, some debt solutions they recommend (like Part IX agreements or bankruptcy) will appear on your credit report." },
  ],
  "mining-lawyers": [
    { q: "When do I need a mining lawyer?", a: "Any mining tenement acquisition, joint venture, farm-in agreement, or M&A deal should involve a mining lawyer. Foreign investors also need FIRB advice for mining assets — FIRB treats minerals as a sensitive sector." },
    { q: "How much does a mining lawyer cost?", a: "Hourly rates typically range $500–$1,200. A straightforward tenement transfer costs $5,000–$15,000. Complex JVs or M&A transactions can run $50,000–$250,000+." },
    { q: "Do I need FIRB approval for a mining investment?", a: "Usually yes. Mining is a sensitive sector under FIRB, with lower thresholds than general commercial investment. Your lawyer coordinates the FIRB application alongside the transaction." },
  ],
  "mining-tax-advisors": [
    { q: "What is PRRT?", a: "Petroleum Resource Rent Tax — a federal tax on the profits of petroleum (oil and gas) projects. Mining tax advisors also handle state-based royalties, company tax deductions for exploration, and cross-border transfer pricing." },
    { q: "How do exploration deductions work?", a: "Exploration expenditure is generally immediately deductible, but the rules are complex for unsuccessful tenements, joint ventures, and farm-out arrangements. A specialist can identify deductions a generalist tax agent would miss." },
    { q: "What does mining tax advice cost?", a: "A structured strategy for a single mining investment typically costs $5,000–$15,000. Ongoing advisory for producing assets or multi-project portfolios runs $15,000–$50,000+ per year." },
  ],
  "business-brokers": [
    { q: "What does a business broker do?", a: "They value your business, prepare it for sale, market confidentially to qualified buyers, negotiate terms, and coordinate due diligence. They represent the seller — similar to a real estate agent for a business." },
    { q: "How much do business brokers charge?", a: "Typically 8–12% of the sale price for SMEs under $2M. Larger deals use sliding scales: 10% on the first $1M, 6% on the next, etc. Retainers of $2,000–$10,000 upfront are common." },
    { q: "Do I need a business broker or can I sell myself?", a: "Owners who try to sell privately usually get 20–40% less and face higher due-diligence failure rates. Good brokers access a buyer network you don't have and preserve confidentiality during the process." },
  ],
  "commercial-lawyers": [
    { q: "What's the difference between commercial and business law?", a: "They overlap heavily. 'Commercial lawyer' usually means someone handling contracts, M&A, and corporate structuring. 'Business lawyer' is a broader term that can include employment, disputes, IP, and smaller-scale advisory." },
    { q: "When should I engage a commercial lawyer?", a: "Before signing any significant contract, raising capital, taking on a co-founder, structuring a JV, selling a business, or entering a cross-border deal. Early engagement costs less than fixing problems later." },
    { q: "What do commercial lawyers charge?", a: "Hourly rates are $400–$900 at national firms; $250–$500 at specialist boutiques. A shareholder agreement typically costs $3,000–$8,000. Full M&A legal work scales with deal size." },
  ],
  "rural-property-agents": [
    { q: "How is rural property different from residential?", a: "Rural agents understand water rights, carrying capacity, soil types, commodity cycles, and depreciation schedules. They value land on productive capacity, not just comparable sales. Most have agricultural backgrounds." },
    { q: "What's the commission on a farm sale?", a: "Rural commissions typically range 2–4%, higher than residential (1.5–2.5%) because deal volumes are lower and sales cycles longer. Large stations and aggregations may negotiate fixed fees." },
    { q: "Do rural agents help with foreign buyers?", a: "Yes. FIRB requires approval for foreign acquisitions of agricultural land above $15M. Good rural agents work alongside FIRB specialists to structure compliant transactions." },
  ],
  "commercial-property-agents": [
    { q: "How do commercial property agents get paid?", a: "Sales commissions: 1–2% of sale price. Leasing: typically 6–12% of the first year's rent for new leases. Institutional and portfolio transactions often use negotiated fixed fees." },
    { q: "Should I use a separate leasing and sales agent?", a: "Specialists usually outperform generalists. Industrial leasing, CBD office sales, and suburban retail are three different markets — the best agent for one is rarely the best for another." },
    { q: "What yield should I expect on commercial property?", a: "Prime CBD office: 4–6%. Large-format retail: 5–7%. Industrial: 4.5–6.5%. Childcare, healthcare, service stations: 5–7%. Yields below these levels usually signal growth assumptions; higher yields signal risk." },
  ],
  "energy-consultants": [
    { q: "When do I need an energy consultant?", a: "Developing a renewables project (solar farm, wind, battery storage), negotiating a PPA, evaluating grid connection feasibility, or managing energy costs for large operations. They also advise on carbon credits and LGC/STC strategies." },
    { q: "What does energy consulting cost?", a: "Feasibility studies: $25,000–$150,000+ depending on project size. PPA structuring and grid connection advisory: typically day rates of $1,500–$3,000. Fixed-price project packages are common." },
    { q: "Are energy consultants regulated in Australia?", a: "Most are not directly licensed (unlike financial advisers), but reputable practitioners hold engineering qualifications (Engineers Australia, CEng) and memberships with the Clean Energy Council or AEMO market participant status." },
  ],
  "energy-financial-planners": [
    { q: "How is an energy financial planner different from a general financial planner?", a: "They hold the same AFSL authorisation as any licensed planner, but they concentrate their practice on clients whose wealth is highly exposed to energy sector risk — refinery engineers, LNG project personnel, concentrated ASX energy shareholders. They have working knowledge of Div 293, franking-credit harvesting on high-yield energy dividends, and SMSF investment in energy infrastructure funds." },
    { q: "Do I need one if I just own some Woodside shares?", a: "For small holdings (<$50K) a generalist is fine. It becomes worth paying for specialist advice when energy exposure represents 30%+ of your net worth, when you have a concentrated employee share scheme, or when you want to structure SMSF allocations to unlisted energy funds and infrastructure." },
    { q: "What does energy-focused financial planning cost?", a: "Statements of Advice typically $3,900–$5,500. Ongoing advice retainers $3,000–$8,000/year. Concentrated-stock de-risking strategies involving CGT modelling and protection overlays sit at the upper end." },
  ],
  "resources-fund-managers": [
    { q: "What is a resources fund and how does it differ from an energy ETF?", a: "A resources fund is an actively managed portfolio — long-only, long-short, or thematic — of ASX and international resources equities. Compared to a passive energy ETF (like OOO), an active fund can avoid stocks, time entries, and short weak names. Active funds charge higher fees (typically 1.0–1.5% plus performance fees) so they need to generate alpha to justify themselves." },
    { q: "Are resources funds open to retail investors?", a: "Some are retail-registered and accessible for $25K minimums; many wholesale funds require a sophisticated-investor certificate ($2.5M net assets or $250K gross income) and $100K+ minimums. This directory flags each fund's eligibility." },
    { q: "How should I judge a resources fund manager?", a: "Look at: (1) AUM and team tenure, (2) performance vs a relevant benchmark (ASX300 Resources, MSCI World Energy) over 3 and 5 years net of fees, (3) fee structure — management fee, performance fee, and hurdle, (4) liquidity terms and lock-ups, (5) personal capital invested by the PM alongside LPs." },
  ],
  "foreign-investment-lawyers": [
    { q: "When do I need a foreign investment lawyer?", a: "Any time a non-Australian entity acquires an interest in an Australian petroleum tenement, LNG infrastructure asset, or >=10% of a petroleum producer. Since the 2025 national security amendments, many midstream and storage assets are also classified critical infrastructure and attract heightened scrutiny." },
    { q: "How long does a FIRB application take?", a: "Statutory period is 30 days but extensions are routine. For sensitive-sector energy assets, 90–180 days is typical; complex sovereign-wealth or SOE acquisitions can run 6–9 months through national security review." },
    { q: "What does a FIRB application cost?", a: "Government application fees are set by legislation and scale with transaction value, from ~$14K to ~$1.1M. Legal fees are separate: straightforward portfolio acquisitions $45K–$80K, contested/national-security cases $150K+. Always budget for Treasury-imposed conditions and undertakings." },
  ],
  "petroleum-royalties-advisors": [
    { q: "What is a petroleum royalty?", a: "A petroleum royalty is a payment tied to the revenue or net profit of a petroleum operation, retained or sold by the resource owner (Crown, landowner, or a secondary holder). Common structures include overriding royalties (% of gross revenue), net-profits royalties (% of operating profit), and sliding-scale royalties (escalating with price or volume bands)." },
    { q: "How do royalties interact with PRRT?", a: "State royalties paid on petroleum are creditable against federal PRRT liability — but the mechanics are complex, with timing mismatches and ring-fencing rules. A specialist advisor models both taxes together, and validates your operator's self-assessed allocation." },
    { q: "Can retail investors or SMSFs own petroleum royalties?", a: "Yes — but the structures vary in tax efficiency. Purchased royalties generate ordinary income (not a CGT event on disposal of the underlying resource), and foreign-source royalties have withholding-tax consequences. Specialist advice on structure is essential before purchase." },
  ],
};

const TYPE_EDITORIAL: Record<string, { howToChoose: string[]; costGuide: string; industryInsight: string }> = {
  "smsf-accountants": {
    howToChoose: [
      "Verify they're a registered SMSF auditor or work with one — your fund needs an independent audit annually",
      "Ask about their experience with your investment types (property in SMSF, crypto, international shares)",
      "Check they use cloud-based SMSF software (Class Super, BGL) for real-time reporting",
      "Confirm their fee includes all compliance work: annual return, audit coordination, and ATO lodgement",
    ],
    costGuide: "SMSF accountants typically charge $1,500–$5,000/year for ongoing compliance and administration. Setup fees range from $1,000–$3,000. Funds under $200k may find an SMSF isn't cost-effective due to fixed fees.",
    industryInsight: "The ATO has been increasing scrutiny on SMSF compliance since 2024, with a focus on in-house asset rules and related party transactions. A specialist accountant significantly reduces your risk of penalties.",
  },
  "financial-planners": {
    howToChoose: [
      "Check they're listed on the ASIC Financial Advisers Register and hold a current authorisation",
      "Ask whether they're fee-for-service or commission-based — fee-only planners have fewer conflicts of interest",
      "Look for relevant credentials: CFP (Certified Financial Planner) is the gold standard in Australia",
      "Request a sample Statement of Advice (SOA) to understand their advice quality and style",
    ],
    costGuide: "A Statement of Advice (SOA) typically costs $2,500–$5,500. Ongoing advice retainers range from $2,000–$8,000/year. Some planners offer initial consultations for free or $200–$500.",
    industryInsight: "Following the Hayne Royal Commission, Australian financial planning has shifted heavily toward fee-for-service models. The number of licensed advisers dropped 40% since 2019, making qualified planners more in-demand than ever.",
  },
  "property-advisors": {
    howToChoose: [
      "Ensure they're independent and don't earn commissions from property developers or agents",
      "Ask about their modelling approach — good advisors run cash flow projections over 10+ years",
      "Check if they can advise on SMSF property purchases if relevant to your situation",
      "Look for advisors who consider your entire financial picture, not just property in isolation",
    ],
    costGuide: "Fee-for-service property advisors charge $2,000–$5,000 for a comprehensive property strategy. Be cautious of 'free' advice from advisors who earn developer commissions — this creates significant conflicts of interest.",
    industryInsight: "With Australian property prices at record highs in most capitals, independent property advice has become critical. Quality advisors help you avoid overpaying and ensure property fits your overall investment strategy.",
  },
  "tax-agents": {
    howToChoose: [
      "Verify they're registered with the Tax Practitioners Board (TPB) — this is a legal requirement",
      "Ask about their experience with investment-specific tax: CGT, crypto, international income, trusts",
      "Check if they use cloud accounting software that integrates with your broker's tax reports",
      "Confirm they can handle your specific needs: are they just lodging returns, or providing strategic tax advice?",
    ],
    costGuide: "Investment tax returns typically cost $300–$800. Complex returns with crypto, property, and international holdings can be $800–$2,000+. Strategic tax planning advice is usually $1,000–$3,000 for a comprehensive review.",
    industryInsight: "The ATO has significantly increased its data matching for share trading, crypto, and property transactions. Having a specialist tax agent ensures you claim all legitimate deductions while staying compliant.",
  },
  "mortgage-brokers": {
    howToChoose: [
      "Ask how many lenders they compare — good brokers access 20-40+ lenders on their panel",
      "Check if they specialise in investment property lending, which has different requirements from owner-occupier loans",
      "Ask about their trail commission disclosure — transparency about how they're paid builds trust",
      "Look for brokers who explain the 'why' behind their recommendations, not just the rate",
    ],
    costGuide: "Most mortgage brokers don't charge borrowers directly — they earn commissions from lenders (typically 0.5–0.7% upfront + 0.15% trail). Some charge $1,000–$3,000 for complex scenarios like commercial lending.",
    industryInsight: "Mortgage brokers now write over 70% of all Australian home loans. The best-interest duty introduced in 2021 requires brokers to demonstrate why their recommendation suits your circumstances.",
  },
  "estate-planners": {
    howToChoose: [
      "Ensure they specialise in estate planning, not just general law — estate law is complex and state-specific",
      "Ask about their experience with superannuation death benefit nominations and binding nominations",
      "Check if they coordinate with your financial planner and accountant for a comprehensive approach",
      "Look for practitioners who review and update plans regularly, not just set-and-forget",
    ],
    costGuide: "A basic will costs $500–$1,500. Comprehensive estate planning with testamentary trusts, powers of attorney, and succession planning can be $3,000–$10,000+. Annual reviews are typically $500–$1,000.",
    industryInsight: "With $3.5 trillion expected to transfer between generations in Australia over the next 20 years, estate planning has become essential. Poorly structured estates can lose 30%+ to tax and disputes.",
  },
  "insurance-brokers": {
    howToChoose: [
      "Check they compare policies across multiple insurers — not just one or two preferred partners",
      "Ask about their claims experience: a good broker advocates for you during the claims process",
      "Ensure they conduct a thorough needs analysis before recommending cover levels",
      "Look for brokers who provide annual reviews to ensure your cover keeps pace with your life changes",
    ],
    costGuide: "Most insurance brokers earn commissions from insurers (typically 20-30% of first-year premium). Fee-for-service brokers charge $500–$2,000 for comprehensive advice. Some offer hybrid models.",
    industryInsight: "Australia is significantly underinsured — the average life insurance gap is over $500,000 per household. Quality insurance advice can mean the difference between financial security and hardship if the unexpected happens.",
  },
  "buyers-agents": {
    howToChoose: [
      "Verify they hold a real estate licence in the state where you're purchasing — this is a legal requirement",
      "Ask about their fee structure: fixed fee, percentage of purchase price, or retainer plus success fee",
      "Check their track record: ask for recent comparable purchases and savings negotiated",
      "Ensure they have access to off-market properties and developer relationships in your target area",
    ],
    costGuide: "Buyers agents typically charge 1.5–3% of the purchase price, or a fixed fee of $10,000–$25,000. Some charge a retainer ($2,000–$5,000) plus a success fee. For a $800k property, expect $12,000–$24,000.",
    industryInsight: "Buyers agents have grown rapidly in Australia, now representing over 10% of all residential property transactions in major cities. They're particularly valuable in competitive markets where off-market access gives a significant advantage.",
  },
  "real-estate-agents": {
    howToChoose: [
      "Check their recent sales in your suburb — not just total sales, but average days on market and sale-to-list ratio",
      "Ask about their marketing plan: professional photography, floorplans, digital advertising, and open home strategy",
      "Compare commission rates and what's included — some agents bundle marketing into their commission, others charge separately",
      "Ask for references from recent vendors who sold similar properties in your area",
    ],
    costGuide: "Commission rates range from 1.5–2.5% of the sale price (lower in metro areas, higher in regional). Marketing costs are typically $2,000–$10,000+ depending on the campaign. Some agents offer tiered commission structures to incentivise a higher sale price.",
    industryInsight: "The Australian real estate agent market is highly competitive, with over 50,000 licensed agents nationally. The best agents sell properties faster and for higher prices — top-performing agents typically achieve 5–10% more than average agents in the same area.",
  },
  "wealth-managers": {
    howToChoose: [
      "Verify they hold an AFSL and have experience managing portfolios of your size and complexity",
      "Understand their fee structure: AUM-based (0.5–1.5%), fixed fee, or hybrid — and what's included",
      "Ask about their investment philosophy and how they construct portfolios",
      "Check if they provide integrated services (tax, estate, insurance) or coordinate with your other advisors",
    ],
    costGuide: "Wealth managers typically charge 0.5–1.5% of assets under management annually. On a $1M portfolio, that's $5,000–$15,000/year. Some also charge performance fees or minimum engagement fees of $5,000–$10,000.",
    industryInsight: "The Australian wealth management industry manages over $4 trillion in assets. The trend is toward comprehensive, goals-based advice rather than just investment management — the best wealth managers integrate tax, estate, and insurance planning.",
  },
  "aged-care-advisors": {
    howToChoose: [
      "Look for advisors with specific aged care accreditation or significant experience in the sector",
      "Ask about their knowledge of means testing, RADs (Refundable Accommodation Deposits), and DAPs",
      "Check if they can coordinate with Centrelink and My Aged Care on your behalf",
      "Ensure they consider the financial impact on the broader family, not just the person entering care",
    ],
    costGuide: "Aged care financial advice typically costs $2,000–$5,000 for a comprehensive plan. This covers accommodation analysis, means testing optimisation, and asset restructuring. Early planning can save $50,000+ in accommodation costs.",
    industryInsight: "With Australia's ageing population, aged care planning has become one of the fastest-growing advice areas. The 2024 aged care reforms have made specialist advice more important than ever for navigating the new funding models.",
  },
  "crypto-advisors": {
    howToChoose: [
      "Verify they hold an AFSL or are an authorised representative — crypto advice without a licence is illegal in Australia",
      "Ask about their personal crypto experience and knowledge of DeFi, staking, and different blockchain ecosystems",
      "Check they understand Australian crypto tax rules: CGT events, cost base tracking, and DeFi income classification",
      "Look for advisors who integrate crypto into your overall portfolio strategy, not just crypto-only advice",
    ],
    costGuide: "Crypto advisory fees range from $2,000–$5,000 for initial portfolio strategy. Ongoing management or advice retainers cost $1,500–$4,000/year. Tax preparation for complex crypto portfolios is typically $800–$2,000+.",
    industryInsight: "Australia is one of the leading crypto-adopting nations, with over 25% of adults holding digital assets. As regulations tighten, having a licensed crypto advisor ensures your portfolio complies with evolving ASIC and ATO requirements.",
  },
  "debt-counsellors": {
    howToChoose: [
      "Start with free services: the National Debt Helpline (1800 007 007) provides free, independent financial counselling",
      "If using a private service, verify they're accredited with the Financial Counselling Association of Australia",
      "Be wary of debt management companies that charge large upfront fees — reputable counsellors are affordable or free",
      "Ask about their experience with your specific type of debt: credit cards, personal loans, investment losses, or ATO debts",
    ],
    costGuide: "Financial counselling through not-for-profit services is free. Private debt management services range from $500–$3,000 depending on complexity. Avoid services charging percentage-based fees on your total debt — this is a red flag.",
    industryInsight: "Australian household debt-to-income ratio is among the highest globally at over 180%. Rising interest rates have increased demand for debt counselling services, with the National Debt Helpline reporting record call volumes.",
  },
  "mining-lawyers": {
    howToChoose: [
      "Look for lawyers with direct mining sector experience — tenements, JVs, FIRB — not generalists with a mining client",
      "Ask about their work on foreign investment deals if you're an overseas buyer; FIRB coordination is a specialist skill",
      "Check recent deal announcements in the ASX resources sector — top lawyers show up repeatedly in notable transactions",
      "Confirm they can work alongside your tax and technical advisors; mining deals need integrated counsel",
    ],
    costGuide: "Tenement acquisitions typically cost $5,000–$15,000 in legal fees. Joint venture agreements and farm-ins run $15,000–$40,000. Major M&A or cross-border deals start at $50,000 and scale with deal size. Hourly rates: $500–$1,200.",
    industryInsight: "The 2026 US-Australia Critical Minerals Framework and EU-Australia FTA have triggered a generational wave of mining deals. Specialist mining lawyers are in tight supply — engage early to secure senior partner attention.",
  },
  "mining-tax-advisors": {
    howToChoose: [
      "Prioritise firms with dedicated resources-sector tax practices — PRRT and royalty rules are genuinely specialist",
      "Verify their cross-border experience if you're investing from overseas or into overseas projects",
      "Ask for references from comparable-scale projects — junior explorers need different advice from producing majors",
      "Check they have working relationships with the ATO's Large Business & International group if your deal qualifies",
    ],
    costGuide: "A structured tax strategy for a single mining investment costs $5,000–$15,000. Ongoing advisory for producing assets runs $15,000–$50,000/year. Complex cross-border structures can be $50,000+ upfront and $30,000+ ongoing.",
    industryInsight: "The PRRT has been under structural review since 2023, and state royalty regimes (especially WA, Queensland) are actively evolving. Strategic tax advice has rarely been more valuable — or more sensitive to timing.",
  },
  "business-brokers": {
    howToChoose: [
      "Choose a broker whose recent sales look like your business — same industry, size, and buyer profile",
      "Ask for their 'days to sale' average and closure rate over the last 12 months; reputable brokers share this data",
      "Confirm their marketing process preserves confidentiality — you don't want competitors knowing you're selling",
      "Clarify whether the fee is success-based, retainer-plus-success, or pure retainer; success-weighted is usually better aligned",
    ],
    costGuide: "SME business sales typically attract 8–12% success commissions. Retainers of $2,000–$10,000 upfront are standard. Larger deals (>$5M EV) use sliding scales and start with 4–6% at the top end. Expect valuations to cost $2,500–$8,000 separately.",
    industryInsight: "Baby-boomer business ownership transitions are driving record SME listing volumes in Australia. The best brokers are now booked 3–6 months out; owners planning a sale in 2026 should engage one by early in the year.",
  },
  "commercial-lawyers": {
    howToChoose: [
      "Match their deal size to yours — boutiques nail SME work; top-tier firms handle billion-dollar M&A",
      "Check their recent work in your industry; legal frameworks vary widely (tech vs construction vs healthcare)",
      "Ask how they bill: hourly, fixed fee, or phase-based. Fixed fees are available for more matters than firms admit",
      "Confirm their partner will be actively involved, not just signing off on junior work",
    ],
    costGuide: "Shareholder agreements and SAFEs: $3,000–$8,000. Commercial leases: $2,500–$6,000. Series A legal work: $25,000–$80,000. Full M&A for a $10M business: $80,000–$200,000. Hourly rates: $400–$900 (top-tier), $250–$500 (boutique).",
    industryInsight: "Australia's corporate M&A market has rebounded strongly with the return of lower rates and the critical minerals deal flow. Specialist commercial lawyers are selectively taking work — negotiate scope and fee structure upfront.",
  },
  "rural-property-agents": {
    howToChoose: [
      "Choose agents who specialise in your land use (cropping vs grazing vs viticulture vs horticulture)",
      "Look at their recent sales in your region — rural markets are intensely local",
      "Ask how they handle confidential off-market listings; many premium rural deals don't hit public platforms",
      "If you're a foreign buyer, confirm they work routinely with FIRB specialists — agricultural land has tight thresholds",
    ],
    costGuide: "Rural commissions typically run 2–4% of sale price. Large stations and aggregations can negotiate fixed fees of $50,000–$250,000. Marketing costs ($5,000–$20,000) are usually separate. Valuations for pre-sale advice: $3,000–$8,000.",
    industryInsight: "Institutional capital has moved heavily into Australian agriculture over the past five years, professionalising the market but also raising prices. Quality rural agents bridge the gap between family-owner sellers and sophisticated institutional buyers.",
  },
  "commercial-property-agents": {
    howToChoose: [
      "Pick agents with deep sector focus: office, industrial, retail, healthcare, and childcare are all different markets",
      "Review their last 12 months of sales — volume, average sale-to-book ratio, and average days on market",
      "Ask for their tenant covenant due-diligence process; strong tenant relationships drive yield premiums",
      "Verify their research capability — the best agents publish quarterly market updates and cap-rate research",
    ],
    costGuide: "Sales commissions typically 1–2% of sale price. Leasing commissions: 6–12% of first-year rent. Portfolio and institutional work often uses negotiated fixed fees starting at $50,000. Marketing budgets: $5,000–$30,000+.",
    industryInsight: "Post-pandemic commercial property yields have widened in Australia, particularly for office assets. The best agents are now specialists in repositioning — finding alternative uses for obsolete stock. Pure transactional agents are being disrupted.",
  },
  "energy-consultants": {
    howToChoose: [
      "Match their project scale — household energy advisors are different from utility-scale project developers",
      "Check if they hold Clean Energy Council memberships or have AEMO market participant status for serious work",
      "Ask for case studies of comparable projects delivered through grid connection and commissioning",
      "Confirm they're independent — some consultants are tied to equipment suppliers, which creates conflicts",
    ],
    costGuide: "Utility-scale feasibility studies: $25,000–$150,000+. PPA structuring and grid-connection advisory: $1,500–$3,000/day or fixed packages of $20,000–$80,000. Small commercial solar/storage assessments: $2,000–$8,000.",
    industryInsight: "Australia's energy transition is accelerating: the 2030 renewable targets plus the 2040 coal-closure trajectory are creating a decade of consulting demand. Specialist consultants with grid-connection experience are the most booked.",
  },
  "energy-financial-planners": {
    howToChoose: [
      "Confirm current AFSL authorisation on the ASIC Financial Advisers Register — there is no separate 'energy' licence in Australia",
      "Check their client book — planners servicing Perth, Gladstone, or Darwin resource professionals carry real sector knowledge",
      "Ask how they handle concentrated employee shareholdings, vested-share CGT, and protection overlays",
      "Verify they're fee-for-service rather than percentage-of-AUM for concentrated single-stock clients",
    ],
    costGuide: "SOA from $3,900–$5,500. Ongoing advice retainers $3,000–$8,000/year. Concentrated-stock de-risking plans involving CGT modelling, protection collars, or charitable remainder strategies sit $8,000–$25,000.",
    industryInsight: "The extension of the Fuel Security Services Payment to 2030 and strong Brent pricing through 2026 has created a generational wealth event for Australian refinery, LNG, and upstream workers. Planners with sector-specific expertise are in tight supply outside Perth.",
  },
  "resources-fund-managers": {
    howToChoose: [
      "Insist on 3 and 5-year net-of-fee performance versus a relevant benchmark (ASX300 Resources, MSCI World Energy)",
      "Verify AUM and team tenure — funds with sub-$50M AUM or <3-year track records carry key-person risk",
      "Understand the fee stack: management fee, performance fee, hurdle, and high-water mark",
      "Ask for co-investment disclosure — personal capital alongside LPs aligns incentives",
    ],
    costGuide: "Management fees typically 0.95–1.50% p.a. Performance fees 15–20% over hurdle (ASX300 Resources or absolute 8%). Most wholesale funds have $100K minimums and 1–3 year lock-ups; retail-registered funds start at $25K with daily liquidity.",
    industryInsight: "The resources fund category has narrowed dramatically since 2015 — many generalist funds closed after the commodity bear market. The surviving specialists typically have deep technical benches (ex-engineers, ex-sell-side analysts) and are once again attracting institutional capital as energy transition demand accelerates.",
  },
  "foreign-investment-lawyers": {
    howToChoose: [
      "Verify admission and a current practising certificate in the lawyer's home jurisdiction (usually NSW, VIC, or WA)",
      "Check recent announced FIRB decisions in the sector — specialists show up repeatedly in sensitive-sector approvals",
      "Ask about their Treasury and national security division relationships — pre-lodgement engagement dramatically speeds timelines",
      "Confirm language and cultural fit where the investor is Japanese, Korean, Chinese or Middle Eastern — these engagements benefit from bilingual counsel",
    ],
    costGuide: "Typical FIRB application package $45K–$120K. National-security-reviewed cases $150K+. Sovereign-wealth and SOE acquisitions $250K–$750K end-to-end. Hourly rates $850–$1,200 at practice heads.",
    industryInsight: "The 2025 amendments to the Security of Critical Infrastructure Act and the National Security Review of Foreign Investment have materially widened what counts as a 'sensitive' energy asset. Storage terminals, LNG jetties, and gas pipelines are now routinely reviewed where they once flew through. Pre-lodgement engagement is no longer optional.",
  },
  "petroleum-royalties-advisors": {
    howToChoose: [
      "Ask how many live royalty valuations they've signed off on in the last 24 months — this is a narrow specialty",
      "Check their familiarity with both federal PRRT and the state royalty regime that applies to your asset",
      "Confirm their work on secondary-market royalty transactions if you're buying or selling an existing royalty stream",
      "For SMSF trustees, verify they understand the trustee obligations around non-arm's-length income (NALI) for purchased royalties",
    ],
    costGuide: "Royalty valuation engagements $12K–$40K. Purchase-side due diligence on secondary royalties $20K–$60K. Ongoing advisory retainers from $2,500/month. Hourly rates $780–$820 at senior level.",
    industryInsight: "The PRRT has been under structural review since 2023 with uplift-rate and deductibility changes progressively tightening. Combined with the Queensland coal royalty precedent flowing through to petroleum policy debates, the valuation environment for existing royalty streams is more volatile than any time since the 1990s.",
  },
};

export function generateStaticParams() {
  return Object.keys(SLUG_TO_TYPE).map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type: typeSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  if (!professionalType) return {};

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];
  const title = `Best ${label}s in Australia (${CURRENT_YEAR}) — Find & Compare`;
  const description = TYPE_DESCRIPTIONS[typeSlug] || `Find verified ${label.toLowerCase()}s across Australia. Free consultation requests.`;

  return {
    title,
    description,
    openGraph: { title: `${label}s`, description },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `/advisors/${typeSlug}` },
  };
}

export default async function AdvisorTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type: typeSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  if (!professionalType) notFound();

  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("status", "active")
    .eq("type", professionalType)
    .order("verified", { ascending: false })
    .order("rating", { ascending: false });

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];
  const faqs = TYPE_FAQS[typeSlug] || [];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: `${label}s` },
  ]);

  const faqLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <AdvisorsClient
        professionals={(professionals as Professional[]) || []}
        initialType={professionalType}
        pageTitle={`${label}s in Australia`}
        pageDescription={TYPE_DESCRIPTIONS[typeSlug]}
        faqs={faqs}
        editorial={TYPE_EDITORIAL[typeSlug]}
      />
    </>
  );
}
