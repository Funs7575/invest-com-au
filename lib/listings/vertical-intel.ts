/**
 * Per-category editorial intelligence for the lot (listing detail) page.
 *
 * One registry entry per `/invest/<slug>/listings` category carrying the
 * copy that used to be forked across the bespoke detail pages (headings,
 * enquiry nouns, FIRB notes) plus the "field guide" content that makes a
 * sparse listing still feel substantive: what buyers typically check,
 * typical holding costs, an honest liquidity picture, and realistic exit
 * paths.
 *
 * Editorial redlines (REGULATORY-AVOID-LIST · lean lane):
 *   - Factual/general information only — describe what buyers *check* and
 *     what costs *exist*, never what will perform or what anyone should do.
 *   - No return promises, no "expected to appreciate", no urgency framing.
 *   - Capital-markets entries (startups, pre-ipo, funds, private-equity,
 *     venture flavours) stay risk-forward and change no gating posture.
 *
 * Keyed by route category slug (see `lib/invest-listing-routes.ts`).
 * Unknown slugs get DEFAULT_INTEL so the lot page never renders empty.
 */

export interface VerticalIntel {
  /** "property" / "project" / "company" / "business" / "asset". */
  noun: string;
  detailsHeading: string;
  aboutHeading: string;
  enquiryHeading: string;
  enquirySubcopy: string;
  /** key_metrics keys promoted next to the price (first present wins). */
  highlightMetricKeys: string[];
  /** Vertical-specific FIRB sentence (falls back to generic copy). */
  firbNote?: string;
  /** "What buyers typically check" — factual due-diligence checklist. */
  dueDiligence: string[];
  /** Typical ongoing-cost lines when the listing states none. */
  typicalCosts: string[];
  /** Honest liquidity narrative for the asset class. */
  liquidity: string;
  /** Realistic ways out of the position. */
  exitPaths: string[];
  /** Extra risk-forward line for higher-risk verticals. */
  riskNote?: string;
}

const DEFAULT_INTEL: VerticalIntel = {
  noun: "opportunity",
  detailsHeading: "Opportunity Details",
  aboutHeading: "About This Opportunity",
  enquiryHeading: "Enquire About This Opportunity",
  enquirySubcopy: "Send a confidential enquiry to the listing team.",
  highlightMetricKeys: [],
  dueDiligence: [
    "Verify the seller's identity and ABN before sharing personal details",
    "Ask for every claim in the listing to be backed by a document",
    "Get independent legal and financial advice before committing funds",
    "Confirm how and where your money is held during the transaction",
  ],
  typicalCosts: [
    "Legal and due-diligence fees at purchase",
    "Ongoing holding or management costs — ask for a full schedule",
    "Selling costs when you exit (agent, broker or auction fees)",
  ],
  liquidity:
    "Private-market assets rarely sell quickly. Plan on months, not days, to find a buyer at fair value.",
  exitPaths: ["Private sale", "Specialist broker or agent", "Auction"],
};

const INTEL: Record<string, VerticalIntel> = {
  "buy-business": {
    noun: "business",
    detailsHeading: "Key Metrics",
    aboutHeading: "About This Business",
    enquiryHeading: "Enquire About This Business",
    enquirySubcopy: "Send a confidential enquiry to the broker or owner.",
    highlightMetricKeys: ["annual_ebitda", "annual_profit", "years_established"],
    firbNote:
      "Foreign buyers may need FIRB approval depending on the deal size and sector. Check the current thresholds before signing.",
    dueDiligence: [
      "Three years of financials, verified by your own accountant",
      "Whether profit depends on the current owner staying involved",
      "Lease terms, key contracts and whether they transfer with the sale",
      "Why the owner is selling — and whether staff and customers know",
    ],
    typicalCosts: [
      "Stamp duty and legal fees at purchase (varies by state)",
      "Working capital from day one — most sales exclude it",
      "Transition costs: training, rebranding, systems",
    ],
    liquidity:
      "Small businesses typically take 6–12 months to sell, and many never find a buyer at the asking price.",
    exitPaths: ["Trade sale to a competitor", "Sale via business broker", "Management or staff buyout"],
  },
  franchise: {
    noun: "franchise",
    detailsHeading: "Franchise Details",
    aboutHeading: "About This Franchise",
    enquiryHeading: "Enquire About This Franchise",
    enquirySubcopy: "Send a confidential enquiry to the franchisor or broker.",
    highlightMetricKeys: ["initial_investment", "franchise_term_years", "sites"],
    dueDiligence: [
      "The disclosure document and franchise agreement, reviewed by a franchise lawyer",
      "Earnings claims tested against existing franchisees you contact yourself",
      "Territory rights, renewal terms and what happens at end of term",
      "Total entry cost including fit-out, stock and working capital — not just the franchise fee",
    ],
    typicalCosts: [
      "Ongoing royalties and marketing levies (usually % of revenue)",
      "Mandatory refurbishment cycles in the agreement",
      "Equipment and POS systems specified by the franchisor",
    ],
    liquidity:
      "Reselling a franchise needs franchisor consent and an approved buyer — exits routinely take 6–12 months.",
    exitPaths: ["Resale to a franchisor-approved buyer", "Sale back to the franchisor (if offered)", "End-of-term non-renewal"],
  },
  mining: {
    noun: "project",
    detailsHeading: "Project Details",
    aboutHeading: "About This Project",
    enquiryHeading: "Enquire About This Project",
    enquirySubcopy: "Send a confidential enquiry to the project team.",
    highlightMetricKeys: ["commodity", "jorc_resource", "tenement_area"],
    firbNote:
      "Mining tenements are a sensitive sector — foreign buyers generally need FIRB notification regardless of value.",
    dueDiligence: [
      "Tenement standing: granted vs application, expiry and annual commitments",
      "JORC resource statements vs exploration targets — they are not the same thing",
      "Environmental bonds, rehabilitation liabilities and native-title status",
      "Whether stated metallurgy and infrastructure access are verified or assumed",
    ],
    typicalCosts: [
      "Annual tenement rent and minimum expenditure commitments",
      "Environmental bonding and compliance reporting",
      "Care-and-maintenance costs if the project pauses",
    ],
    liquidity:
      "Project-level mining interests trade infrequently and prices swing with the commodity cycle. Exits can take years in a weak market.",
    exitPaths: ["Trade sale to a producer or explorer", "Joint-venture farm-out", "Vend into a listed vehicle"],
    riskNote:
      "Exploration-stage projects are speculative: most never reach production.",
  },
  farmland: {
    noun: "property",
    detailsHeading: "Property Details",
    aboutHeading: "About This Property",
    enquiryHeading: "Enquire About This Property",
    enquirySubcopy: "Send a confidential enquiry to the selling agent.",
    highlightMetricKeys: ["hectares", "water_entitlement_ml", "rainfall_mm"],
    firbNote:
      "Foreign buyers generally need FIRB approval for agricultural land above the cumulative $15M threshold — check your position before bidding.",
    dueDiligence: [
      "Water entitlements: volume, security class and whether they're included in the sale",
      "Soil tests, carrying capacity and rainfall history — not just the marketing figures",
      "Access, easements and any leases or agistment agreements in place",
      "Chemical-use and contamination history for cropping country",
    ],
    typicalCosts: [
      "Council rates and (state-dependent) land tax",
      "Fencing, weed and pest control — ongoing, not optional",
      "Insurance and any water-delivery charges",
    ],
    liquidity:
      "Rural property sells on a seasonal clock: well-priced country can move in a campaign, but 6–18 months is common for larger holdings.",
    exitPaths: ["Private treaty via rural agency", "Auction or expression-of-interest campaign", "Sale-and-leaseback to an operator"],
  },
  "commercial-property": {
    noun: "property",
    detailsHeading: "Property Details",
    aboutHeading: "About This Property",
    enquiryHeading: "Enquire About This Property",
    enquirySubcopy: "Send a confidential enquiry to the selling agent.",
    highlightMetricKeys: ["net_lettable_area_sqm", "wale", "occupancy_pct"],
    firbNote:
      "Foreign buyers of commercial property face FIRB thresholds that vary by property type and buyer country — confirm before contracting.",
    dueDiligence: [
      "Lease audit: WALE, incentives, make-good clauses and arrears history",
      "Tenant covenant strength — who actually pays the rent",
      "Outgoings recoveries, capex history and building condition reports",
      "Zoning, permitted use and anything affecting re-letting",
    ],
    typicalCosts: [
      "Land tax, rates and insurance (check what's recoverable from tenants)",
      "Property management fees",
      "Capex and incentives at each lease expiry",
    ],
    liquidity:
      "Commercial sales commonly run 3–9 months from listing to settlement, longer when credit is tight or the asset has vacancy.",
    exitPaths: ["On-market campaign via commercial agency", "Off-market sale to a syndicate or private buyer", "Auction for sub-$5M assets"],
  },
  "renewable-energy": {
    noun: "project",
    detailsHeading: "Project Details",
    aboutHeading: "About This Project",
    enquiryHeading: "Register Your Interest",
    enquirySubcopy: "Send a confidential enquiry to the project team.",
    highlightMetricKeys: ["capacity_mw", "ppa_term_years", "technology"],
    dueDiligence: [
      "Grid connection status: agreed, applied-for, or aspirational",
      "Offtake/PPA terms and counterparty strength",
      "Development approvals, land tenure and community standing",
      "Curtailment and marginal-loss-factor history for the region",
    ],
    typicalCosts: [
      "O&M contracts and inverter/turbine replacement reserves",
      "Land lease payments and council rates",
      "Insurance and network charges",
    ],
    liquidity:
      "Operating projects with contracted revenue attract institutional buyers; development-stage assets can take years to exit.",
    exitPaths: ["Sale to an infrastructure fund or utility", "Refinance and hold", "Portfolio aggregation sale"],
  },
  startups: {
    noun: "company",
    detailsHeading: "Company Details",
    aboutHeading: "About This Company",
    enquiryHeading: "Express Interest",
    enquirySubcopy: "Send a confidential enquiry to the founding team.",
    highlightMetricKeys: ["stage", "arr", "team_size"],
    dueDiligence: [
      "The actual security on offer (ordinary shares, preference shares, SAFE) and your rights in it",
      "Burn rate, runway and the assumptions behind revenue claims",
      "Cap table: who owns what, and what happens to you in the next raise",
      "Founder vesting and key-person dependency",
    ],
    typicalCosts: [
      "Follow-on raises will dilute you if you don't participate",
      "Legal review of the share subscription documents",
      "No income: returns, if any, arrive only at an exit event",
    ],
    liquidity:
      "There is generally no market for private startup shares. Expect to hold for 5–10 years, with a real chance of total loss.",
    exitPaths: ["Trade sale or acquisition", "IPO (rare)", "Secondary sale if the company permits one"],
    riskNote:
      "Early-stage investing is high risk: most startups fail. Only invest what you can afford to lose entirely.",
  },
  alternatives: {
    noun: "asset",
    detailsHeading: "Asset Details",
    aboutHeading: "About This Asset",
    enquiryHeading: "Enquire About This Asset",
    enquirySubcopy: "Send a confidential enquiry to the seller or dealer.",
    highlightMetricKeys: ["year", "grading", "rarity"],
    dueDiligence: [
      "Provenance: ownership history and supporting documents, not just the story",
      "Independent authentication or grading from a recognised body",
      "Condition report and any restoration work disclosed in writing",
      "Where the asset is held now, and who insures it until settlement",
    ],
    typicalCosts: [
      "Specialist insurance (often ~1% of value per year)",
      "Storage in appropriate conditions",
      "Authentication, valuation and selling commissions at exit",
    ],
    liquidity:
      "Collectable markets are thin and taste-driven. Selling well can take months and usually means auction-house commissions of 10–25%.",
    exitPaths: ["Specialist auction house", "Dealer consignment", "Private sale to a collector"],
    riskNote:
      "Collectables produce no income and prices depend entirely on what the next buyer will pay.",
  },
  "private-credit": {
    noun: "opportunity",
    detailsHeading: "Facility Details",
    aboutHeading: "About This Opportunity",
    enquiryHeading: "Request the Information Memorandum",
    enquirySubcopy: "Send a confidential enquiry to the manager.",
    highlightMetricKeys: ["target_yield_pct", "ltv", "term_months"],
    dueDiligence: [
      "What sits behind the headline yield: borrower quality, security and ranking",
      "LVR methodology and who valued the collateral",
      "Manager track record through a full credit cycle, including losses",
      "Redemption terms — and what happens when redemptions are frozen",
    ],
    typicalCosts: [
      "Management and performance fees netted from the stated yield",
      "Early-withdrawal restrictions or penalties",
      "Tax: distributions are generally income, not capital gains",
    ],
    liquidity:
      "Private credit is hold-to-maturity in practice. Redemption windows can close exactly when you most want out.",
    exitPaths: ["Hold to facility maturity", "Scheduled redemption window", "Secondary transfer if the manager allows"],
    riskNote:
      "Higher yield means higher risk of borrower default — these are not bank deposits.",
  },
  infrastructure: {
    noun: "project",
    detailsHeading: "Project Details",
    aboutHeading: "About This Project",
    enquiryHeading: "Enquire About This Project",
    enquirySubcopy: "Send a confidential enquiry to the manager.",
    highlightMetricKeys: ["asset_type", "concession_term_years", "target_yield_pct"],
    dueDiligence: [
      "Revenue model: contracted, regulated or patronage-exposed",
      "Concession/lease terms and end-of-term hand-back obligations",
      "Gearing levels and refinancing dates",
      "Counterparty and regulatory-reset risk",
    ],
    typicalCosts: [
      "Management fees within the holding vehicle",
      "Lifecycle capex obligations",
      "Debt-service ahead of any distributions",
    ],
    liquidity:
      "Unlisted infrastructure stakes change hands slowly and in large parcels; exits are negotiated, not instant.",
    exitPaths: ["Sale to an infrastructure fund", "Stake transfer at refinancing events", "Hold through concession term"],
  },
  funds: {
    noun: "fund",
    detailsHeading: "Fund Details",
    aboutHeading: "About This Fund",
    enquiryHeading: "Request Fund Information",
    enquirySubcopy: "Send a confidential enquiry to the fund manager.",
    highlightMetricKeys: ["aum_billions", "mer_bps", "strategy"],
    dueDiligence: [
      "Read the PDS or IM in full — especially fees, gates and redemption terms",
      "Whether the fund is registered with ASIC and who the responsible entity is",
      "Manager track record net of fees, over periods that include drawdowns",
      "How the underlying assets are valued and how often",
    ],
    typicalCosts: [
      "Management fees (MER) and any performance fees",
      "Buy/sell spreads on entry and exit",
      "Indirect costs disclosed deep in the PDS",
    ],
    liquidity:
      "Unlisted fund liquidity is set by the manager: monthly or quarterly windows are common, and gates can suspend redemptions entirely.",
    exitPaths: ["Redemption via the manager's window", "Transfer if the constitution permits", "Wind-up distributions"],
    riskNote:
      "Consider the PDS and target market determination before deciding. Past performance is not an indicator of future performance.",
  },
  "pre-ipo": {
    noun: "company",
    detailsHeading: "Company Details",
    aboutHeading: "About This Company",
    enquiryHeading: "Express Interest",
    enquirySubcopy: "Send a confidential enquiry to the offer team.",
    highlightMetricKeys: ["stage", "target_listing_window", "last_round_valuation"],
    dueDiligence: [
      "The basis for the valuation — and how it compares to the last priced round",
      "Whether 'pre-IPO' has a committed timetable or is aspirational",
      "Escrow terms that lock your shares after any float",
      "Your information rights as a minority holder if the IPO never happens",
    ],
    typicalCosts: [
      "Placement or broker fees built into the entry price",
      "Legal review of the subscription documents",
      "No income while you wait for a liquidity event",
    ],
    liquidity:
      "If the IPO is delayed or shelved — which happens often — there may be no way to sell for years.",
    exitPaths: ["IPO and post-escrow sale", "Trade sale of the company", "Negotiated secondary sale"],
    riskNote:
      "Pre-IPO offers are typically restricted to wholesale/sophisticated investors and carry a real risk the listing never occurs.",
  },
  "private-equity": {
    noun: "opportunity",
    detailsHeading: "Deal Details",
    aboutHeading: "About This Opportunity",
    enquiryHeading: "Request the Information Memorandum",
    enquirySubcopy: "Send a confidential enquiry to the sponsor.",
    highlightMetricKeys: ["sector", "ebitda", "hold_period_years"],
    dueDiligence: [
      "The sponsor's realised (not paper) track record",
      "Fee stack: management, performance, transaction and monitoring fees",
      "Leverage in the deal structure and covenant headroom",
      "Alignment: how much of the sponsor's own money is in",
    ],
    typicalCosts: [
      "Committed-capital fees even before money is drawn",
      "Capital calls on your schedule, not yours",
      "Carried interest on exit profits",
    ],
    liquidity:
      "PE commitments are typically locked for 7–10 years. Secondary sales exist but usually at a discount.",
    exitPaths: ["Sponsor-led exit (trade sale/IPO)", "Secondary-market sale at a discount", "Fund wind-down distributions"],
    riskNote:
      "Generally wholesale-investor territory: concentrated, leveraged and illiquid.",
  },
  royalties: {
    noun: "royalty",
    detailsHeading: "Royalty Details",
    aboutHeading: "About This Royalty",
    enquiryHeading: "Enquire About This Royalty",
    enquirySubcopy: "Send a confidential enquiry to the seller.",
    highlightMetricKeys: ["royalty_rate", "underlying_asset", "remaining_term"],
    dueDiligence: [
      "The legal instrument: what exactly the royalty attaches to and for how long",
      "Payment history and the counterparty's ability to keep paying",
      "What happens on sale, insolvency or shut-in of the underlying asset",
      "Audit rights to verify the revenue you're paid on",
    ],
    typicalCosts: [
      "Legal review of the royalty deed",
      "Ongoing audit/verification of payments",
      "Tax treatment varies — get specific advice",
    ],
    liquidity:
      "Royalty interests are bespoke contracts with few natural buyers; exits are negotiated and slow.",
    exitPaths: ["Sale to a royalty aggregator", "Buy-back by the operator", "Hold to expiry"],
  },
  "listed-securities": {
    noun: "security",
    detailsHeading: "Security Details",
    aboutHeading: "About This Security",
    enquiryHeading: "How to Invest",
    enquirySubcopy: "This security trades on the ASX — buy via your own broker.",
    highlightMetricKeys: ["asx_ticker", "market_cap", "sector"],
    dueDiligence: [
      "Recent ASX announcements and financial reports on the company page",
      "Liquidity: average daily volume vs the parcel you'd want to sell",
      "How this listing's theme exposure matches what the company actually earns",
    ],
    typicalCosts: [
      "Brokerage on each trade",
      "Buy/sell spread, wider on small caps",
    ],
    liquidity:
      "Listed on the ASX — generally saleable any trading day, though small caps can gap on thin volume.",
    exitPaths: ["Sell on-market via your broker"],
    riskNote:
      "Factual listing only — not an offer or recommendation. Invest via your own broker after your own research.",
  },
  "digital-infrastructure": {
    noun: "asset",
    detailsHeading: "Asset Details",
    aboutHeading: "About This Asset",
    enquiryHeading: "Enquire About This Asset",
    enquirySubcopy: "Send a confidential enquiry to the operator.",
    highlightMetricKeys: ["asset_type", "capacity", "contract_term_years"],
    dueDiligence: [
      "Customer contracts: term, churn history and concentration",
      "Power costs and supply security (the real cost driver)",
      "Technology-refresh obligations and obsolescence risk",
      "Connectivity/network position vs competitors",
    ],
    typicalCosts: [
      "Power and cooling (often the largest line)",
      "Maintenance and equipment refresh cycles",
      "Insurance and security compliance",
    ],
    liquidity:
      "Operating digital-infrastructure assets attract institutional interest but sell through long negotiated processes.",
    exitPaths: ["Sale to a data-centre or fibre platform", "Sale-and-leaseback", "Refinance and hold"],
  },
  "income-assets": {
    noun: "asset",
    detailsHeading: "Asset Details",
    aboutHeading: "About This Asset",
    enquiryHeading: "Enquire About This Asset",
    enquirySubcopy: "Send a confidential enquiry to the seller.",
    highlightMetricKeys: ["net_yield_pct", "contract_term_years", "operator"],
    dueDiligence: [
      "The contract behind the income: who pays, for how long, with what outs",
      "Whether the stated yield is gross or net of all costs",
      "Counterparty strength and replacement risk if they walk",
      "What the asset is worth without the income contract",
    ],
    typicalCosts: [
      "Management or servicing fees against the income stream",
      "Maintenance/insurance obligations that sit with you",
      "Re-contracting costs at term end",
    ],
    liquidity:
      "Income assets sell on their remaining contract term — shorter tail, smaller buyer pool, slower exit.",
    exitPaths: ["Sale with contract in place", "Sale to the income counterparty", "Run off the contract and sell the residual asset"],
  },
  bullion: {
    noun: "holding",
    detailsHeading: "Holding Details",
    aboutHeading: "About This Holding",
    enquiryHeading: "Enquire About This Holding",
    enquirySubcopy: "Send a confidential enquiry to the dealer.",
    highlightMetricKeys: ["metal", "weight", "purity"],
    dueDiligence: [
      "Accredited refiner bars (e.g. LBMA-listed) vs generic — it affects resale",
      "Where the metal is held: allocated, unallocated or in your possession",
      "Premium over spot you're paying now vs the spread you'll get back",
      "Audit and insurance arrangements for vaulted metal",
    ],
    typicalCosts: [
      "Vault storage and insurance (typically 0.5–1%/yr)",
      "Dealer spread on both buy and sell",
      "Transport and assay if you take delivery",
    ],
    liquidity:
      "Recognised bars and coins are among the more liquid physical assets — reputable dealers quote daily — but spreads widen in stressed markets.",
    exitPaths: ["Sell back to a bullion dealer", "Private sale", "Consign to auction for numismatic pieces"],
  },
  "water-rights": {
    noun: "entitlement",
    detailsHeading: "Entitlement Details",
    aboutHeading: "About This Entitlement",
    enquiryHeading: "Enquire About This Entitlement",
    enquirySubcopy: "Send a confidential enquiry to the water broker.",
    highlightMetricKeys: ["volume_ml", "security_class", "catchment"],
    dueDiligence: [
      "Register search confirming ownership, encumbrances and the exact entitlement class",
      "Allocation history for that class and catchment across wet and dry years",
      "Carryover rules and delivery constraints in the relevant system",
      "Your broker's standing under the water-markets intermediaries code",
    ],
    typicalCosts: [
      "Annual entitlement and delivery fees to the water authority",
      "Broker commission on trades",
      "Registry transfer fees",
    ],
    liquidity:
      "Major catchments (e.g. southern Murray–Darling) trade actively in season; smaller systems can be very thin. Allocation water moves faster than permanent entitlement.",
    exitPaths: ["Permanent transfer via a licensed water broker", "Annual allocation trade while you hold", "Sale bundled with land"],
    riskNote:
      "Water entitlements are property rights, not financial products — but values swing hard with rainfall and policy.",
  },
  "carbon-credits": {
    noun: "project",
    detailsHeading: "Project Details",
    aboutHeading: "About This Project",
    enquiryHeading: "Enquire About This Project",
    enquirySubcopy: "Send a confidential enquiry to the project proponent.",
    highlightMetricKeys: ["method", "accus_issued", "project_term_years"],
    dueDiligence: [
      "Registration status with the Clean Energy Regulator and the method used",
      "Issuance history vs forward projections (projections are not credits)",
      "Permanence obligations and reversal risk for sequestration projects",
      "Whether you're being offered the land/project interest or the units themselves",
    ],
    typicalCosts: [
      "Audit and reporting costs across the project life",
      "Land management obligations for vegetation methods",
      "Brokerage on any unit sales",
    ],
    liquidity:
      "ACCU spot markets exist but project-level interests are bespoke and slow to trade.",
    exitPaths: ["Sell issued units via accredited brokers", "Sell the project interest", "Contract forward delivery"],
    riskNote:
      "ACCUs are financial products — dealing in the units themselves involves licensed intermediaries. This page is general information only.",
  },
  "sda-housing": {
    noun: "property",
    detailsHeading: "Property Details",
    aboutHeading: "About This Property",
    enquiryHeading: "Enquire About This Property",
    enquirySubcopy: "Send a confidential enquiry to the provider.",
    highlightMetricKeys: ["sda_category", "sil_provider", "enrolment_status"],
    dueDiligence: [
      "SDA enrolment status and design category certification — in writing",
      "Tenancy: actual participant demand in that location, not state-wide stats",
      "The SIL provider relationship and what happens if they exit",
      "Vacancy assumptions behind any income projections",
    ],
    typicalCosts: [
      "Specialist property management (higher than standard residential)",
      "Compliance, audit and certification renewals",
      "Higher fit-out maintenance obligations",
    ],
    liquidity:
      "A purpose-built SDA dwelling has a narrow resale market — investors who understand the scheme — and can take many months to sell.",
    exitPaths: ["Sale to another SDA investor", "Sale to a specialist fund", "Conversion to mainstream rental (usually at lower income)"],
    riskNote:
      "Income depends on government policy settings and participant demand; neither is guaranteed.",
  },
};

/** Resolve the registry entry for a category slug (DEFAULT for unknowns). */
export function intelForCategory(slug: string): VerticalIntel {
  return INTEL[slug] ?? DEFAULT_INTEL;
}

/** Slugs with a dedicated registry entry (exported for tests). */
export const INTEL_SLUGS: readonly string[] = Object.keys(INTEL);

export { DEFAULT_INTEL };
