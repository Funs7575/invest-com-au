import type { ProfessionalType } from "@/lib/types";

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
