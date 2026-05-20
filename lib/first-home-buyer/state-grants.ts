/**
 * State-by-state First Home Owner Grant (FHOG) + stamp-duty concession
 * snapshots. Used by `/tools/state-grants-calculator` to give a
 * concrete numeric estimate per state / property type / purchase price
 * combination.
 *
 * Source-of-truth links live on each row so the underlying revenue-office
 * page is one click away — these tables drift as states amend their
 * schemes and we re-confirm against the source on each calc render.
 *
 * IMPORTANT: figures are conservative current-year estimates. Eligibility
 * details (residency, occupancy, prior-ownership) are state-specific —
 * the calculator surfaces the headline number then defers detail to the
 * state's revenue office and to a mortgage broker.
 */

export type AustralianState =
  | "nsw"
  | "vic"
  | "qld"
  | "wa"
  | "sa"
  | "tas"
  | "act"
  | "nt";

export type PropertyType = "new_build" | "established" | "land_and_build";

export type CoupleStatus = "single" | "couple";

export const STATE_LABELS: Record<AustralianState, string> = {
  nsw: "New South Wales",
  vic: "Victoria",
  qld: "Queensland",
  wa: "Western Australia",
  sa: "South Australia",
  tas: "Tasmania",
  act: "Australian Capital Territory",
  nt: "Northern Territory",
};

interface StateGrantData {
  /** First Home Owner Grant amount (AUD) for a qualifying NEW build. */
  fhogNewBuildCents: number;
  /** Optional FHOG bonus for regional NEW builds. */
  fhogRegionalBonusCents?: number;
  /** Default property-value cap on the FHOG eligibility (AUD). */
  fhogPriceCapCents: number | null;
  /**
   * Per-property-type FHOG price caps that override `fhogPriceCapCents`.
   * NSW for example caps a completed new home at $600k but a land + build
   * contract at $750k.
   */
  fhogPriceCapByTypeCents?: Partial<Record<PropertyType, number>>;
  /** Whether the FHOG applies to established/existing homes. */
  fhogAppliesToEstablished: boolean;
  /** Full stamp-duty exemption price cap (AUD). */
  stampDutyFullExemptionCapCents: number | null;
  /** Partial / scaled stamp-duty concession upper bound (AUD). */
  stampDutyPartialUpToCents: number | null;
  /**
   * Household-income test for the stamp-duty concession (AUD). When set,
   * the concession is gated on income rather than property price — this
   * is how the ACT Home Buyer Concession Scheme works (full duty waiver
   * for buyers under the income threshold regardless of property value).
   */
  stampDutyIncomeTestCents?: number;
  /**
   * Approximate stamp duty otherwise payable as a fraction of price
   * (used for the "you would save approximately" estimate). State-by-
   * state stamp duty is progressive; we use a single mid-range rate
   * that matches the published premium-residence band for each state.
   */
  approxStampDutyRate: number;
  notes: string;
  sourceUrl: string;
  /** Extra grants that stack on top of FHOG (BuildBonus, HomeGrown, etc). */
  additionalGrants?: { label: string; cents: number; sourceUrl: string }[];
}

export const STATE_GRANTS: Record<AustralianState, StateGrantData> = {
  nsw: {
    fhogNewBuildCents: 10_000_00,
    fhogPriceCapCents: 600_000_00,
    fhogPriceCapByTypeCents: {
      new_build: 600_000_00,
      land_and_build: 750_000_00,
    },
    fhogAppliesToEstablished: false,
    stampDutyFullExemptionCapCents: 800_000_00,
    stampDutyPartialUpToCents: 1_000_000_00,
    approxStampDutyRate: 0.039,
    notes:
      "FHOG $10,000 for a completed new home under $600,000, or a house-and-land / build contract under $750,000. Stamp duty fully exempt for first home buyers under $800,000, scaled concession to $1m.",
    sourceUrl: "https://www.revenue.nsw.gov.au/grants-schemes/first-home-buyer",
  },
  vic: {
    fhogNewBuildCents: 10_000_00,
    fhogRegionalBonusCents: 10_000_00,
    fhogPriceCapCents: 750_000_00,
    fhogAppliesToEstablished: false,
    stampDutyFullExemptionCapCents: 600_000_00,
    stampDutyPartialUpToCents: 750_000_00,
    approxStampDutyRate: 0.040,
    notes:
      "FHOG $10,000 for new builds in metropolitan Melbourne, $20,000 for new builds in regional Victoria. Stamp duty fully exempt for first home buyers under $600,000, scaled concession to $750,000.",
    sourceUrl: "https://www.sro.vic.gov.au/first-home-owner",
  },
  qld: {
    fhogNewBuildCents: 30_000_00,
    fhogPriceCapCents: 750_000_00,
    fhogAppliesToEstablished: false,
    stampDutyFullExemptionCapCents: 700_000_00,
    stampDutyPartialUpToCents: 800_000_00,
    approxStampDutyRate: 0.035,
    notes:
      "FHOG $30,000 for new builds (Queensland's grant was lifted in 2023). Stamp duty fully exempt under $700,000 for established homes, partial concession to $800,000. Land-only purchase $350,000 cap for the land-tax concession.",
    sourceUrl: "https://qro.qld.gov.au/property-concessions-grants/first-home-grant/",
  },
  wa: {
    fhogNewBuildCents: 10_000_00,
    fhogPriceCapCents: 750_000_00,
    fhogAppliesToEstablished: false,
    stampDutyFullExemptionCapCents: 430_000_00,
    stampDutyPartialUpToCents: 530_000_00,
    approxStampDutyRate: 0.038,
    notes:
      "FHOG $10,000 for new homes only. Stamp duty fully exempt for new homes under $430,000, partial up to $530,000.",
    sourceUrl: "https://www.wa.gov.au/service/financial-management/grants-and-subsidies/apply-the-first-home-owner-grant",
  },
  sa: {
    fhogNewBuildCents: 15_000_00,
    fhogPriceCapCents: null,
    fhogAppliesToEstablished: false,
    stampDutyFullExemptionCapCents: null,
    stampDutyPartialUpToCents: null,
    approxStampDutyRate: 0.045,
    notes:
      "FHOG $15,000 for new homes — no property value cap. Stamp duty relief for first home buyers was abolished from 2024; verify via RevenueSA for any transitional cases.",
    sourceUrl: "https://www.revenuesa.sa.gov.au/grants-and-concessions/first-home-owners",
  },
  tas: {
    fhogNewBuildCents: 30_000_00,
    fhogPriceCapCents: null,
    fhogAppliesToEstablished: false,
    // 100% duty exemption for first home buyers of established homes up to
    // $750k for settlements in the current relief window (18 Feb 2024 –
    // 30 Jun 2026). Re-confirm against SRO Tasmania once the window closes.
    stampDutyFullExemptionCapCents: 750_000_00,
    stampDutyPartialUpToCents: null,
    approxStampDutyRate: 0.04,
    notes:
      "FHOG $30,000 for new builds (Tasmania matches Queensland for the highest grant). 100% stamp-duty exemption for first home buyers of established homes up to $750,000 (relief window to 30 June 2026 — re-confirm with SRO Tasmania after that).",
    sourceUrl: "https://www.sro.tas.gov.au/property-transfer-duties/first-home-owner-grant",
  },
  act: {
    fhogNewBuildCents: 0,
    fhogPriceCapCents: null,
    fhogAppliesToEstablished: false,
    // ACT has no property-price band — the Home Buyer Concession Scheme
    // gives a full duty concession to buyers under a household-income
    // threshold, regardless of property value.
    stampDutyFullExemptionCapCents: null,
    stampDutyPartialUpToCents: null,
    stampDutyIncomeTestCents: 250_000_00,
    approxStampDutyRate: 0.04,
    notes:
      "No FHOG — replaced by the Home Buyer Concession Scheme (HBCS) which gives a full duty concession to first home buyers under the $250,000 household-income threshold, regardless of property value.",
    sourceUrl: "https://www.revenue.act.gov.au/duties/concessions",
  },
  nt: {
    fhogNewBuildCents: 10_000_00,
    fhogPriceCapCents: 750_000_00,
    fhogAppliesToEstablished: false,
    stampDutyFullExemptionCapCents: null,
    stampDutyPartialUpToCents: 650_000_00,
    approxStampDutyRate: 0.044,
    notes:
      "FHOG $10,000 for new homes. Stacks with BuildBonus ($10,000) and the HomeGrown Territory Grant ($10,000) on eligible new builds — read each grant's eligibility carefully.",
    sourceUrl: "https://nt.gov.au/property/home-owner-assistance/first-home-owners",
    additionalGrants: [
      {
        label: "BuildBonus Grant",
        cents: 10_000_00,
        sourceUrl: "https://nt.gov.au/property/home-owner-assistance/buildbonus-grant",
      },
      {
        label: "HomeGrown Territory Grant",
        cents: 10_000_00,
        sourceUrl: "https://nt.gov.au/property/home-owner-assistance/homegrown-territory-grant",
      },
    ],
  },
};

/**
 * First Home Guarantee — federal scheme (5% deposit, no LMI).
 *
 * From 1 October 2025 the scheme removed income caps AND place limits.
 * Eligibility is now driven by the property-price cap for the buyer's
 * location: a higher cap applies in capital cities + designated regional
 * centres, with a lower "rest of state" cap elsewhere.
 *
 * Source: https://www.housingaustralia.gov.au/media/unlimited-places-higher-property-price-caps-first-home-buyers-1-october-2025
 */
export const FHG_PRICE_CAPS: Record<
  AustralianState,
  { capitalCents: number; restOfStateCents: number }
> = {
  nsw: { capitalCents: 1_500_000_00, restOfStateCents: 800_000_00 },
  vic: { capitalCents: 950_000_00, restOfStateCents: 650_000_00 },
  qld: { capitalCents: 1_000_000_00, restOfStateCents: 700_000_00 },
  wa: { capitalCents: 850_000_00, restOfStateCents: 600_000_00 },
  sa: { capitalCents: 900_000_00, restOfStateCents: 500_000_00 },
  tas: { capitalCents: 700_000_00, restOfStateCents: 550_000_00 },
  act: { capitalCents: 1_000_000_00, restOfStateCents: 1_000_000_00 },
  nt: { capitalCents: 600_000_00, restOfStateCents: 600_000_00 },
};

export const FHG = {
  /** Income caps were removed from 1 October 2025. */
  hasIncomeCap: false,
  /** Place limits were removed from 1 October 2025 (was 35,000/year). */
  hasPlaceLimit: false,
  sourceUrl: "https://www.firsthomebuyers.gov.au/",
} as const;

export interface StateGrantsInput {
  state: AustralianState;
  propertyType: PropertyType;
  purchasePriceCents: number;
  householdIncomeCents: number;
  coupleStatus: CoupleStatus;
  isRegional?: boolean;
}

export interface StateGrantsResult {
  /** Total grant cash the buyer can claim (AUD cents). */
  totalGrantCents: number;
  /** FHOG-only portion of the grant. */
  fhogCents: number;
  /** Stacking grants beyond FHOG (BuildBonus etc). */
  additionalGrantsCents: number;
  /** Stamp duty payable at the purchase price after concessions. */
  stampDutyPayableCents: number;
  /** Stamp duty saved vs the base scenario without concessions. */
  stampDutySavedCents: number;
  /**
   * Whether the buyer qualifies for the First Home Guarantee. Driven by
   * the property-price cap for the buyer's location (income caps were
   * removed 1 Oct 2025). Uses the higher capital-city / regional-centre
   * cap; rest-of-state buyers should verify against the lower cap below.
   */
  fhgEligible: boolean;
  /** Capital-city / regional-centre FHG price cap for the state. */
  fhgCapCents: number;
  /** Rest-of-state FHG price cap (lower; for the caveat note). */
  fhgRestOfStateCapCents: number;
  /** Breakdown lines for display (label + amount + optional source). */
  breakdown: {
    label: string;
    cents: number;
    sourceUrl?: string;
    kind: "grant" | "duty_saving" | "duty_payable" | "info";
  }[];
  /** Plain-text caveat / notes for the state. */
  stateNotes: string;
  /** Source URL for the FHOG figure on this state's revenue office. */
  fhogSourceUrl: string;
  /** Whether FHOG applies given the property type + price + state rules. */
  fhogApplies: boolean;
  /** Reason text when FHOG does NOT apply (empty if it applies). */
  fhogIneligibleReason: string;
  /** Caveat shown for land-and-build (duty assessed differently). */
  dutyEstimateCaveat: string;
}

export function calculateStateGrants(
  input: StateGrantsInput,
): StateGrantsResult {
  const state = STATE_GRANTS[input.state];
  const price = Math.max(0, input.purchasePriceCents);

  // ── FHOG eligibility ────────────────────────────────────────────────
  let fhogApplies = true;
  let fhogIneligibleReason = "";

  if (
    !state.fhogAppliesToEstablished &&
    input.propertyType === "established"
  ) {
    fhogApplies = false;
    fhogIneligibleReason =
      "FHOG in this state applies to new builds only — established homes are not eligible.";
  }

  if (state.fhogNewBuildCents === 0) {
    fhogApplies = false;
    fhogIneligibleReason =
      fhogIneligibleReason ||
      "This jurisdiction does not run a First Home Owner Grant.";
  }

  // Per-property-type cap overrides the default cap (e.g. NSW caps a
  // completed new home at $600k but a land + build contract at $750k).
  const fhogCap =
    state.fhogPriceCapByTypeCents?.[input.propertyType] ??
    state.fhogPriceCapCents;

  if (fhogCap !== null && fhogCap !== undefined && price > fhogCap) {
    fhogApplies = false;
    fhogIneligibleReason =
      fhogIneligibleReason ||
      `Purchase price exceeds this state's $${(fhogCap / 100).toLocaleString("en-AU")} FHOG cap for a ${input.propertyType.replace(/_/g, " ")}.`;
  }

  // ── FHOG amount ─────────────────────────────────────────────────────
  let fhogCents = 0;
  if (fhogApplies) {
    fhogCents = state.fhogNewBuildCents;
    if (input.isRegional && state.fhogRegionalBonusCents) {
      fhogCents += state.fhogRegionalBonusCents;
    }
  }

  // ── Additional grants (NT BuildBonus etc) ───────────────────────────
  const additionalGrantsCents = fhogApplies
    ? (state.additionalGrants ?? []).reduce((sum, g) => sum + g.cents, 0)
    : 0;

  // ── Stamp duty (base + concession) ──────────────────────────────────
  const baseStampDuty = Math.round(price * state.approxStampDutyRate);

  let stampDutyPayable = baseStampDuty;
  if (
    state.stampDutyIncomeTestCents !== undefined &&
    input.householdIncomeCents <= state.stampDutyIncomeTestCents
  ) {
    // Income-tested full concession (ACT Home Buyer Concession Scheme):
    // duty waived regardless of property price for buyers under the
    // household-income threshold.
    stampDutyPayable = 0;
  } else if (
    state.stampDutyFullExemptionCapCents !== null &&
    price <= state.stampDutyFullExemptionCapCents
  ) {
    stampDutyPayable = 0;
  } else if (
    state.stampDutyPartialUpToCents !== null &&
    price <= state.stampDutyPartialUpToCents
  ) {
    // Half-rate concession band (mirrors the typical state phase-out
    // curve well enough for a planning estimate).
    stampDutyPayable = Math.round(baseStampDuty * 0.5);
  }

  const stampDutySavedCents = Math.max(0, baseStampDuty - stampDutyPayable);

  // Vacant land / house-and-land packages are assessed on the land value
  // with state-specific bands, so the dwelling-based estimate above is
  // indicative only — flag it rather than imply false precision.
  const dutyEstimateCaveat =
    input.propertyType === "land_and_build"
      ? "House-and-land and vacant-land purchases are assessed for duty on the land value with separate concession bands — treat the stamp-duty figures as indicative and confirm with your state revenue office."
      : "";

  // ── Output breakdown ────────────────────────────────────────────────
  const breakdown: StateGrantsResult["breakdown"] = [];
  if (fhogCents > 0) {
    breakdown.push({
      label: input.isRegional && state.fhogRegionalBonusCents
        ? `FHOG (incl. regional bonus)`
        : "First Home Owner Grant",
      cents: fhogCents,
      sourceUrl: state.sourceUrl,
      kind: "grant",
    });
  }
  if (fhogApplies && state.additionalGrants) {
    for (const ag of state.additionalGrants) {
      breakdown.push({
        label: ag.label,
        cents: ag.cents,
        sourceUrl: ag.sourceUrl,
        kind: "grant",
      });
    }
  }
  if (stampDutySavedCents > 0) {
    breakdown.push({
      label: "Stamp duty saved",
      cents: stampDutySavedCents,
      sourceUrl: state.sourceUrl,
      kind: "duty_saving",
    });
  }
  if (stampDutyPayable > 0) {
    breakdown.push({
      label: "Stamp duty payable (est.)",
      cents: stampDutyPayable,
      sourceUrl: state.sourceUrl,
      kind: "duty_payable",
    });
  }

  // ── First Home Guarantee eligibility (federal) ──────────────────────
  // No income cap since 1 Oct 2025 — eligibility is now driven by the
  // property-price cap. Use the higher capital-city / regional-centre cap
  // (the calculator has no postcode granularity); rest-of-state buyers
  // verify against the lower cap surfaced in the result.
  const caps = FHG_PRICE_CAPS[input.state];
  const fhgEligible = price <= caps.capitalCents;

  const totalGrantCents = fhogCents + additionalGrantsCents;

  return {
    totalGrantCents,
    fhogCents,
    additionalGrantsCents,
    stampDutyPayableCents: stampDutyPayable,
    stampDutySavedCents,
    fhgEligible,
    fhgCapCents: caps.capitalCents,
    fhgRestOfStateCapCents: caps.restOfStateCents,
    breakdown,
    stateNotes: state.notes,
    fhogSourceUrl: state.sourceUrl,
    fhogApplies,
    fhogIneligibleReason,
    dutyEstimateCaveat,
  };
}

export function formatAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
