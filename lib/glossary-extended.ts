/**
 * Server-only glossary extension.
 *
 * `lib/glossary.ts` holds the CORE term set that the client-side
 * `JargonTooltip` bundles. To keep that shared client chunk lean (it's loaded
 * on every page), the ~80 additional specialised terms that live in the DB
 * (`public.glossary_terms`, migration 20260419) but aren't needed for inline
 * client tooltips are kept here and composed into `FULL_GLOSSARY_ENTRIES` for
 * SERVER-SIDE consumers only: sitemap generation, internal-link targets, and
 * the build-time DB fallback.
 *
 * Do NOT import this from a Client Component — it would pull the full set into
 * the client bundle and regress the bundle-size budget (the reason this split
 * exists). The runtime source of truth remains the DB; this is parity for the
 * server-rendered surfaces + fallback.
 */
import { GLOSSARY_ENTRIES, type GlossaryEntry } from "@/lib/glossary";

/** Specialised terms mirrored from public.glossary_terms (migration 20260419). */
export const EXTENDED_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    term: "Alpha",
    slug: "alpha",
    definition:
      "The excess return of an investment relative to a benchmark, adjusted for risk. Positive alpha means the manager beat the index; negative means they underperformed.",
    category: "General",
  },
  {
    term: "ASIC Leverage Cap",
    slug: "asic-leverage-cap",
    definition:
      "ASIC's retail CFD rules imposing maximum leverage of 30:1 on forex majors, 20:1 on indices, 2:1 on crypto, and 5:1 on other CFDs. Professional clients can request higher limits.",
    category: "CFD & Forex",
  },
  {
    term: "Authorised Representative",
    slug: "authorised-representative",
    definition:
      "A person or company authorised to provide financial services under another entity's AFSL. Advisers employed by planning practices are usually authorised representatives of the practice's licensee.",
    category: "Regulatory",
  },
  {
    term: "Best Interests Duty",
    slug: "best-interests-duty",
    definition:
      "The legal obligation on Australian financial advisers to act in the client's best interests \u2014 not the adviser's, not the employer's. Breaches trigger ASIC action and civil penalties.",
    category: "Regulatory",
  },
  {
    term: "Beta",
    slug: "beta",
    definition:
      "A measure of how much an asset's price moves relative to the overall market. Beta of 1 moves in line; 1.5 is 50% more volatile; 0.5 is half as volatile.",
    category: "General",
  },
  {
    term: "Buyer's Agent",
    slug: "buyers-agent",
    definition:
      "A licensed property professional who sources and negotiates purchases on behalf of the buyer. Paid by the buyer, not the seller. Useful for interstate purchases or time-poor investors.",
    category: "Property",
  },
  {
    term: "Closed-End Fund",
    slug: "closed-end-fund",
    definition:
      "A fund with a fixed number of units that trade on an exchange, rather than being issued and redeemed on demand. Price is set by the market and can trade above or below NAV.",
    category: "General",
  },
  {
    term: "Cold Wallet",
    slug: "cold-wallet",
    definition:
      "A cryptocurrency wallet that stores private keys offline (e.g. hardware wallet, paper wallet). Immune to remote hacking but requires physical security. Standard for large crypto holdings.",
    category: "Crypto",
  },
  {
    term: "Complying Investment Framework",
    slug: "complying-investment-framework",
    definition:
      "The set of rules defining which Australian investments qualify for the Significant Investor Visa. Currently requires a minimum $1m in venture capital, $1.5m in emerging companies, and the remainder in balanced products.",
    category: "Foreign Investment",
  },
  {
    term: "Concessional Contribution",
    slug: "concessional-contribution",
    definition:
      "A pre-tax contribution to super, including employer SG and salary sacrifice. Taxed at 15% on entry (or 30% for high-income earners). Capped at $30,000/year for most people.",
    category: "Super",
  },
  {
    term: "Conveyancer",
    slug: "conveyancer",
    definition:
      "A licensed professional who handles the legal transfer of property ownership. Cheaper than a solicitor for simple transactions; solicitors are preferred for complex titles or disputes.",
    category: "Property",
  },
  {
    term: "Cooling-Off Period",
    slug: "cooling-off-period",
    definition:
      "The short window (usually 5 business days in NSW/QLD) after signing a contract of sale during which the buyer can withdraw and forfeit only a small deposit. Auction sales have no cooling off.",
    category: "Property",
  },
  {
    term: "Corporate Action",
    slug: "corporate-action",
    definition:
      "An event initiated by a listed company that affects shareholders \u2014 e.g. dividend, buyback, share split, rights issue, takeover. Investors must usually respond by a deadline.",
    category: "Share Trading",
  },
  {
    term: "Corporations Act",
    slug: "corporations-act",
    definition:
      "The primary Australian law governing companies, financial products, and financial services. Administered by ASIC and covers everything from director duties to disclosure to licensing.",
    category: "Regulatory",
  },
  {
    term: "Credit Spread",
    slug: "credit-spread",
    definition:
      "The extra yield a corporate bond offers over a government bond of the same maturity. Compensates investors for credit risk \u2014 wider spreads mean markets see more default risk.",
    category: "General",
  },
  {
    term: "Critical Minerals",
    slug: "critical-minerals",
    definition:
      "Minerals deemed strategically essential (e.g. lithium, nickel, rare earths) that Australia exports to allies for EV batteries, defence, and clean energy. The Australian government publishes a Critical Minerals List guiding investment incentives.",
    category: "Mining",
  },
  {
    term: "Design and Distribution Obligations",
    slug: "ddo",
    definition:
      "DDO \u2014 rules requiring product issuers to define a target market for each financial product and distribute it only to clients in that market. Implemented in 2021 to strengthen consumer protection.",
    category: "Regulatory",
  },
  {
    term: "Division 293 Tax",
    slug: "division-293-tax",
    definition:
      "An extra 15% tax on concessional super contributions for individuals with income (including super) above $250,000. Effectively makes super tax 30% for high earners on the relevant portion.",
    category: "Super",
  },
  {
    term: "Double Tax Agreement",
    slug: "double-tax-agreement",
    definition:
      "A treaty between two countries that allocates taxing rights so the same income isn't taxed twice. Australia has DTAs with ~45 countries, reducing withholding rates on dividends, interest, and royalties.",
    category: "Tax",
  },
  {
    term: "Drawdown",
    slug: "drawdown",
    definition:
      "The peak-to-trough fall in portfolio value during a losing period, expressed as a percentage. Max drawdown is a key risk metric for evaluating managers and strategies.",
    category: "General",
  },
  {
    term: "Duration",
    slug: "duration",
    definition:
      "A measure of a bond's price sensitivity to interest-rate changes. A duration of 5 means a 1% rate rise causes roughly a 5% bond-price fall. Higher duration = higher rate risk.",
    category: "General",
  },
  {
    term: "Ex-Ante Return",
    slug: "ex-ante-return",
    definition:
      "An expected future return, calculated before the fact using assumptions about growth and yield. Contrasted with ex-post returns (actual, historical).",
    category: "General",
  },
  {
    term: "FAR",
    slug: "far",
    definition:
      "Financial Adviser Register \u2014 the public ASIC register listing every adviser, their licensee, and their qualifications. Always check an adviser is on FAR before engaging them.",
    category: "Regulatory",
  },
  {
    term: "FBT",
    slug: "fbt",
    definition:
      "Fringe Benefits Tax \u2014 paid by employers on non-cash benefits provided to employees (e.g. company cars, gym memberships). FBT year runs 1 April to 31 March.",
    category: "Tax",
  },
  {
    term: "Feasibility Study",
    slug: "feasibility-study",
    definition:
      "A detailed engineering and economic study evaluating whether a mining project is technically and financially viable. Usually progresses scoping \u2192 pre-feasibility \u2192 definitive feasibility before a company commits to construction.",
    category: "Mining",
  },
  {
    term: "Financial Planner",
    slug: "financial-planner",
    definition:
      "An AFSL-authorised representative who gives personal financial advice. In Australia, planners must hold FAR-compliant qualifications, meet CPD requirements, and disclose fees and conflicts.",
    category: "Regulatory",
  },
  {
    term: "FIRB",
    slug: "firb",
    definition:
      "The Foreign Investment Review Board \u2014 the government body that reviews and recommends whether proposed foreign investments align with Australia's national interest. Approvals are issued by the Treasurer.",
    category: "Foreign Investment",
  },
  {
    term: "Franking Percentage",
    slug: "franking-percentage",
    definition:
      "The percentage of a dividend that carries franking credits. 100% franked means full corporate tax has been paid; 50% franked means only half. Unfranked dividends carry no imputation benefit.",
    category: "Tax",
  },
  {
    term: "GST",
    slug: "gst",
    definition:
      "Goods and Services Tax \u2014 a 10% tax on most goods and services sold in Australia. Most investment activities (shares, super) are GST-free or input-taxed.",
    category: "Tax",
  },
  {
    term: "High-Water Mark",
    slug: "high-water-mark",
    definition:
      "A rule ensuring performance fees are only paid on new highs in a fund's NAV. Protects investors from paying twice for the same performance after a drawdown.",
    category: "Fees",
  },
  {
    term: "Hot Wallet",
    slug: "hot-wallet",
    definition:
      "A cryptocurrency wallet connected to the internet (e.g. exchange wallet, mobile app). Convenient for trading but vulnerable to exchange hacks and phishing.",
    category: "Crypto",
  },
  {
    term: "Hurdle Rate",
    slug: "hurdle-rate",
    definition:
      "The minimum return a fund must deliver before performance fees kick in \u2014 often set at the risk-free rate or a benchmark like the ASX 200 return.",
    category: "Fees",
  },
  {
    term: "Imputation Credit",
    slug: "imputation-credit",
    definition:
      "Another name for a franking credit \u2014 the corporate tax already paid on a dividend, credited back to shareholders to prevent double taxation.",
    category: "Tax",
  },
  {
    term: "In-House Asset",
    slug: "in-house-asset",
    definition:
      "An investment, loan, or lease between an SMSF and a related party (e.g. a fund member's business). In-house assets cannot exceed 5% of the SMSF's total asset value. Breaching this cap is a major compliance issue.",
    category: "SMSF",
  },
  {
    term: "JORC Code",
    slug: "jorc-code",
    definition:
      "The Joint Ore Reserves Committee code \u2014 Australia's standard for reporting exploration results, mineral resources, and ore reserves on ASX-listed mining companies. JORC-compliant announcements are legally binding and auditable.",
    category: "Mining",
  },
  {
    term: "Land Tax",
    slug: "land-tax",
    definition:
      "A state government tax on investment property based on the unimproved value of land. Your principal residence is usually exempt. Rates are progressive and reset annually on 31 December (NSW) or 30 June (other states).",
    category: "Property",
  },
  {
    term: "LIC",
    slug: "lic",
    definition:
      "Listed Investment Company \u2014 an ASX-listed company that holds a portfolio of other companies. Differs from an ETF in that it's a closed-end fund so its share price can trade at a premium or discount to NAV.",
    category: "Share Trading",
  },
  {
    term: "Low Income Super Tax Offset",
    slug: "listo",
    definition:
      "LISTO \u2014 a government refund of up to $500 of the 15% contributions tax for low-income earners ($37k or below). Paid automatically into super each year.",
    category: "Super",
  },
  {
    term: "Managed Account",
    slug: "managed-account",
    definition:
      "An investment portfolio where an external manager makes trading decisions on your behalf but the assets are held in your own name on a platform. Different from a managed fund where you own units in a pool.",
    category: "General",
  },
  {
    term: "MARA",
    slug: "mara",
    definition:
      "Migration Agents Registration Authority \u2014 the government body that registers migration agents in Australia. Only MARA-registered agents may give immigration advice for a fee.",
    category: "Regulatory",
  },
  {
    term: "Market Depth",
    slug: "market-depth",
    definition:
      "A real-time view of pending buy and sell orders at each price level. Helps traders judge liquidity and short-term supply/demand. Some brokers charge extra for full market depth data.",
    category: "Share Trading",
  },
  {
    term: "Medicare Levy",
    slug: "medicare-levy",
    definition:
      "A 2% tax on taxable income that funds Australia's public health system. Low-income earners are exempt or pay a reduced rate. High-income earners without private hospital cover also pay the Medicare Levy Surcharge.",
    category: "Tax",
  },
  {
    term: "MER",
    slug: "management-expense-ratio",
    definition:
      "Management Expense Ratio \u2014 the total annual cost of running a managed fund, expressed as a percentage of assets. Passive ETFs often charge 0.05\u20130.40%; actively managed funds 0.70\u20132%+.",
    category: "Fees",
  },
  {
    term: "MIT",
    slug: "managed-investment-trust",
    definition:
      "Managed Investment Trust \u2014 an Australian collective investment vehicle that can pass income through to investors with concessional withholding tax (15%) on distributions to foreign residents. Common for unlisted property and infrastructure funds.",
    category: "Tax",
  },
  {
    term: "Mortgage Broker",
    slug: "mortgage-broker",
    definition:
      "A licensed intermediary who matches borrowers with lenders across the market, rather than representing a single bank. Paid via commission from the lender, not the borrower.",
    category: "Property",
  },
  {
    term: "Native Title",
    slug: "native-title",
    definition:
      "Traditional Aboriginal and Torres Strait Islander rights over land and waters, recognised under Australian law. Mining companies must negotiate Indigenous Land Use Agreements (ILUAs) before developing projects on native-title land.",
    category: "Mining",
  },
  {
    term: "NAV",
    slug: "nav",
    definition:
      "Net Asset Value \u2014 the per-unit value of a fund's holdings after subtracting liabilities. For ETFs, the market price usually tracks NAV closely; for LICs it can diverge materially.",
    category: "General",
  },
  {
    term: "Non-Concessional Contribution",
    slug: "non-concessional-contribution",
    definition:
      "A contribution to super made from after-tax money. These are not taxed on entry but are capped (currently $120,000/year). Useful for high-earners consolidating savings into super.",
    category: "Super",
  },
  {
    term: "Non-Resident Withholding Tax",
    slug: "non-resident-withholding-tax",
    definition:
      "The flat rate of tax deducted at source on Australian-sourced income paid to foreign residents. Rates differ by income type and treaty: typically 30% on unfranked dividends, 10% on interest, 30% on royalties before DTA relief.",
    category: "Tax",
  },
  {
    term: "Off-the-Plan",
    slug: "off-the-plan",
    definition:
      "Buying a property before it's built, often with a 10% deposit and settlement when construction finishes. Can defer stamp duty in some states but carries construction and market-timing risk.",
    category: "Property",
  },
  {
    term: "Offtake Agreement",
    slug: "offtake-agreement",
    definition:
      "A pre-production contract in which a buyer agrees to purchase a specified volume of a miner's future output. Critical for financing \u2014 lenders often require offtake agreements before releasing capital.",
    category: "Mining",
  },
  {
    term: "Ongoing Fee Arrangement",
    slug: "ongoing-fee-arrangement",
    definition:
      "An annual fee for ongoing financial advice that must be agreed in writing by the client each year (FDS and annual renewal). Required disclosure framework for subscription-style adviser relationships.",
    category: "Regulatory",
  },
  {
    term: "Performance Fee",
    slug: "performance-fee",
    definition:
      "An additional fee (often 10-20%) a fund charges on returns above a benchmark or hurdle rate. Common in hedge funds and some Australian LICs. Can materially reduce investor returns in strong years.",
    category: "Fees",
  },
  {
    term: "PRRT",
    slug: "prrt",
    definition:
      "The Petroleum Resource Rent Tax \u2014 a 40% tax on the net profits of petroleum projects in Australia. Targets oil and gas producers and is levied after the company recovers its exploration and capital costs.",
    category: "Mining",
  },
  {
    term: "Royalty",
    slug: "royalty",
    definition:
      "A payment made to a state government or private landholder based on the volume or value of resources extracted. Different states charge different royalty rates for different commodities. Separate from company tax.",
    category: "Mining",
  },
  {
    term: "Self-Custody",
    slug: "self-custody",
    definition:
      "Holding your own cryptocurrency private keys, rather than trusting an exchange or custodian. Maximum security and control but no recovery option if keys are lost.",
    category: "Crypto",
  },
  {
    term: "Separately Managed Account",
    slug: "sma",
    definition:
      "SMA \u2014 a managed account where an external manager runs a standardised model portfolio on your behalf. Cheaper than fully bespoke management; more transparent than a managed fund.",
    category: "General",
  },
  {
    term: "SG",
    slug: "superannuation-guarantee",
    definition:
      "Superannuation Guarantee \u2014 the minimum percentage of ordinary time earnings employers must pay into employees' super. Currently 11.5% and rising to 12% in July 2025.",
    category: "Super",
  },
  {
    term: "Sharpe Ratio",
    slug: "sharpe-ratio",
    definition:
      "A measure of risk-adjusted return: excess return above the risk-free rate divided by volatility. Higher is better \u2014 shows return per unit of risk taken.",
    category: "General",
  },
  {
    term: "SIV",
    slug: "siv",
    definition:
      "The Significant Investor Visa (subclass 188C) \u2014 an investor visa requiring $5m of complying investments in Australia. Offers a residency pathway without needing English-language tests or age limits.",
    category: "Foreign Investment",
  },
  {
    term: "SMSF Accountant",
    slug: "smsf-accountant",
    definition:
      "A specialist accountant who handles the tax, accounting, and compliance work for self-managed super funds. SMSFs must lodge annual returns, prepare financial statements, and meet strict ATO rules \u2014 most trustees outsource this to an SMSF accountant.",
    category: "SMSF",
  },
  {
    term: "SMSF Auditor",
    slug: "smsf-auditor",
    definition:
      "An independent auditor registered with ASIC who must audit every SMSF annually before its tax return is lodged. The auditor checks compliance with the SIS Act, investment rules, and financial reporting standards. Required by law each year.",
    category: "SMSF",
  },
  {
    term: "Sole Purpose Test",
    slug: "sole-purpose-test",
    definition:
      "The SIS Act rule that every SMSF must be maintained only for the purpose of providing retirement benefits. Using SMSF assets for personal use (e.g. living in an SMSF-owned property) breaches this test and risks the fund's tax concessions.",
    category: "SMSF",
  },
  {
    term: "Sophisticated Investor",
    slug: "sophisticated-investor",
    definition:
      "A wholesale investor certified by an accountant as having sufficient financial knowledge. Often used as the entry test for early-stage private placements and wholesale funds.",
    category: "Regulatory",
  },
  {
    term: "Spouse Super Contribution",
    slug: "spouse-super-contribution",
    definition:
      "A contribution you make to your spouse's super fund. If your spouse earns under $40k you may claim a tax offset of up to $540. Useful for balancing super between partners.",
    category: "Super",
  },
  {
    term: "Stamp Duty Surcharge",
    slug: "stamp-duty-surcharge-foreign",
    definition:
      "An extra stamp duty imposed by state governments on foreign buyers of Australian residential property. Rates range from 7% (NSW) to 8% (VIC, QLD) on top of standard duty.",
    category: "Foreign Investment",
  },
  {
    term: "Standard Deviation",
    slug: "standard-deviation",
    definition:
      "A statistical measure of how much a return varies from its average over time. Used as the most common proxy for risk or volatility in finance.",
    category: "General",
  },
  {
    term: "Statement of Advice",
    slug: "statement-of-advice",
    definition:
      "SOA \u2014 the formal written advice document a planner must provide before implementing recommendations. Must disclose fees, conflicts, benefits, and the research basis. Key legal record of personal advice.",
    category: "Regulatory",
  },
  {
    term: "Strata Title",
    slug: "strata-title",
    definition:
      "Ownership of a unit in a multi-unit development where you individually own your unit and jointly own common areas with other owners. Governed by a body corporate / owners corporation.",
    category: "Property",
  },
  {
    term: "Super Co-Contribution",
    slug: "super-co-contribution",
    definition:
      "A government contribution of up to $500 to your super for low-to-middle-income earners who make personal after-tax contributions. Phases out at $60,400/year income (2026).",
    category: "Super",
  },
  {
    term: "SuperStream",
    slug: "superstream",
    definition:
      "The ATO standard for electronic payment and data exchange of super contributions. All employers and funds must use SuperStream \u2014 it's what enables same-day super transfers.",
    category: "Super",
  },
  {
    term: "Tax Offset",
    slug: "tax-offset",
    definition:
      "A direct reduction in the tax you pay, applied after your tax is calculated. Differs from a deduction, which reduces your taxable income. The franking credit offset is the most valuable for investors.",
    category: "Tax",
  },
  {
    term: "Tax Residency",
    slug: "tax-residency",
    definition:
      "Whether you're an Australian tax resident for a given financial year. Residents are taxed on worldwide income at progressive rates; non-residents only on Australian-sourced income but at higher withholding rates and without the tax-free threshold.",
    category: "Tax",
  },
  {
    term: "Temporary Resident",
    slug: "temporary-resident",
    definition:
      "A person holding a temporary Australian visa. Temporary residents can buy one established home to live in (subject to FIRB approval) but must sell when their visa ends.",
    category: "Foreign Investment",
  },
  {
    term: "Tenement",
    slug: "tenement",
    definition:
      "An exploration or mining lease granted by a state government giving a company the exclusive right to explore or mine a defined area for a specified period. Tenement registers are public and listed miners must disclose their holdings.",
    category: "Mining",
  },
  {
    term: "Torrens Title",
    slug: "torrens-title",
    definition:
      "The Australian system for registering property ownership. Whoever is on the Torrens register is the legal owner. Provides government-backed title guarantees.",
    category: "Property",
  },
  {
    term: "Tracking Error",
    slug: "tracking-error",
    definition:
      "How closely a passive fund follows its benchmark. Small tracking error is desirable for index funds \u2014 it means you're getting the index return minus fees.",
    category: "General",
  },
  {
    term: "Transfer Balance Cap",
    slug: "transfer-balance-cap",
    definition:
      "The lifetime cap on how much super can be transferred into the tax-free retirement pension phase. Currently $1.9m. Amounts above this must stay in accumulation (taxed at 15%).",
    category: "Super",
  },
  {
    term: "Vacancy Fee",
    slug: "vacancy-fee",
    definition:
      "An annual federal fee charged to foreign owners of Australian residential property that is vacant for more than 183 days in a year. Enforced by the ATO; rates vary by purchase price.",
    category: "Foreign Investment",
  },
  {
    term: "Vendor",
    slug: "vendor",
    definition:
      "The seller in a property transaction. Vendors usually engage a conveyancer or solicitor to prepare the contract of sale and handle settlement.",
    category: "Property",
  },
  {
    term: "Wholesale Investor",
    slug: "wholesale-investor",
    definition:
      "Under the Corporations Act, a wholesale investor is someone with $2.5m+ net assets, $250k+ annual income, or investing $500k+ in a single product. Wholesale investors can access products that aren't available to retail investors.",
    category: "Regulatory",
  },
];

/** Core (client tooltip set) + extended = the full live glossary. Server-side use only. */
export const FULL_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  ...GLOSSARY_ENTRIES,
  ...EXTENDED_GLOSSARY_ENTRIES,
];
