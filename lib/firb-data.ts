/**
 * FIRB (Foreign Investment Review Board) data — single source of truth.
 * All thresholds, state rules, surcharges, and fees referenced from this file.
 *
 * Data current as at March 2026. FIRB thresholds are indexed annually on 1 January.
 * Source: firb.gov.au, state revenue offices.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FirbThreshold {
  category: string;
  description: string;
  residentialThreshold: string | null; // null = prohibited
  notes: string;
}

export interface StateStampDutySurcharge {
  state: string;
  stateCode: string;
  surchargePercent: number;
  landTaxSurchargePercent: number | null;
  notes: string;
  revenueOfficeUrl: string;
}

export interface FirbFeeRow {
  maxValueAud: number | null; // null = unlimited
  label: string;
  feeAud: number;
}

export interface FirbProcessStep {
  step: number;
  title: string;
  description: string;
  timeframe: string;
}

export interface FirbFaqItem {
  question: string;
  answer: string;
}

export interface StateRule {
  state: string;
  stateCode: string;
  stampDutySurcharge: number;
  landTaxSurcharge: number | null;
  firstHomeBuyerExemption: boolean;
  primaryResidenceExemption: boolean;
  keyNotes: string[];
}

// ─── FIRB Thresholds (1 January 2026 values) ─────────────────────────────────

/**
 * FIRB residential real estate thresholds by buyer category.
 * Foreign persons generally cannot purchase established (existing) homes —
 * only new dwellings, off-the-plan, or vacant land for development.
 */
export const FIRB_THRESHOLDS: FirbThreshold[] = [
  {
    category: "Most Foreign Persons",
    description: "Temporary visa holders, non-residents, foreign companies",
    residentialThreshold: "$1,195,000",
    notes:
      "Can only buy NEW dwellings, off-the-plan, or vacant land for development. Cannot buy established (existing) homes.",
  },
  {
    category: "New Zealand Citizens & Permanent Residents",
    description: "NZ citizens residing in Australia or New Zealand",
    residentialThreshold: "$1,195,000",
    notes:
      "NZ citizens have similar rights to Australian citizens in most cases. No FIRB approval required below threshold for new dwellings.",
  },
  {
    category: "Free Trade Agreement (FTA) Countries",
    description:
      "Citizens/residents of USA, Canada, Chile, Japan, Korea, Singapore, Thailand, Vietnam, Peru, Malaysia, Indonesia, Hong Kong",
    residentialThreshold: "$1,195,000",
    notes:
      "FTA country investors have the same $1.195M threshold but must still seek FIRB approval. Same new-dwellings-only restriction applies.",
  },
  {
    category: "Temporary Residents — Established Home (Primary Residence)",
    description: "Temporary visa holders buying a home to live in while in Australia",
    residentialThreshold: "$1,195,000",
    notes:
      "Temporary residents may buy ONE established home to live in as their primary residence. Must sell when they leave Australia.",
  },
  {
    category: "Foreign-Owned Companies / Trusts",
    description: "Companies or trusts with ≥20% foreign ownership",
    residentialThreshold: "$0",
    notes:
      "Must seek FIRB approval for all residential property, regardless of value. Thresholds apply only to natural persons.",
  },
];

// ─── Who Needs FIRB Approval ──────────────────────────────────────────────────

export const WHO_NEEDS_FIRB = [
  {
    group: "Australian citizens",
    needsFirb: false,
    notes: "No FIRB approval required, even if residing overseas.",
  },
  {
    group: "Australian permanent residents",
    needsFirb: false,
    notes: "No FIRB approval required regardless of country of birth.",
  },
  {
    group: "New Zealand citizens",
    needsFirb: false,
    notes: "Treated similarly to Australian citizens — no approval required below thresholds.",
  },
  {
    group: "Temporary visa holders (e.g. 457, 482, student visa)",
    needsFirb: true,
    notes:
      "May buy ONE established home to live in. Can also buy new dwellings or off-the-plan. Must apply for FIRB approval.",
  },
  {
    group: "Non-residents (foreign persons with no Australian visa)",
    needsFirb: true,
    notes:
      "Can only buy new dwellings, off-the-plan, or vacant land for development. Cannot purchase established homes.",
  },
  {
    group: "Foreign companies (any foreign ownership)",
    needsFirb: true,
    notes: "All purchases require FIRB approval regardless of value.",
  },
];

// ─── Eligible Property Types ──────────────────────────────────────────────────

export const ELIGIBLE_PROPERTY_TYPES = [
  {
    type: "New Dwellings",
    eligible: true,
    description:
      "Newly constructed residential properties that have never been sold as a dwelling — apartments, townhouses, houses built by a developer.",
    examples: ["Brand new apartments in a new development", "Newly built townhouses in an estate"],
  },
  {
    type: "Off-the-Plan",
    eligible: true,
    description:
      "Properties purchased before construction is complete, based on architectural plans. The most common route for foreign investors.",
    examples: ["Pre-construction apartments", "House and land packages in growth corridors"],
  },
  {
    type: "Vacant Residential Land",
    eligible: true,
    description:
      "Empty land zoned for residential development, where the buyer must build a residential dwelling within 4 years.",
    examples: ["Subdivision lots in new estates", "Vacant blocks in residential zones"],
  },
  {
    type: "Established (Existing) Homes — Temporary Residents",
    eligible: true,
    description:
      "Temporary visa holders may purchase ONE established home to use as their primary residence. Must sell when leaving Australia.",
    examples: ["Existing house or apartment while on a work visa"],
  },
  {
    type: "Established (Existing) Homes — Non-Residents",
    eligible: false,
    description: "Foreign non-residents cannot purchase existing residential dwellings. Applications will not be approved.",
    examples: [],
  },
  {
    type: "Residential Land with Existing Dwelling",
    eligible: false,
    description:
      "Foreign non-residents generally cannot purchase land with an existing dwelling unless they intend to demolish and rebuild.",
    examples: [],
  },
];

// ─── State Stamp Duty Surcharges (March 2026) ─────────────────────────────────

/**
 * Foreign purchaser stamp duty surcharges by state.
 * Applied ON TOP of the standard stamp duty payable by all buyers.
 * These rates are subject to change — always verify with the relevant state revenue office.
 */
export const STATE_SURCHARGES: StateStampDutySurcharge[] = [
  {
    state: "New South Wales",
    stateCode: "NSW",
    surchargePercent: 8,
    landTaxSurchargePercent: 4,
    notes:
      "8% surcharge on the dutiable value. Also applies a 4% annual land tax surcharge. Applied to all foreign purchasers of residential property.",
    revenueOfficeUrl: "https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/foreign-buyer",
  },
  {
    state: "Victoria",
    stateCode: "VIC",
    surchargePercent: 8,
    landTaxSurchargePercent: 2,
    notes:
      "8% foreign purchaser additional duty (FPAD). Annual land tax surcharge of 2% for foreign-owned properties. Applies to all foreign purchasers.",
    revenueOfficeUrl: "https://www.sro.vic.gov.au/foreignpurchasers",
  },
  {
    state: "Queensland",
    stateCode: "QLD",
    surchargePercent: 7,
    landTaxSurchargePercent: 2,
    notes:
      "7% additional foreign acquirer duty (AFAD). Land tax surcharge of 2% for foreign owners. New residential properties and established homes (temporary residents) both attract the surcharge.",
    revenueOfficeUrl: "https://www.qro.qld.gov.au/duties/transfer-duty/additional-foreign-acquirer-duty/",
  },
  {
    state: "Western Australia",
    stateCode: "WA",
    surchargePercent: 7,
    landTaxSurchargePercent: null,
    notes:
      "7% foreign buyer surcharge applies to residential property. No separate land tax surcharge as of 2026.",
    revenueOfficeUrl: "https://www.finance.wa.gov.au/cms/content.aspx?id=15805",
  },
  {
    state: "South Australia",
    stateCode: "SA",
    surchargePercent: 7,
    landTaxSurchargePercent: null,
    notes:
      "7% stamp duty surcharge for foreign buyers. Applies to all acquisitions of residential land by foreign persons.",
    revenueOfficeUrl: "https://www.revenuesa.sa.gov.au/taxes-and-duties/stamp-duties/foreign-ownership",
  },
  {
    state: "Tasmania",
    stateCode: "TAS",
    surchargePercent: 8,
    landTaxSurchargePercent: null,
    notes:
      "8% foreign investor duty surcharge. Tasmania introduced its surcharge in 2023. Applies to residential land acquisitions.",
    revenueOfficeUrl: "https://www.sro.tas.gov.au/",
  },
  {
    state: "Australian Capital Territory",
    stateCode: "ACT",
    surchargePercent: 0,
    landTaxSurchargePercent: null,
    notes:
      "No foreign buyer stamp duty surcharge in the ACT as at March 2026. Standard duty rates apply. Subject to change — check ACT Revenue Office for the latest.",
    revenueOfficeUrl: "https://www.revenue.act.gov.au/duties",
  },
  {
    state: "Northern Territory",
    stateCode: "NT",
    surchargePercent: 0,
    landTaxSurchargePercent: null,
    notes:
      "No foreign buyer stamp duty surcharge in the NT as at March 2026. Standard duty rates apply.",
    revenueOfficeUrl: "https://treasury.nt.gov.au/dtf/territory-revenue-office",
  },
];

// ─── FIRB Application Fees (2026 Schedule) ────────────────────────────────────

/**
 * FIRB application fees by property value (residential real estate).
 * Fees are paid at time of application and are non-refundable.
 * Source: firb.gov.au fee schedule, indexed annually.
 */
export const FIRB_FEES: FirbFeeRow[] = [
  { maxValueAud: 1_000_000, label: "Up to $1,000,000", feeAud: 14_100 },
  { maxValueAud: 2_000_000, label: "$1,000,001 – $2,000,000", feeAud: 28_200 },
  { maxValueAud: 3_000_000, label: "$2,000,001 – $3,000,000", feeAud: 56_400 },
  { maxValueAud: 5_000_000, label: "$3,000,001 – $5,000,000", feeAud: 112_800 },
  { maxValueAud: 10_000_000, label: "$5,000,001 – $10,000,000", feeAud: 225_600 },
  { maxValueAud: null, label: "Over $10,000,000", feeAud: 451_200 },
];

export function getFirbFee(propertyValueAud: number): number {
  const row = FIRB_FEES.find((r) => r.maxValueAud === null || propertyValueAud <= r.maxValueAud);
  return row?.feeAud ?? FIRB_FEES[FIRB_FEES.length - 1].feeAud;
}

// ─── FIRB Application Process Steps ──────────────────────────────────────────

export const FIRB_PROCESS_STEPS: FirbProcessStep[] = [
  {
    step: 1,
    title: "Engage a solicitor or migration agent",
    description:
      "Before making any offer, retain an Australian property solicitor experienced in foreign investment. They will assess your eligibility, advise on visa requirements, and prepare your application.",
    timeframe: "Before signing any contracts",
  },
  {
    step: 2,
    title: "Identify an eligible property",
    description:
      "Choose a new dwelling, off-the-plan purchase, or vacant land for development. Confirm with the developer or agent that the property is FIRB-eligible.",
    timeframe: "Concurrent with Step 1",
  },
  {
    step: 3,
    title: "Submit the FIRB application online",
    description:
      "Apply via the FIRB online portal (firb.gov.au). You'll need: passport details, visa details, property information, intended use, and evidence of source of funds. Pay the application fee at submission.",
    timeframe: "Submit before exchanging contracts",
  },
  {
    step: 4,
    title: "Await decision (standard processing time)",
    description:
      "The standard processing window is 30 days, though complex cases or peak periods can extend this to 90+ days. You may be asked to provide additional information during review.",
    timeframe: "30–90 days after submission",
  },
  {
    step: 5,
    title: "Receive approval and proceed to purchase",
    description:
      "Once approved, you'll receive a written 'no objection' notice. Exchange contracts and proceed to settlement. Your solicitor will ensure all conditions of approval are met.",
    timeframe: "After approval received",
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const FIRB_FAQS: FirbFaqItem[] = [
  {
    question: "Can a foreign investor buy any property in Australia?",
    answer:
      "No. Foreign non-residents are generally restricted to new dwellings, off-the-plan properties, and vacant land for residential development. Temporary visa holders may also buy one established home to use as their primary residence while in Australia.",
  },
  {
    question: "How long does FIRB approval take?",
    answer:
      "The standard processing time is 30 days from receipt of a complete application. In practice, straightforward applications for new residential property are often resolved within 30 days. Complex commercial applications or incomplete submissions can take 90 days or more.",
  },
  {
    question: "Can I sign contracts before getting FIRB approval?",
    answer:
      "You can exchange contracts with a condition that the contract is void if FIRB approval is not obtained. Most solicitors recommend making the contract subject to FIRB approval. Do not complete (settle) a purchase without approval in place.",
  },
  {
    question: "Are FIRB application fees refundable?",
    answer:
      "No. FIRB application fees are non-refundable, whether the application is approved, refused, or withdrawn.",
  },
  {
    question: "Do I need FIRB approval if I'm buying with my Australian spouse?",
    answer:
      "If you are a foreign person buying jointly with an Australian citizen or permanent resident spouse, FIRB approval is still required for your interest in the property. However, you may be able to purchase the property entirely in your spouse's name if that is practical and legally appropriate.",
  },
  {
    question: "What is the stamp duty surcharge for foreign buyers?",
    answer:
      "Most Australian states impose an additional duty surcharge on foreign purchasers of residential property, ranging from 7% (QLD, WA, SA) to 8% (NSW, VIC, TAS), on top of standard stamp duty. The ACT and NT currently do not impose a surcharge. These rates are subject to change.",
  },
  {
    question: "Does FIRB approval guarantee I can buy the property?",
    answer:
      "FIRB approval (a 'no objection' notice) means the Australian government does not object to your purchase. It does not guarantee you will secure the property — you still need to negotiate price and terms, obtain finance, and complete conveyancing.",
  },
  {
    question: "Can I rent out a property I buy with FIRB approval?",
    answer:
      "Yes, if you've received FIRB approval to purchase a new dwelling as an investment, you can rent it out. However, if your approval was for a temporary resident purchasing an established home to live in, you typically cannot rent it out — you must sell when you leave Australia.",
  },
];

// ─── Cost Example Helper ──────────────────────────────────────────────────────

export interface CostBreakdown {
  propertyPrice: number;
  standardStampDuty: number;
  foreignSurcharge: number;
  firbFee: number;
  totalUpfrontCost: number;
}

/**
 * Rough upfront cost estimate for a foreign buyer.
 * Standard stamp duty is a simplified approximation — actual amounts vary by state.
 * Always advise users to get an exact quote from a solicitor.
 */
export function estimateForeignBuyerCosts(
  propertyPriceAud: number,
  stateCode: string
): CostBreakdown {
  const surchargeRow = STATE_SURCHARGES.find((s) => s.stateCode === stateCode);
  const surchargePercent = surchargeRow?.surchargePercent ?? 7;

  // Very rough stamp duty approximation for illustration only
  let standardStampDuty = 0;
  if (propertyPriceAud <= 500_000) {
    standardStampDuty = propertyPriceAud * 0.025;
  } else if (propertyPriceAud <= 1_000_000) {
    standardStampDuty = propertyPriceAud * 0.04;
  } else {
    standardStampDuty = propertyPriceAud * 0.055;
  }

  const foreignSurcharge = (propertyPriceAud * surchargePercent) / 100;
  const firbFee = getFirbFee(propertyPriceAud);

  return {
    propertyPrice: propertyPriceAud,
    standardStampDuty: Math.round(standardStampDuty),
    foreignSurcharge: Math.round(foreignSurcharge),
    firbFee,
    totalUpfrontCost: Math.round(
      propertyPriceAud + standardStampDuty + foreignSurcharge + firbFee
    ),
  };
}
