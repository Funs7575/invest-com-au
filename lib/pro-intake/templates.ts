/**
 * Curated intake question templates per team_category / professional_type.
 *
 * Each template is a 4–5 question pack a pro can clone in one click. The
 * questions are crafted around the kind of context the pro actually needs
 * for that vertical's first call (SMSF property → fund balance, age,
 * property type; tax → residency, situation, target).
 *
 * Used by:
 *   - app/teams/[slug]/settings/intake/page.tsx → "Quick-start templates"
 *   - app/pros/settings/intake/page.tsx → same picker
 */

import type { IntakeQuestionKind } from "@/lib/pro-intake";

export interface IntakeTemplateQuestion {
  prompt: string;
  kind: IntakeQuestionKind;
  required: boolean;
  options?: string[];
}

export interface IntakeTemplate {
  /** Match against team_category / professional.type for surfacing. */
  match: string[];
  slug: string;
  title: string;
  blurb: string;
  questions: IntakeTemplateQuestion[];
}

export const INTAKE_TEMPLATES: IntakeTemplate[] = [
  {
    match: ["smsf_property", "smsf_strategy", "smsf_accounting", "smsf_accountant"],
    slug: "smsf_property_starter",
    title: "SMSF Property Squad — first-call pack",
    blurb:
      "Five questions that surface fund context before the call so trustees don't have to re-explain.",
    questions: [
      {
        prompt: "Approximate current SMSF fund balance?",
        kind: "select",
        required: true,
        options: [
          "Under $250k",
          "$250k – $500k",
          "$500k – $1M",
          "$1M – $2M",
          "$2M+",
        ],
      },
      {
        prompt: "What are you trying to buy?",
        kind: "select",
        required: true,
        options: [
          "Residential investment property",
          "Commercial property",
          "Off-the-plan",
          "Refinance an existing SMSF property",
          "Just exploring",
        ],
      },
      {
        prompt: "Trustee structure?",
        kind: "select",
        required: true,
        options: [
          "Individual trustees",
          "Corporate trustee",
          "Not sure",
        ],
      },
      {
        prompt: "Have you already engaged an SMSF accountant?",
        kind: "select",
        required: false,
        options: ["Yes", "No", "Considering"],
      },
      {
        prompt: "Anything else we should know before the call?",
        kind: "text",
        required: false,
      },
    ],
  },
  {
    match: ["cross_border_tax", "tax_agent", "foreign_investor"],
    slug: "cross_border_tax_starter",
    title: "Cross-Border Tax — first-call pack",
    blurb:
      "Quick scoping of residency + jurisdictions so the first call goes straight to substance.",
    questions: [
      {
        prompt: "Current tax residency?",
        kind: "select",
        required: true,
        options: [
          "Australian resident",
          "Australian expat overseas",
          "Foreign resident with AU assets",
          "Dual citizen / dual taxpayer",
          "Not sure",
        ],
      },
      {
        prompt: "Other jurisdictions involved?",
        kind: "text",
        required: false,
      },
      {
        prompt: "What's the trigger event?",
        kind: "select",
        required: true,
        options: [
          "Moving to Australia",
          "Moving overseas",
          "Buying / selling AU property",
          "Inheritance or trust distribution",
          "Annual return only",
          "Other",
        ],
      },
      {
        prompt: "Timeline?",
        kind: "select",
        required: true,
        options: ["This month", "Next 3 months", "This financial year", "Just researching"],
      },
      {
        prompt: "Have you used a tax agent in the last 2 years?",
        kind: "select",
        required: false,
        options: ["Yes", "No"],
      },
    ],
  },
  {
    match: ["expat_returnee", "financial_planner", "financial_adviser"],
    slug: "expat_return_starter",
    title: "Expat Return Planning — first-call pack",
    blurb:
      "Snapshot of the move so the planner walks in with the structure already in mind.",
    questions: [
      {
        prompt: "When are you returning to Australia?",
        kind: "select",
        required: true,
        options: [
          "Already returned (last 6 months)",
          "Returning in 1–3 months",
          "Returning in 3–12 months",
          "Returning 12+ months from now",
        ],
      },
      {
        prompt: "Approximate liquid wealth coming back?",
        kind: "select",
        required: true,
        options: [
          "Under A$250k",
          "A$250k – A$1M",
          "A$1M – A$5M",
          "A$5M+",
          "Prefer not to say",
        ],
      },
      {
        prompt: "Foreign super / pension to transfer?",
        kind: "select",
        required: false,
        options: ["Yes (UK)", "Yes (US 401k/IRA)", "Yes (other)", "No"],
      },
      {
        prompt: "AU property situation?",
        kind: "select",
        required: false,
        options: [
          "Own AU property",
          "Want to buy AU property on return",
          "Renting only",
          "Not sure yet",
        ],
      },
      {
        prompt: "Anything time-sensitive we should plan around?",
        kind: "text",
        required: false,
      },
    ],
  },
  {
    match: ["commercial_property", "due_diligence", "buyers_agent", "property_advisor"],
    slug: "commercial_dd_starter",
    title: "Commercial Property DD — first-call pack",
    blurb:
      "Five questions that scope a deal so the call doesn't burn time on logistics.",
    questions: [
      {
        prompt: "Deal stage?",
        kind: "select",
        required: true,
        options: [
          "Researching the market",
          "Have a shortlist",
          "Under offer / due diligence",
          "Already exchanged",
        ],
      },
      {
        prompt: "Deal type?",
        kind: "select",
        required: true,
        options: [
          "Retail strip",
          "Office",
          "Industrial / warehouse",
          "Mixed-use",
          "Other",
        ],
      },
      {
        prompt: "Budget band (asset price)?",
        kind: "select",
        required: true,
        options: [
          "Under $1M",
          "$1M – $3M",
          "$3M – $10M",
          "$10M+",
        ],
      },
      {
        prompt: "Buying entity?",
        kind: "select",
        required: false,
        options: [
          "Individual",
          "Company",
          "SMSF",
          "Family trust",
          "Other",
        ],
      },
      {
        prompt: "Anything specific you want us to focus on first?",
        kind: "text",
        required: false,
      },
    ],
  },
  {
    match: ["business_acquisition"],
    slug: "sme_acquisition_starter",
    title: "SME Acquisition — first-call pack",
    blurb:
      "Buyer-readiness check before we book a structured deal discussion.",
    questions: [
      {
        prompt: "Stage you're at?",
        kind: "select",
        required: true,
        options: [
          "Just exploring SME ownership",
          "Have a shortlist of businesses",
          "In active discussions with a vendor",
          "Already under LOI / heads of agreement",
        ],
      },
      {
        prompt: "Deal-size band?",
        kind: "select",
        required: true,
        options: [
          "Under $500k",
          "$500k – $2M",
          "$2M – $10M",
          "$10M+",
        ],
      },
      {
        prompt: "Funding source?",
        kind: "select",
        required: false,
        options: [
          "Personal cash",
          "Bank finance",
          "Vendor finance",
          "Investor / partner",
          "Mix of the above",
          "Not sure yet",
        ],
      },
      {
        prompt: "Operating experience in the target industry?",
        kind: "select",
        required: false,
        options: [
          "Direct (5+ years)",
          "Adjacent (some)",
          "None — first-time owner",
        ],
      },
      {
        prompt: "Anything specific about this deal you want us to look at first?",
        kind: "text",
        required: false,
      },
    ],
  },
];

/**
 * Pick the templates most relevant to the given owner. Returns an array
 * ordered by match-specificity (exact match first, generic last). Always
 * returns at least one template (the first one) as a fallback.
 */
export function getTemplatesForCategory(
  category: string | null | undefined,
): IntakeTemplate[] {
  if (!category) return INTAKE_TEMPLATES;
  const c = category.toLowerCase();
  const matched = INTAKE_TEMPLATES.filter((t) =>
    t.match.some((m) => m.toLowerCase() === c),
  );
  if (matched.length > 0) {
    return [
      ...matched,
      ...INTAKE_TEMPLATES.filter((t) => !matched.includes(t)),
    ];
  }
  return INTAKE_TEMPLATES;
}
