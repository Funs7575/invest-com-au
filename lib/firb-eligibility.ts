/**
 * FIRB eligibility explainer rules — EDUCATIONAL ONLY.
 *
 * Maps (buyer status × property type) to a plain-English readout of the
 * published Foreign Investment Review Board rules, sourced from the same
 * facts as lib/firb-data.ts (WHO_NEEDS_FIRB / ELIGIBLE_PROPERTY_TYPES,
 * incl. the 1 Apr 2025 – 31 Mar 2027 established-dwelling ban).
 *
 * Compliance framing (REGULATORY-AVOID-LIST): every readout describes what
 * the published rules generally say — it never tells a specific person what
 * they can do or should do. The rendering page must show FIRB_DISCLAIMER
 * with the result and route users to a professional for their own case.
 */

export type FirbBuyerStatus =
  | "citizen"
  | "permanent_resident"
  | "nz_citizen"
  | "temporary_visa"
  | "non_resident"
  | "foreign_company";

export type FirbPropertyType =
  | "new_dwelling"
  | "off_the_plan"
  | "vacant_land"
  | "established";

export type FirbVerdict =
  /** This buyer group generally doesn't need FIRB approval at all. */
  | "no_approval_needed"
  /** Approval generally required and generally granted for this combination. */
  | "generally_approved"
  /** Established-dwelling ban window (temporary residents, 1 Apr 2025 – 31 Mar 2027). */
  | "banned_window"
  /** Applications for this combination are generally not approved. */
  | "not_approved";

export interface FirbCta {
  label: string;
  href: string;
}

export interface FirbReadout {
  verdict: FirbVerdict;
  /** Short headline for the result card. */
  title: string;
  /** 1–2 sentence plain-English summary of what the published rules say. */
  summary: string;
  /** Supporting bullet points (factual, rule-level). */
  points: string[];
  /** Where to go next. First CTA is primary. */
  ctas: FirbCta[];
}

export const FIRB_BUYER_STATUS_OPTIONS: { value: FirbBuyerStatus; label: string; hint: string }[] = [
  { value: "citizen", label: "Australian citizen", hint: "Including citizens living overseas" },
  { value: "permanent_resident", label: "Australian permanent resident", hint: "Any country of birth" },
  { value: "nz_citizen", label: "New Zealand citizen", hint: "Treated similarly to Australian citizens" },
  { value: "temporary_visa", label: "Temporary visa holder", hint: "e.g. 482, 485, student or partner visa" },
  { value: "non_resident", label: "Non-resident (no Australian visa)", hint: "Buying from overseas" },
  { value: "foreign_company", label: "Foreign company or trust", hint: "Any foreign ownership interest" },
];

export const FIRB_PROPERTY_TYPE_OPTIONS: { value: FirbPropertyType; label: string; hint: string }[] = [
  { value: "new_dwelling", label: "New dwelling", hint: "Never sold as a dwelling before — new apartments, builds" },
  { value: "off_the_plan", label: "Off-the-plan", hint: "Bought before construction completes" },
  { value: "vacant_land", label: "Vacant residential land", hint: "Must build within 4 years" },
  { value: "established", label: "Established (existing) home", hint: "Previously owned / lived-in dwelling" },
];

const ESTABLISHED_BAN_WINDOW = "1 April 2025 to 31 March 2027";

const FIND_LAWYER_CTA: FirbCta = {
  label: "Find a foreign-investment lawyer",
  href: "/advisors/foreign-investment-lawyers",
};
const APPLICATION_GUIDE_CTA: FirbCta = {
  label: "Read the FIRB application guide",
  href: "/foreign-investment/guides/firb-application-guide",
};
const BAN_GUIDE_CTA: FirbCta = {
  label: "Read the property-ban guide",
  href: "/foreign-investment/guides/property-ban-2025",
};
const ELIGIBLE_LISTINGS_CTA: FirbCta = {
  label: "Browse FIRB-eligible listings",
  href: "/property/listings?firb=true",
};

/**
 * Resolve the educational readout for a buyer-status × property-type pair.
 * Pure and deterministic — the UI renders it verbatim next to FIRB_DISCLAIMER.
 */
export function resolveFirbEligibility(
  status: FirbBuyerStatus,
  property: FirbPropertyType,
): FirbReadout {
  // Citizens, PRs and NZ citizens — FIRB approval generally not required.
  if (status === "citizen" || status === "permanent_resident" || status === "nz_citizen") {
    return {
      verdict: "no_approval_needed",
      title: "FIRB approval is generally not required",
      summary:
        "Under the published rules, this buyer group does not need FIRB approval for residential property — including established homes.",
      points: [
        "Australian citizens are exempt even while living overseas.",
        "Permanent residents are exempt regardless of country of birth.",
        "New Zealand citizens are treated similarly to Australian citizens below the relevant thresholds.",
        "Buying jointly with a foreign person can change the position — that's a case for legal advice.",
      ],
      ctas: [ELIGIBLE_LISTINGS_CTA, FIND_LAWYER_CTA],
    };
  }

  // Foreign companies / trusts — approval always required, any property type.
  if (status === "foreign_company") {
    return {
      verdict: "generally_approved",
      title: "FIRB approval is required for every purchase",
      summary:
        "Foreign companies and trusts need FIRB approval for all Australian residential property purchases, regardless of value or property type.",
      points: [
        "Applications are assessed case-by-case with conditions commonly attached.",
        "Application fees scale with the property value.",
        "Structuring (company vs trust vs individual) materially changes the position — specialist advice is essential.",
      ],
      ctas: [FIND_LAWYER_CTA, APPLICATION_GUIDE_CTA],
    };
  }

  // Temporary visa holders.
  if (status === "temporary_visa") {
    if (property === "established") {
      return {
        verdict: "banned_window",
        title: `Established homes are banned for this group (${ESTABLISHED_BAN_WINDOW})`,
        summary:
          `The Australian Government has banned purchases of established dwellings by temporary residents from ${ESTABLISHED_BAN_WINDOW}, with limited exceptions.`,
        points: [
          "New dwellings, off-the-plan and vacant land remain generally available with FIRB approval.",
          "Limited exceptions exist (for example, certain redevelopment cases) — they're narrow and fact-specific.",
          "The ban is scheduled to end on 31 March 2027 unless extended.",
        ],
        ctas: [BAN_GUIDE_CTA, FIND_LAWYER_CTA, ELIGIBLE_LISTINGS_CTA],
      };
    }
    return {
      verdict: "generally_approved",
      title: "FIRB approval is required — and generally granted for this property type",
      summary:
        "Temporary residents generally need FIRB approval, and applications for new dwellings, off-the-plan purchases and vacant land are generally approved with standard conditions.",
      points: [
        "Approval is per-property (or via a developer's exemption certificate for some new builds).",
        "Vacant land approvals carry a condition to build within 4 years.",
        "Application fees apply and scale with the property value.",
      ],
      ctas: [APPLICATION_GUIDE_CTA, ELIGIBLE_LISTINGS_CTA, FIND_LAWYER_CTA],
    };
  }

  // Non-residents.
  if (property === "established") {
    return {
      verdict: "not_approved",
      title: "Applications for established homes are generally not approved",
      summary:
        "Under the published rules, foreign non-residents cannot buy established residential dwellings — applications of this kind are generally not approved.",
      points: [
        "New dwellings, off-the-plan and vacant land for development remain the available routes.",
        "Buying land with an existing dwelling is generally only possible with a genuine demolish-and-rebuild plan.",
        "If your visa status changes, the position changes with it.",
      ],
      ctas: [ELIGIBLE_LISTINGS_CTA, BAN_GUIDE_CTA, FIND_LAWYER_CTA],
    };
  }
  return {
    verdict: "generally_approved",
    title: "FIRB approval is required — and generally granted for this property type",
    summary:
      "Non-residents generally need FIRB approval, and applications for new dwellings, off-the-plan purchases and vacant development land are generally approved with standard conditions.",
    points: [
      "Approval is per-property; fees scale with the property value.",
      "Vacant land approvals carry a condition to build within 4 years.",
      "State foreign-buyer stamp duty surcharges (typically 7–8%) apply on top of FIRB fees.",
    ],
    ctas: [APPLICATION_GUIDE_CTA, ELIGIBLE_LISTINGS_CTA, FIND_LAWYER_CTA],
  };
}
