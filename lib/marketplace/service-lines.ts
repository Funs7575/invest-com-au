// FIN_NOTEBOOK item 18 — reverse marketplace per-service-line.
//
// Existing marketplace infrastructure (lib/marketplace/auto-bid.ts +
// allocation.ts + packages.ts + wallet.ts) ranks advisors against
// broad PMP categories. This module narrows the dimension to
// service-line: SMSF setup, super consolidation, tax-structure,
// non-resident-mortgage etc. Each service line carries:
//
//   - canonical slug
//   - human label
//   - matching specialty tags (advisor profile self-selection)
//   - typical fee range (informs the bid floor)
//   - high-LTV flag (premium 1.75× lead pricing applies)
//
// Today the canonical taxonomy lives here as a hand-curated constant.
// As the partner-onboarding flow lights up (hybrid auction self-serve
// scaffold at app/partner/auctions/) advisors will pick from this
// taxonomy when submitting their bids. The matcher then picks the
// highest-quality bid that names the user's stated service-line need.

export interface ServiceLine {
  slug: string;
  label: string;
  /** Advisor specialties (matching `lib/advisor-specialties.ts`) that
   *  qualify the advisor to bid on this service line. */
  specialties: ReadonlyArray<string>;
  /** Typical fee range in cents — informs the bid floor. */
  feeRangeCents: { min: number; max: number };
  /** When true, the cross-border premium (1.75×) applies on top of the
   *  base bid. Drives FIN_NOTEBOOK Phase A revenue numbers. */
  highLtv: boolean;
}

export const SERVICE_LINES: ReadonlyArray<ServiceLine> = [
  {
    slug: "smsf-setup",
    label: "SMSF setup + first-year admin",
    specialties: ["SMSF Specialist", "Tax Agent (SMSF)"],
    feeRangeCents: { min: 350000, max: 1500000 },
    highLtv: true,
  },
  {
    slug: "super-consolidation",
    label: "Super-fund consolidation + investment-mix review",
    specialties: ["Super Specialist", "Financial Planner"],
    feeRangeCents: { min: 80000, max: 400000 },
    highLtv: false,
  },
  {
    slug: "tax-structure",
    label: "Investment tax structure (trusts / companies / negative gearing)",
    specialties: ["Tax Agent", "SMSF Specialist"],
    feeRangeCents: { min: 200000, max: 1500000 },
    highLtv: true,
  },
  {
    slug: "uk-pension-transfer",
    label: "UK → AU pension transfer (QROPS)",
    specialties: ["UK Pension Transfer"],
    feeRangeCents: { min: 600000, max: 2500000 },
    highLtv: true,
  },
  {
    slug: "us-expat-tax",
    label: "FATCA / FBAR / PFIC for US-AU duals",
    specialties: ["FATCA-Aware US Expat Planning"],
    feeRangeCents: { min: 250000, max: 800000 },
    highLtv: true,
  },
  {
    slug: "non-resident-mortgage",
    label: "Non-resident home loan + FX",
    specialties: ["Mortgage Broker (Non-Resident)", "Mortgage Broker"],
    feeRangeCents: { min: 0, max: 0 },
    highLtv: true,
  },
  {
    slug: "firb-application",
    label: "FIRB application + foreign-buyer property structuring",
    specialties: ["FIRB Property (Non-Resident)", "Property Lawyer"],
    feeRangeCents: { min: 150000, max: 800000 },
    highLtv: true,
  },
  {
    slug: "estate-planning",
    label: "Estate planning + testamentary trust",
    specialties: ["Estate Planner"],
    feeRangeCents: { min: 200000, max: 1200000 },
    highLtv: false,
  },
  {
    slug: "buyers-agent-residential",
    label: "Residential buyers agent — full search + acquisition",
    specialties: ["Buyers Agent"],
    feeRangeCents: { min: 1000000, max: 5000000 },
    highLtv: false,
  },
  {
    slug: "first-home-buyer-coaching",
    label: "First-home-buyer coaching + FHSS + grant maximisation",
    specialties: ["Financial Planner", "Mortgage Broker"],
    feeRangeCents: { min: 0, max: 200000 },
    highLtv: false,
  },
];

const BY_SLUG = new Map(SERVICE_LINES.map((s) => [s.slug, s]));

export function getServiceLine(slug: string): ServiceLine | undefined {
  return BY_SLUG.get(slug);
}

export function listServiceLines(): ReadonlyArray<ServiceLine> {
  return SERVICE_LINES;
}

/**
 * Returns the service lines the advisor's specialties qualify them
 * to bid on. Used by the partner-onboarding flow to render the
 * eligible bid menu.
 */
export function serviceLinesForAdvisorSpecialties(
  advisorSpecialties: ReadonlyArray<string>,
): ReadonlyArray<ServiceLine> {
  const set = new Set(advisorSpecialties);
  return SERVICE_LINES.filter((line) =>
    line.specialties.some((spec) => set.has(spec)),
  );
}

/**
 * Returns true when the service line qualifies for the cross-border
 * premium pricing (1.75× lead multiplier). Mirror of the existing
 * cross-border specialty check in lib/advisor-billing-multipliers.ts.
 */
export function isHighLtvServiceLine(slug: string): boolean {
  return BY_SLUG.get(slug)?.highLtv ?? false;
}
