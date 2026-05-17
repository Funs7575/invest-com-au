export interface LeadMagnet {
  slug: string;
  hubSlug: string;
  title: string;
  description: string;
  segmentSlug: string;
  downloadUrl: string;
  coverIcon: string;
}

export const LEAD_MAGNETS: LeadMagnet[] = [
  {
    slug: "smsf-trustee-checklist",
    hubSlug: "smsf",
    title: "SMSF Trustee Compliance Checklist",
    description:
      "The 23-point year-end checklist every SMSF trustee needs — investment strategy, contribution caps, pension minimums, and audit prep.",
    segmentSlug: "smsf-hub",
    downloadUrl: "/downloads/smsf-trustee-checklist.pdf",
    coverIcon: "shield-check",
  },
  {
    slug: "franking-credits-guide",
    hubSlug: "dividends",
    title: "Franking Credits: The Complete Investor Guide",
    description:
      "How imputation credits work, who benefits most, the pension-phase SMSF advantage, and the six ASX stocks with 100% franking.",
    segmentSlug: "dividends-hub",
    downloadUrl: "/downloads/franking-credits-guide.pdf",
    coverIcon: "trending-up",
  },
  {
    slug: "wholesale-investor-checklist",
    hubSlug: "wholesale",
    title: "Wholesale Investor Qualification Checklist",
    description:
      "The three tests (assets, income, sophisticated) that unlock s708 and s761G investment opportunities in Australia.",
    segmentSlug: "wholesale-hub",
    downloadUrl: "/downloads/wholesale-investor-checklist.pdf",
    coverIcon: "briefcase",
  },
  {
    slug: "property-investment-checklist",
    hubSlug: "property",
    title: "Property Investment Due Diligence Checklist",
    description:
      "20 checks before you exchange — rental yield, vacancy rates, zoning, depreciation schedules, and CGT discount eligibility.",
    segmentSlug: "property-hub",
    downloadUrl: "/downloads/property-investment-checklist.pdf",
    coverIcon: "home",
  },
  {
    slug: "negative-gearing-calculator-guide",
    hubSlug: "negative-gearing",
    title: "Negative Gearing Tax Benefit Estimator",
    description:
      "Step-by-step worksheet to estimate your annual tax saving from a negatively geared investment property at your marginal rate.",
    segmentSlug: "negative-gearing-hub",
    downloadUrl: "/downloads/negative-gearing-guide.pdf",
    coverIcon: "calculator",
  },
  {
    slug: "etf-selection-guide",
    hubSlug: "etfs",
    title: "How to Compare ASX ETFs: The 7-Point Framework",
    description:
      "Management fees, tracking error, liquidity, index methodology, tax treatment, domicile, and dividend reinvestment — explained.",
    segmentSlug: "etfs-hub",
    downloadUrl: "/downloads/etf-selection-guide.pdf",
    coverIcon: "bar-chart",
  },
  {
    slug: "super-fund-comparison-guide",
    hubSlug: "super",
    title: "How to Compare Australian Super Funds",
    description:
      "Fees, investment options, insurance defaults, and performance benchmarks — the framework financial advisers use.",
    segmentSlug: "super-hub",
    downloadUrl: "/downloads/super-fund-comparison-guide.pdf",
    coverIcon: "shield",
  },
  {
    slug: "crypto-tax-guide",
    hubSlug: "crypto",
    title: "Crypto Tax in Australia: ATO Rules Explained",
    description:
      "CGT events, cost-base methods (FIFO vs specific ID), DeFi treatment, and how to structure records for your tax return.",
    segmentSlug: "crypto-hub",
    downloadUrl: "/downloads/crypto-tax-guide.pdf",
    coverIcon: "file-text",
  },
  {
    slug: "business-sale-checklist",
    hubSlug: "sell-business",
    title: "Preparing to Sell Your Business: 15-Point Checklist",
    description:
      "Clean financials, EBITDA normalisation, SDE multiples, earn-out structures, and the documents buyers will request at due diligence.",
    segmentSlug: "sell-business-hub",
    downloadUrl: "/downloads/business-sale-checklist.pdf",
    coverIcon: "briefcase",
  },
  {
    slug: "foreign-investment-guide",
    hubSlug: "foreign-investment",
    title: "Foreign Investment in Australia: The FIRB Guide",
    description:
      "Who needs FIRB approval, thresholds by asset class, timelines, and the common structures used by non-residents.",
    segmentSlug: "foreign-investment-hub",
    downloadUrl: "/downloads/foreign-investment-guide.pdf",
    coverIcon: "map-pin",
  },
  {
    slug: "lump-sum-investing-guide",
    hubSlug: "lump-sum-investing",
    title: "Lump Sum vs DCA: The Evidence-Based Guide",
    description:
      "Historical back-tests across ASX 200 and global equities show lump-sum beats DCA two-thirds of the time — but when doesn't it?",
    segmentSlug: "lump-sum-hub",
    downloadUrl: "/downloads/lump-sum-investing-guide.pdf",
    coverIcon: "trending-up",
  },
  {
    slug: "aged-care-planning-guide",
    hubSlug: "aged-care",
    title: "Aged Care Financial Planning Checklist",
    description:
      "RAD vs DAP options, means-tested fee calculation, asset assessment rules, and how the family home is treated by Centrelink.",
    segmentSlug: "aged-care-hub",
    downloadUrl: "/downloads/aged-care-planning-guide.pdf",
    coverIcon: "heart",
  },
];

export function getLeadMagnetForHub(hubSlug: string): LeadMagnet | undefined {
  return LEAD_MAGNETS.find((m) => m.hubSlug === hubSlug);
}
