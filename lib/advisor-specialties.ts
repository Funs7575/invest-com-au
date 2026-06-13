import type { ProfessionalType } from "@/lib/types";

// ═══════════════════════════════════════════════
// Cross-border specialty set (single source of truth)
// ═══════════════════════════════════════════════
//
// Listed here at module top so downstream pricing/routing modules
// (`lib/advisor-billing.ts`, `lib/advisor-billing-multipliers.ts`,
// country-page CTA filters, etc.) can import the canonical list without
// duplicating the strings. Keep IN SYNC with the "Cross-border & expat"
// category below — the category spreads this constant.

export const CROSS_BORDER_SPECIALTY_CATEGORY = "Cross-border & expat";

export const CROSS_BORDER_SPECIALTIES: readonly string[] = [
  "UK Pension Transfer",
  "FATCA-Aware US Expat Planning",
  "DASP Processing",
  "FIRB Property (Non-Resident)",
];

// ═══════════════════════════════════════════════
// Specialty Taxonomy
// ═══════════════════════════════════════════════

export const ADVISOR_SPECIALTY_CATEGORIES: {
  category: string;
  specialties: string[];
}[] = [
  {
    category: "Superannuation & SMSF",
    specialties: [
      "SMSF Setup",
      "SMSF Compliance & Audit",
      "SMSF Property Investment",
      "SMSF Wind-up",
      "Super Consolidation",
      "Pension Strategies",
      "Salary Sacrifice",
      "Defined Benefit Analysis",
    ],
  },
  {
    category: "Tax & Compliance",
    specialties: [
      "Individual Tax Returns",
      "Business Tax",
      "Capital Gains Tax",
      "Crypto Tax",
      "Investment Property Tax",
      "International Tax",
      "BAS & GST",
      "R&D Tax Incentive",
      "Negative Gearing",
    ],
  },
  {
    category: "Investment & Wealth",
    specialties: [
      "Retirement Planning",
      "Wealth Accumulation",
      "Portfolio Management",
      "Ethical Investing",
      "High Net Worth Advisory",
      "Family Office Services",
    ],
  },
  {
    category: "Property",
    specialties: [
      "First Home Buyers",
      "Investment Property",
      "Refinancing",
      "Construction Loans",
      "Commercial Lending",
      "Off-Market Sourcing",
      "Property Negotiation",
      "Development Feasibility",
      "SMSF Lending",
    ],
  },
  {
    category: "Insurance & Risk",
    specialties: [
      "Life Insurance",
      "Income Protection",
      "Business Insurance",
      "Key Person Insurance",
      "Insurance within Super",
    ],
  },
  {
    category: "Estate & Succession",
    specialties: [
      "Wills & Testamentary Trusts",
      "Powers of Attorney",
      "Succession Planning",
      "Probate",
      "Business Succession",
      "Intergenerational Wealth",
    ],
  },
  {
    category: "Aged Care",
    specialties: [
      "Residential Aged Care",
      "Home Care Packages",
      "Centrelink & DVA",
      "Aged Care Financial Assessment",
    ],
  },
  {
    category: "Crypto & Digital Assets",
    specialties: [
      "Bitcoin Investment",
      "DeFi Strategies",
      "Crypto Portfolio Management",
      "Digital Asset Custody",
    ],
  },
  {
    category: "Debt & Hardship",
    specialties: [
      "Debt Consolidation",
      "Financial Hardship",
      "Bankruptcy Alternatives",
      "Credit Repair",
      "Budget Coaching",
    ],
  },
  {
    category: "Business & Special Situations",
    specialties: [
      "Small Business Owners",
      "Divorce Financial Planning",
      "Redundancy Planning",
      "FIFO Worker Planning",
    ],
  },
  {
    // Cross-border specialties (added 2026-05-01). The base taxonomy already
    // covers FIRB Applications, SIV Complying Investment Structuring,
    // International Tax, Skilled Migration etc. — these four fill specific
    // gaps where the journey is unmistakable but no tag exists today:
    //   • UK arrivals with stranded private/state pensions (huge LTV)
    //   • US persons whose AU portfolio choices are constrained by FATCA/PFIC
    //   • Departing temp visa holders claiming DASP super refunds
    //   • Non-residents buying AU property where FIRB rules + AU credit
    //     history + tax treatment all interact
    category: CROSS_BORDER_SPECIALTY_CATEGORY,
    specialties: [...CROSS_BORDER_SPECIALTIES],
  },
  {
    // SM-02: Cultural + faith-based routing (added 2026-05-18). Advisors who
    // self-declare these tags appear in "Cultural Match" quick-filter results.
    // Halal and ethical investing are distinct from ESG (methodology differs).
    category: "Cultural & Faith-Based",
    specialties: [
      "Halal Investing",
      "Ethical / ESG Investing",
      "Buddhist Financial Principles",
      "Culturally Sensitive Advice",
      "Bilingual Financial Advice",
      "Socially Responsible Investing",
    ],
  },
];

// ═══════════════════════════════════════════════
// Flat sorted list of all specialties
// ═══════════════════════════════════════════════

export const ALL_ADVISOR_SPECIALTIES: string[] = ADVISOR_SPECIALTY_CATEGORIES.flatMap(
  (c) => c.specialties
).sort((a, b) => a.localeCompare(b));

// ═══════════════════════════════════════════════
// Specialties by advisor type
// ═══════════════════════════════════════════════

export const SPECIALTIES_BY_TYPE: Record<ProfessionalType, string[]> = {
  smsf_accountant: [
    "SMSF Setup",
    "SMSF Compliance & Audit",
    "SMSF Property Investment",
    "SMSF Wind-up",
    "Super Consolidation",
    "Pension Strategies",
    "Salary Sacrifice",
    "Defined Benefit Analysis",
    "Capital Gains Tax",
    "Business Tax",
    "Individual Tax Returns",
    "Negative Gearing",
  ],
  financial_planner: [
    "Retirement Planning",
    "Wealth Accumulation",
    "Portfolio Management",
    "Ethical Investing",
    "High Net Worth Advisory",
    "Family Office Services",
    "Super Consolidation",
    "Pension Strategies",
    "Salary Sacrifice",
    "Defined Benefit Analysis",
    "Insurance within Super",
    "Life Insurance",
    "Income Protection",
    "Divorce Financial Planning",
    "Redundancy Planning",
    "FIFO Worker Planning",
    "Small Business Owners",
    "UK Pension Transfer",
    "FATCA-Aware US Expat Planning",
  ],
  property_advisor: [
    "First Home Buyers",
    "Investment Property",
    "Off-Market Sourcing",
    "Property Negotiation",
    "Development Feasibility",
    "SMSF Property Investment",
    "Negative Gearing",
    "Investment Property Tax",
  ],
  tax_agent: [
    "Individual Tax Returns",
    "Business Tax",
    "Capital Gains Tax",
    "Crypto Tax",
    "Investment Property Tax",
    "International Tax",
    "BAS & GST",
    "R&D Tax Incentive",
    "Negative Gearing",
    "Small Business Owners",
    "UK Pension Transfer",
    "FATCA-Aware US Expat Planning",
    "DASP Processing",
  ],
  mortgage_broker: [
    "First Home Buyers",
    "Investment Property",
    "Refinancing",
    "Construction Loans",
    "Commercial Lending",
    "SMSF Lending",
  ],
  estate_planner: [
    "Wills & Testamentary Trusts",
    "Powers of Attorney",
    "Succession Planning",
    "Probate",
    "Business Succession",
    "Intergenerational Wealth",
  ],
  insurance_broker: [
    "Life Insurance",
    "Income Protection",
    "Business Insurance",
    "Key Person Insurance",
    "Insurance within Super",
  ],
  buyers_agent: [
    "First Home Buyers",
    "Investment Property",
    "Off-Market Sourcing",
    "Property Negotiation",
    "Development Feasibility",
  ],
  real_estate_agent: [
    "Residential Sales",
    "Investment Property Sales",
    "Auction Campaigns",
    "Private Treaty Sales",
    "Property Appraisals",
    "Vendor Advocacy",
    "Commercial Sales",
  ],
  wealth_manager: [
    "Retirement Planning",
    "Wealth Accumulation",
    "Portfolio Management",
    "Ethical Investing",
    "High Net Worth Advisory",
    "Family Office Services",
    "Pension Strategies",
    "Intergenerational Wealth",
    "Succession Planning",
  ],
  aged_care_advisor: [
    "Residential Aged Care",
    "Home Care Packages",
    "Centrelink & DVA",
    "Aged Care Financial Assessment",
    "Pension Strategies",
    "Powers of Attorney",
  ],
  crypto_advisor: [
    "Bitcoin Investment",
    "DeFi Strategies",
    "Crypto Portfolio Management",
    "Digital Asset Custody",
    "Crypto Tax",
    "Capital Gains Tax",
  ],
  debt_counsellor: [
    "Debt Consolidation",
    "Financial Hardship",
    "Bankruptcy Alternatives",
    "Credit Repair",
    "Budget Coaching",
  ],
  stockbroker_firm: [
    "Australian Equities",
    "International Equities",
    "Fixed Income & Bonds",
    "IPOs & Capital Raisings",
    "Managed Portfolios",
    "Discretionary Management",
    "Corporate Advisory",
    "Ethical / ESG Investing",
    "SMSF Stockbroking",
    "Margin Lending",
  ],
  private_wealth_manager: [
    "Multi-Asset Portfolios",
    "Discretionary Management",
    "Tax-Aware Investing",
    "Family Office Services",
    "Estate & Succession",
    "Philanthropic Advisory",
    "International Diversification",
    "Alternative Investments",
  ],
  mining_lawyer: [
    "Tenement Applications",
    "Mining Title Transfers",
    "Native Title & Land Access",
    "Environmental Approvals",
    "Joint Venture Agreements",
    "Resource Project Financing",
    "Royalty Agreements",
    "ASX Compliance",
  ],
  mining_tax_advisor: [
    "Petroleum Resource Rent Tax",
    "Mining Royalties",
    "R&D Tax Incentive",
    "Capital Allowances",
    "Exploration Deductions",
    "International Tax",
    "Transfer Pricing",
  ],
  migration_agent: [
    "Business Innovation Visa",
    "Investor Visa",
    "Significant Investor Visa",
    "Skilled Migration",
    "Employer-Sponsored Visas",
    "Permanent Residency",
    "Citizenship Applications",
    "DASP Processing",
  ],
  business_broker: [
    "Business Valuations",
    "Business Sales",
    "Business Acquisitions",
    "Confidential Listings",
    "Exit Planning",
    "Due Diligence",
    "Franchise Resales",
  ],
  commercial_lawyer: [
    "Contract Drafting & Review",
    "Shareholder Agreements",
    "Commercial Disputes",
    "Business Structuring",
    "Employment Law",
    "Intellectual Property",
    "Mergers & Acquisitions",
  ],
  rural_property_agent: [
    "Farmland Sales",
    "Grazing Property",
    "Cropping Enterprises",
    "Lifestyle Acreage",
    "Water Rights",
    "Rural Appraisals",
    "Succession Planning",
  ],
  commercial_property_agent: [
    "Office Leasing",
    "Retail Leasing",
    "Industrial Property",
    "Investment Sales",
    "Development Sites",
    "Tenant Representation",
    "Property Valuations",
  ],
  grant_writer: [
    "R&D Tax Incentive Claims",
    "EMDG Applications",
    "Federal Grant Writing",
    "State Grant Programs",
    "Industry Growth Program",
    "Grant Strategy & Eligibility Review",
  ],
  energy_consultant: [
    "Solar Feasibility",
    "Battery Storage",
    "Commercial Energy Audits",
    "Renewable PPA Advisory",
    "Grid Connection",
    "Energy Project Financing",
    "Sustainability Strategy",
  ],
  energy_financial_planner: [
    "Concentrated ASX Energy Portfolios",
    "Franking Credit Harvesting",
    "Refinery / LNG Sector Tax Planning",
    "SMSF Energy Infrastructure",
    "Division 293 Strategy",
    "Employee Share Scheme De-risking",
  ],
  resources_fund_manager: [
    "Long-only Resources Funds",
    "Long-short Resources",
    "Critical Minerals Strategy",
    "Energy Transition Funds",
    "Wholesale Mandates",
    "Small-cap Energy Equities",
  ],
  foreign_investment_lawyer: [
    "FIRB Applications",
    "FIRB Property (Non-Resident)",
    "Critical Infrastructure Review",
    "National Security Review",
    "Sovereign Wealth Mandates",
    "JKM-linked LNG Offtakes",
    "Cross-border Energy JVs",
  ],
  petroleum_royalties_advisor: [
    "Royalty Valuation",
    "PRRT Interaction",
    "Overriding / Net-Profits Royalties",
    "State Royalty Audits",
    "Secondary Royalty Trading",
    "SMSF Royalty Tax Treatment",
  ],
  smsf_auditor: [
    "SMSF Annual Audit",
    "Compliance Audit",
    "Financial Audit",
    "In-house Asset Review",
    "NALI Risk Review",
    "ATO Audit Liaison",
  ],
  smsf_specialist: [
    "SMSF Setup",
    "Investment Strategy",
    "Trust Deed Review",
    "LRBA Structuring",
    "Pension Phase Transition",
    "Death Benefit Nominations",
  ],
  immigration_investment_lawyer: [
    "Significant Investor Visa (SIV)",
    "Business Innovation Visa",
    "SIV Complying Investment Structuring",
    "FIRB Coordination",
    "Residency Pathways",
    "Sophisticated Investor Certification",
  ],
  fund_manager: [
    "Managed Investment Schemes",
    "Wholesale Mandates",
    "Retail-Registered Funds",
    "AFSL Licensing",
    "Custody & Administration",
    "Performance Attribution",
  ],
  conveyancer: [
    "Residential Settlement",
    "Off-the-Plan Settlement",
    "Contract Review",
    "PEXA E-Settlement",
    "Stamp Duty & Concessions",
    "First Home Buyers",
    "Title Searches",
  ],
  property_lawyer: [
    "Off-the-Plan Disputes",
    "Strata & Owners Corporation",
    "SMSF Property Structuring",
    "Property Litigation",
    "Easements & Caveats",
    "Adverse Possession",
    "Commercial Conveyancing",
    "Lease Disputes",
  ],
  classic_car_specialist: [
    "Australian Muscle Cars",
    "European Classics",
    "Restoration Economics",
    "Provenance & Authentication",
    "SMSF Collectibles Compliance",
    "Auction Representation",
    "Concours Preparation",
    "Pre-Purchase Inspection",
  ],
  luxury_asset_broker: [
    "Investment-Grade Watches",
    "Rolex Discontinued References",
    "Patek Philippe Complications",
    "Independent Watchmakers",
    "Luxury Jewellery",
    "Authentication & Provenance",
    "Consignment Sales",
    "SMSF Collectibles Compliance",
  ],
  wine_advisor: [
    "Penfolds Grange Vintages",
    "Barossa & McLaren Vale Shiraz",
    "Cellaring & Storage",
    "Fractional Wine Platforms",
    "Wine Fund Selection",
    "Liv-ex Index Tracking",
    "Auction Representation",
    "SMSF Collectibles Compliance",
  ],
  art_advisor: [
    "Australian Indigenous Art",
    "Contemporary Australian Art",
    "Auction House Representation",
    "Authentication & Provenance",
    "Fractional Art Platforms",
    "SMSF Art Compliance",
    "Estate Art Valuation",
    "Cultural Gifts Program",
  ],
  royalty_broker: [
    "Music Catalogue Royalties",
    "Mining Royalty Streams",
    "Petroleum Royalty Deals",
    "IP & Patent Royalties",
    "Wholesale Investor Structuring",
    "S708 Sophisticated Investor Compliance",
    "Royalty Fund Placement",
    "Streaming Rights Valuation",
  ],
};

// ═══════════════════════════════════════════════
// Distance / radius filter options
// ═══════════════════════════════════════════════

export const RADIUS_OPTIONS: { value: number; label: string }[] = [
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 200, label: "200 km" },
  { value: 0, label: "Any" },
];
