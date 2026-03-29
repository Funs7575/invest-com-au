/**
 * Foreign Investment in Australia — cross-vertical data library.
 * Single source of truth for all non-property foreign investment content.
 *
 * Covers: persona definitions, DTA withholding rates, non-resident tax schedule,
 * DASP rules, per-vertical foreign investor rules, visa categories.
 *
 * Data current as at March 2026.
 * Sources: ATO.gov.au, Treasury.gov.au, DASP portal, ATO tax treaties register.
 */

// ─── Persona Types ────────────────────────────────────────────────────────────

export interface ForeignInvestorPersona {
  id: string;
  label: string;
  description: string;
  icon: string;
  keyConcerns: string[];
  primaryPages: { label: string; href: string }[];
  advisorType: string;
}

export const FOREIGN_INVESTOR_PERSONAS: ForeignInvestorPersona[] = [
  {
    id: "non-resident",
    label: "Non-Resident Investor",
    description: "You live overseas and want to invest in Australia from abroad.",
    icon: "globe",
    keyConcerns: [
      "Which brokers, exchanges, and banks accept non-residents",
      "Withholding tax on dividends (30% unfranked, reduced by DTA)",
      "10% withholding tax on interest from Australian savings",
      "FIRB approval required to buy property",
      "No tax-free threshold — taxed from first dollar of Australian income",
      "CGT exemption on most Australian shares (NOT on property)",
    ],
    primaryPages: [
      { label: "Tax guide for non-residents", href: "/foreign-investment/tax" },
      { label: "Share brokers for non-residents", href: "/foreign-investment/shares" },
      { label: "Property (FIRB guide)", href: "/foreign-investment/property" },
      { label: "Find a tax agent", href: "/advisors/tax-agents" },
    ],
    advisorType: "International tax specialist",
  },
  {
    id: "temp-visa",
    label: "Temporary Visa Holder",
    description: "You're working or studying in Australia on a temporary visa.",
    icon: "id-card",
    keyConcerns: [
      "Employer super contributions — and the DASP trap when you leave (35% or 65% WHM tax)",
      "Tax residency depends on the ATO's residency tests — not automatically assumed for all visa holders",
      "Property: established dwelling purchases are banned for foreign persons 1 Apr 2025 – 31 Mar 2027 (exceptions may apply)",
      "Open brokerage, crypto, and savings accounts normally if you pass the residency tests (with TFN)",
      "Super guarantee of 11.5% applies to your wages",
      "Claim DASP via ATO portal when your visa ends and you depart",
    ],
    primaryPages: [
      { label: "Super & DASP guide", href: "/foreign-investment/super" },
      { label: "Property rules for temp residents", href: "/foreign-investment/property" },
      { label: "Find a tax agent", href: "/advisors/tax-agents" },
    ],
    advisorType: "Tax agent with international experience",
  },
  {
    id: "new-pr",
    label: "New Permanent Resident",
    description: "You recently got Australian PR and are transitioning your finances.",
    icon: "award",
    keyConcerns: [
      "Tax residency starts from your first day physically in Australia",
      "Foreign assets — deemed acquisition at market value on residency start date",
      "Access to Australian super (contribute and access at preservation age)",
      "Can buy property without FIRB approval",
      "Tax-free threshold ($18,200) and Medicare levy apply",
      "Overseas pension/super transfers — limited, check specific rules",
    ],
    primaryPages: [
      { label: "Tax guide", href: "/foreign-investment/tax" },
      { label: "Super guide", href: "/foreign-investment/super" },
      { label: "Find a financial planner", href: "/advisors/financial-planners" },
    ],
    advisorType: "Financial planner with new-resident experience",
  },
  {
    id: "expat",
    label: "Australian Expat",
    description: "You're an Australian citizen or PR living overseas.",
    icon: "plane",
    keyConcerns: [
      "Possible non-resident tax status — lose CGT discount and tax-free threshold",
      "Which brokers allow non-resident Australian citizens",
      "Selling Australian investments before leaving may be advantageous",
      "Super preserved until preservation age (cannot access as non-resident)",
      "Deemed disposal rules if you held foreign assets when becoming non-resident",
      "Returning to Australia restores residency — impacts CGT cost base",
    ],
    primaryPages: [
      { label: "Tax guide for expats", href: "/foreign-investment/tax" },
      { label: "Share brokers for non-residents", href: "/foreign-investment/shares" },
      { label: "Find a tax agent", href: "/advisors/tax-agents" },
    ],
    advisorType: "Expat tax specialist",
  },
];

// ─── DTA (Double Tax Agreement) Country Data ──────────────────────────────────

export interface DTACountry {
  country: string;
  countryCode: string;
  hasDTA: boolean;
  dividendWHT: number;      // % on unfranked dividends
  interestWHT: number;      // % on interest
  royaltiesWHT: number;     // % on royalties
  dtaEffectiveYear?: number;
  notes?: string;
}

/**
 * Australia's DTA withholding rates.
 * Without a DTA: dividends 30%, interest 10%, royalties 30%.
 * Source: ATO Tax Treaties register (ato.gov.au/General/International-tax-agreements).
 * Rates are indicative — specific rules within each treaty may vary.
 * Last reviewed: March 2026.
 */
export const DTA_COUNTRIES: DTACountry[] = [
  { country: "United States", countryCode: "US", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 5, dtaEffectiveYear: 1983, notes: "5% for companies with ≥10% interest; 15% otherwise" },
  { country: "United Kingdom", countryCode: "GB", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 5, dtaEffectiveYear: 2003 },
  { country: "New Zealand", countryCode: "NZ", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 5, dtaEffectiveYear: 2010 },
  { country: "Japan", countryCode: "JP", hasDTA: true, dividendWHT: 10, interestWHT: 10, royaltiesWHT: 5, dtaEffectiveYear: 2008 },
  { country: "China", countryCode: "CN", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1990 },
  { country: "Singapore", countryCode: "SG", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 2010 },
  { country: "Germany", countryCode: "DE", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 5, dtaEffectiveYear: 1975 },
  { country: "France", countryCode: "FR", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 5, dtaEffectiveYear: 2006 },
  { country: "Canada", countryCode: "CA", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1981 },
  { country: "South Korea", countryCode: "KR", hasDTA: true, dividendWHT: 15, interestWHT: 15, royaltiesWHT: 15, dtaEffectiveYear: 1984 },
  { country: "India", countryCode: "IN", hasDTA: true, dividendWHT: 15, interestWHT: 15, royaltiesWHT: 10, dtaEffectiveYear: 1991 },
  { country: "Indonesia", countryCode: "ID", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1993 },
  { country: "Malaysia", countryCode: "MY", hasDTA: true, dividendWHT: 15, interestWHT: 15, royaltiesWHT: 10, dtaEffectiveYear: 1982 },
  { country: "Thailand", countryCode: "TH", hasDTA: true, dividendWHT: 15, interestWHT: 25, royaltiesWHT: 15, dtaEffectiveYear: 1989, notes: "Royalties 5% for cultural, literary or artistic work" },
  { country: "Vietnam", countryCode: "VN", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1996 },
  { country: "Philippines", countryCode: "PH", hasDTA: true, dividendWHT: 25, interestWHT: 15, royaltiesWHT: 25, dtaEffectiveYear: 1979, notes: "Reduced rates apply to certain types of income" },
  { country: "Hong Kong", countryCode: "HK", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 5, dtaEffectiveYear: 2011 },
  { country: "Switzerland", countryCode: "CH", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1981 },
  { country: "Netherlands", countryCode: "NL", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1976 },
  { country: "Italy", countryCode: "IT", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1985 },
  { country: "Spain", countryCode: "ES", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1992 },
  { country: "Ireland", countryCode: "IE", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1983 },
  { country: "South Africa", countryCode: "ZA", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1999 },
  { country: "United Arab Emirates", countryCode: "AE", hasDTA: false, dividendWHT: 30, interestWHT: 10, royaltiesWHT: 30, notes: "No DTA — Australian standard rates apply" },
  { country: "Saudi Arabia", countryCode: "SA", hasDTA: false, dividendWHT: 30, interestWHT: 10, royaltiesWHT: 30, notes: "No DTA — Australian standard rates apply" },
  { country: "Brazil", countryCode: "BR", hasDTA: false, dividendWHT: 30, interestWHT: 10, royaltiesWHT: 30, notes: "No DTA with Australia. Full withholding rates apply." },
  { country: "Mexico", countryCode: "MX", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 2004 },
  { country: "Taiwan", countryCode: "TW", hasDTA: false, dividendWHT: 30, interestWHT: 10, royaltiesWHT: 30, notes: "No formal DTA. Full withholding rates apply." },
  { country: "Russia", countryCode: "RU", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 2000 },
  { country: "Chile", countryCode: "CL", hasDTA: true, dividendWHT: 15, interestWHT: 15, royaltiesWHT: 10, dtaEffectiveYear: 2013 },
  { country: "Norway", countryCode: "NO", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 5, dtaEffectiveYear: 2006 },
  { country: "Denmark", countryCode: "DK", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1981 },
  { country: "Sweden", countryCode: "SE", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1981 },
  { country: "Finland", countryCode: "FI", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 5, dtaEffectiveYear: 2007 },
  { country: "Austria", countryCode: "AT", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1988 },
  { country: "Belgium", countryCode: "BE", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1986 },
  { country: "Czech Republic", countryCode: "CZ", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1995 },
  { country: "Hungary", countryCode: "HU", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1992 },
  { country: "Poland", countryCode: "PL", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1992 },
  { country: "Romania", countryCode: "RO", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 2001 },
  { country: "Turkey", countryCode: "TR", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 2011 },
  { country: "Papua New Guinea", countryCode: "PG", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 10, dtaEffectiveYear: 1990 },
];

/** Standard Australian withholding rates with no DTA */
export const DEFAULT_WHT = {
  dividendUnfranked: 30,
  dividendFullyFranked: 0, // Tax already paid via imputation
  interest: 10,
  royalties: 30,
} as const;

// ─── Non-Resident Tax Rates ───────────────────────────────────────────────────

export interface TaxBracket {
  from: number;
  to: number | null;
  rate: number;
  description: string;
}

/**
 * Australian tax rates for non-residents (2025–26 income year).
 * Non-residents: no tax-free threshold, no Medicare levy, taxed from $0.
 * Source: ATO.gov.au/Rates/Individual-income-tax-rates (2025–26 rates)
 */
export const NON_RESIDENT_TAX_BRACKETS: TaxBracket[] = [
  { from: 0, to: 135_000, rate: 30, description: "$0 – $135,000" },
  { from: 135_001, to: 190_000, rate: 37, description: "$135,001 – $190,000" },
  { from: 190_001, to: null, rate: 45, description: "Over $190,000" },
];

/**
 * Australian resident tax rates for comparison (2025–26 income year).
 * Updated for the Stage 3 tax cuts effective 1 July 2024.
 * Source: ATO.gov.au/Rates/Individual-income-tax-rates
 */
export const RESIDENT_TAX_BRACKETS: TaxBracket[] = [
  { from: 0, to: 18_200, rate: 0, description: "Tax-free threshold" },
  { from: 18_201, to: 45_000, rate: 16, description: "$18,201 – $45,000" },
  { from: 45_001, to: 135_000, rate: 30, description: "$45,001 – $135,000" },
  { from: 135_001, to: 190_000, rate: 37, description: "$135,001 – $190,000" },
  { from: 190_001, to: null, rate: 45, description: "Over $190,000" },
];

// ─── DASP (Departing Australia Superannuation Payment) ───────────────────────

export interface DASPRate {
  componentType: string;
  withholdingRate: number;
  notes: string;
}

/**
 * DASP withholding tax rates.
 * Applied when a temporary visa holder claims super after leaving Australia.
 * These rates are deliberately high — the ATO discourages temp residents
 * from using super as a tax-advantaged savings vehicle.
 * Source: ATO.gov.au/Individuals/Super/In-detail/Leaving-Australia/
 */
export const DASP_WITHHOLDING_RATES: DASPRate[] = [
  {
    componentType: "Taxed element (most common)",
    withholdingRate: 35,
    notes: "Most super contributions and earnings fall into this category. Employer SG contributions and salary sacrifice are in this element.",
  },
  {
    componentType: "Untaxed element",
    withholdingRate: 45,
    notes: "Applies to some public sector / defined benefit funds where contributions weren't taxed on the way in.",
  },
  {
    componentType: "Tax-free component",
    withholdingRate: 0,
    notes: "Non-concessional (after-tax) contributions that have already had tax paid.",
  },
];

export const DASP_KEY_FACTS = [
  {
    fact: "Who can claim",
    detail: "Temporary visa holders (457, 482, 485, student, WHV, etc.) who have left Australia or whose visa has expired/been cancelled.",
  },
  {
    fact: "How to claim",
    detail: "Apply via the DASP online application system at ato.gov.au/dasp, or by paper if your fund cannot receive electronic claims.",
  },
  {
    fact: "When to claim",
    detail: "After your temporary visa has ceased (expired, cancelled, or you have departed Australia). You cannot claim while your visa is active.",
  },
  {
    fact: "New Zealand citizens",
    detail: "NZ citizens covered by the Trans-Tasman Retirement Savings Portability scheme may transfer their Australian super to a KiwiSaver fund instead of taking DASP.",
  },
  {
    fact: "Time limit",
    detail: "There is no strict time limit to claim DASP, but unclaimed super over 2 years may be transferred to the ATO as 'lost super'. You can still claim it from the ATO.",
  },
  {
    fact: "Tax on DASP",
    detail: "DASP withholding is final — there is no further Australian tax return required. However, you may need to declare the payment in your home country.",
  },
];

export const DASP_FAQS = [
  {
    question: "How much of my super will I get back through DASP?",
    answer: "For most temporary visa holders, approximately 65% of your super balance (35% withholding tax on taxed elements). If some of your super came from after-tax contributions (non-concessional), that portion is returned at 100%.",
  },
  {
    question: "Can I access my super before leaving Australia?",
    answer: "No. DASP can only be claimed after you have left Australia AND your temporary visa has expired or been cancelled. There is no way to access super early while still on a valid visa, even at the end of employment.",
  },
  {
    question: "What if I have multiple super funds?",
    answer: "You need to apply separately to each fund. Consider consolidating your super into a single fund before applying to simplify the process — but check if there are exit fees or insurance implications first.",
  },
  {
    question: "How long does DASP take?",
    answer: "AUSTRAC identity checks are required. Processing typically takes 28 days after the fund receives a complete application. Payment is made by electronic funds transfer to a bank account, or a cheque can be sent internationally.",
  },
  {
    question: "Is there a minimum balance to claim DASP?",
    answer: "No minimum balance. Even small amounts are worth claiming given the 35% tax still returns 65 cents per dollar — better than abandoning it.",
  },
  {
    question: "What about the Working Holiday Maker (backpacker) rate?",
    answer: "WHM visa holders (subclass 417 and 462) have a higher DASP withholding rate of 65% across ALL components, regardless of whether the component is taxed or untaxed. This is a separate regime introduced in 2017.",
  },
];

// ─── Per-Vertical Foreign Investor Rules ─────────────────────────────────────

export interface VerticalForeignRule {
  vertical: string;
  verticalSlug: string;
  icon: string;
  tagline: string;
  keyRule: string;
  canParticipate: "yes" | "mostly" | "limited" | "complex";
  participationNote: string;
  topRules: string[];
  biggestGotcha: string;
  href: string;
}

export const VERTICAL_FOREIGN_RULES: VerticalForeignRule[] = [
  {
    vertical: "Share Trading",
    verticalSlug: "shares",
    icon: "trending-up",
    tagline: "Most non-residents CAN invest — but withholding tax bites dividends hard.",
    keyRule: "30% withholding tax on unfranked dividends (reduced by DTA). CGT exemption on most Australian shares for non-residents.",
    canParticipate: "mostly",
    participationNote: "Most ASIC-regulated brokers accept non-residents, but some require Australian address or bank account.",
    topRules: [
      "30% WHT on unfranked dividends — reduced by DTA (e.g. 15% for US residents)",
      "Fully franked dividends: 0% withholding (tax already paid by company)",
      "Non-residents generally EXEMPT from Australian CGT on most shares",
      "No access to franking credit refunds — unlike Australian tax residents",
      "Some brokers refuse non-residents without an Australian bank account",
      "Enhanced KYC/AML checks — expect source of funds questions",
    ],
    biggestGotcha: "Unfranked dividends hit hard. A 30% withholding rate on all dividends (where no DTA applies) significantly reduces yield — especially for income-focused investors from countries like UAE or Brazil with no DTA.",
    href: "/foreign-investment/shares",
  },
  {
    vertical: "Crypto",
    verticalSlug: "crypto",
    icon: "bitcoin",
    tagline: "AUSTRAC-registered exchanges accept non-residents — with stricter KYC.",
    keyRule: "AUSTRAC KYC mandatory. CGT treatment of crypto for non-residents is legally complex — most crypto is likely not 'taxable Australian property'.",
    canParticipate: "mostly",
    participationNote: "Most major Australian exchanges accept non-residents, but enhanced identity verification is required.",
    topRules: [
      "All Australian crypto exchanges must be AUSTRAC-registered — protects all users",
      "Stricter KYC for non-residents: passport, overseas address, liveness check, source of funds",
      "Crypto CGT for non-residents: legally grey — most crypto likely not taxable Australian property",
      "However, your home country will likely tax crypto gains — declare in home country",
      "ATO has data-sharing agreements with major exchanges globally",
    ],
    biggestGotcha: "Don't assume no Australian tax means no tax at all. Your home country will almost certainly tax crypto gains. Get advice on dual reporting obligations.",
    href: "/foreign-investment/crypto",
  },
  {
    vertical: "Savings Accounts",
    verticalSlug: "savings",
    icon: "piggy-bank",
    tagline: "10% withholding on interest — actually lower than high-income residents pay.",
    keyRule: "Non-residents pay just 10% withholding tax on Australian bank interest — a flat rate that can be less than top marginal rates.",
    canParticipate: "limited",
    participationNote: "Banks technically accept non-residents but may require Australian address. KYC is stricter.",
    topRules: [
      "10% withholding tax on all interest income for non-residents",
      "Government guarantee ($250k per ADI) still applies to non-residents",
      "Banks may require Australian residential address to open account",
      "Some banks are much more accommodating than others for non-residents",
      "Term deposits also available to non-residents with same WHT treatment",
    ],
    biggestGotcha: "Most online savings account sign-up flows assume an Australian address. Non-residents may need to contact the bank directly or attend a branch.",
    href: "/foreign-investment/savings",
  },
  {
    vertical: "Superannuation",
    verticalSlug: "super",
    icon: "shield",
    tagline: "Temporary visa holders: your employer MUST pay super — but leaving costs 35–65%.",
    keyRule: "Super guarantee (11.5%) applies to temp visa workers. DASP withholding of 35% (or 65% for WHM) applies on departure.",
    canParticipate: "complex",
    participationNote: "Mandatory for temp visa workers in employment. Complex rules for non-residents and expats.",
    topRules: [
      "Employer super guarantee (11.5% in 2025-26) applies to all employees — including temp visa holders",
      "DASP: claim super on departure — 35% WHT on taxed element, 45% on untaxed element, 65% for Working Holiday Makers",
      "NZ citizens: Trans-Tasman scheme allows transfer to KiwiSaver instead of DASP",
      "Non-residents cannot contribute to Australian super unless working in Australia",
      "Super is preserved — cannot access until preservation age (60) OR visa condition met",
    ],
    biggestGotcha: "The 65% DASP rate for Working Holiday Makers is brutal — on a $10,000 super balance, you only receive $3,500. Many WHM holders don't know this and are shocked at the outcome.",
    href: "/foreign-investment/super",
  },
  {
    vertical: "CFD & Forex",
    verticalSlug: "cfd",
    icon: "activity",
    tagline: "Most ASIC-regulated CFD brokers accept non-residents — leverage limits apply to all.",
    keyRule: "ASIC leverage limits apply equally to all retail clients. CFD profits are ordinary income — not subject to withholding tax.",
    canParticipate: "mostly",
    participationNote: "CFD/Forex brokers generally have fewer restrictions on non-residents than share brokers.",
    topRules: [
      "ASIC leverage caps: 30:1 (major forex), 20:1 (non-major forex/gold), 10:1 (indices), 2:1 (crypto CFDs)",
      "Negative balance protection mandatory for retail clients under ASIC",
      "CFD/Forex gains are ordinary income — no CGT, no withholding tax for non-residents",
      "Most ASIC-regulated brokers accept non-residents with passport + overseas address",
      "Retail client classification applies — can apply for wholesale (professional) client status with evidence",
    ],
    biggestGotcha: "CFD gains as a non-resident are treated as income sourced in Australia — you may owe Australian income tax. Get a tax ruling if trading significant amounts.",
    href: "/foreign-investment/cfd",
  },
  {
    vertical: "Property",
    verticalSlug: "property",
    icon: "home",
    tagline: "FIRB approval required. New dwellings only for non-residents.",
    keyRule: "Foreign non-residents can only buy new dwellings, off-the-plan, or vacant land. Stamp duty surcharges 7–8% on top of standard rates.",
    canParticipate: "limited",
    participationNote: "Heavily regulated. FIRB approval required. Significant additional costs — up to $14,100 FIRB fee + 7–8% stamp duty surcharge.",
    topRules: [
      "FIRB approval required before signing contracts",
      "Non-residents: new dwellings and off-the-plan only (cannot buy existing homes)",
      "Temporary residents: ban on purchasing established dwellings from 1 Apr 2025 to 31 Mar 2027 — unless a specific exception applies",
      "Stamp duty surcharge: 7–8% depending on state (on top of standard duty)",
      "CGT on Australian property for non-residents — there is NO exemption (unlike shares)",
      "FIRB application fee: $14,100 for properties up to $1M (non-refundable)",
    ],
    biggestGotcha: "CGT on Australian property for non-residents: unlike shares, there is NO CGT exemption. Non-residents pay full CGT rates on Australian real property. There is also a 15% foreign resident CGT withholding at settlement for properties over $750k (rate increased from 12.5% to 15% from 1 January 2025).",
    href: "/foreign-investment/property",
  },
];

// ─── Key Rules Summary (for hub page callout strip) ──────────────────────────

export const TOP_5_RULES_FOR_FOREIGN_INVESTORS = [
  {
    number: "01",
    rule: "No tax-free threshold",
    detail: "Non-residents are taxed from the first dollar of Australian income at 30% (2025–26). No $18,200 tax-free threshold applies.",
  },
  {
    number: "02",
    rule: "30% dividend withholding (unfranked)",
    detail: "Unfranked dividends cop 30% withholding (or less if your country has a DTA with Australia). Fully franked dividends: 0%.",
  },
  {
    number: "03",
    rule: "35–65% DASP super tax",
    detail: "Temporary visa workers who claim their super when leaving pay 35% tax (or 65% for Working Holiday Makers). This is intentional — it's not a mistake.",
  },
  {
    number: "04",
    rule: "CGT: Shares exempt, property is not",
    detail: "Non-residents are generally exempt from Australian CGT on listed shares. But Australian real property has NO exemption — full rates apply, plus 15% withheld at settlement (rate from 1 Jan 2025).",
  },
  {
    number: "05",
    rule: "FIRB approval for any property",
    detail: "Any non-resident or temp resident buying property needs FIRB approval. Fee: from $14,100 for properties up to $1M. Applications take 30–90 days.",
  },
];

// ─── Residency Tests ──────────────────────────────────────────────────────────

export interface ResidencyTest {
  testName: string;
  description: string;
  youAreResident: string;
  notes: string;
}

export const AUSTRALIAN_RESIDENCY_TESTS: ResidencyTest[] = [
  {
    testName: "Resides Test",
    description: "The primary test — are you actually living in Australia?",
    youAreResident: "You live in Australia on an ongoing basis — your home, family, and life are here.",
    notes: "Most people who live in Australia pass this test automatically. Relevant factors: where your home is, where your family lives, your employment situation, your social ties.",
  },
  {
    testName: "Domicile Test",
    description: "Based on your permanent home ('domicile'). You are a resident if Australia is your domicile (place of permanent home), unless your 'permanent place of abode' is abroad.",
    youAreResident: "Your legal domicile is Australia AND your permanent place of abode is not overseas.",
    notes: "Australian citizens who have left Australia can still be residents under this test if they haven't established a permanent home abroad. Critical for expats.",
  },
  {
    testName: "183-Day Test",
    description: "Spends more than half the year in Australia.",
    youAreResident: "You spend at least 183 days in Australia during the income year.",
    notes: "Even if you pass this test, you may not be a resident if your 'usual place of abode' is overseas and you don't intend to take up residency in Australia.",
  },
  {
    testName: "Superannuation Test",
    description: "Applies to Australian Government employees posted overseas.",
    youAreResident: "You are a contributing member of a Commonwealth Government superannuation scheme.",
    notes: "Very narrow — applies to Australian Public Service staff posted overseas. Not relevant to most people.",
  },
];
