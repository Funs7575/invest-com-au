"use client";

import HubLeadForm from "@/components/leads/HubLeadForm";

/**
 * Lead-capture box rendered beneath every calculator's results section
 * (W1.2). Converts the post-result intent moment into a free advisor
 * review.
 *
 * Mounted by each calculator's client component (CgtClient, MortgageCalculatorClient,
 * etc). The lead lands in the standard advisor matching pipeline via
 * /api/submit-lead with intent.need mapped to one of /find-advisor's
 * NEED_TO_INTENT keys, so the routing engine treats it like any other
 * advisor lead. source_page is tagged `/calculator-leadbox|calc=<slug>`
 * so attribution can isolate calculator-driven leads in analytics.
 */

export type CalculatorLeadNeed =
  | "mortgage"
  | "buyers"
  | "insurance"
  | "planning"
  | "tax"
  | "wealth"
  | "smsf"
  | "estate"
  | "agedcare"
  | "property"
  | "crypto";

export interface CalculatorLeadCaptureProps {
  /** URL slug of the calculator, e.g. "cgt-calculator". Used in source_page. */
  calcSlug: string;
  /** Human-readable calculator name used in the subheading copy. */
  calcTitle: string;
  /** Specialist category — maps to /find-advisor's NEED_TO_INTENT. */
  need: CalculatorLeadNeed;
  /** Free-form context tags appended to the lead's intent.context array. */
  contextKeys?: string[];
}

export default function CalculatorLeadCapture({
  calcSlug,
  calcTitle,
  need,
  contextKeys,
}: CalculatorLeadCaptureProps) {
  return (
    <div className="mt-6 md:mt-8" data-testid="calculator-lead-capture">
      <HubLeadForm
        heading="Save these results — get a free 15-minute review"
        subheading={`A specialist will look at your ${calcTitle} numbers and explain what they mean for your situation. No cost, no obligation.`}
        intent={{
          need,
          ...(contextKeys && contextKeys.length > 0 ? { context: contextKeys } : {}),
        }}
        source={`/calculator-leadbox|calc=${calcSlug}`}
        ctaLabel="Get my free review"
      />
    </div>
  );
}
