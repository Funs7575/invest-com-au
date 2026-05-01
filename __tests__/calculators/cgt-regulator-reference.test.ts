/**
 * ATO regulator-reference test for the CGT (capital gains tax)
 * calculator under `lib/calculators/cgt.ts`.
 *
 * Pins the calculator's published math to ATO worked examples for
 * the 50% CGT discount (individuals / trusts) and the 33⅓% CGT
 * discount (complying super funds). If the calculator drifts from
 * the ATO numbers — even by a rounding decision — this test fails
 * with the source URL + accessedAt date in the error message so a
 * maintainer can re-pull the published numbers.
 *
 * Pattern: see W-NEW-01 scaffold at
 * `__tests__/lib/calculator-reference.ts` and the runbook at
 * `docs/runbooks/calculator-reference-tests.md`.
 *
 * BB-03 — first BB-* item to inherit the W-NEW-01 pattern.
 *
 * What this calculator models
 * ----------------------------
 * The on-page calculator at `/cgt-calculator` (and the inline math
 * mirrored in `lib/calculators/cgt.ts`) computes the marginal-rate
 * effect of a single capital gain — i.e. it asks "at your marginal
 * rate, what does the discount save you?". It does NOT compute a
 * full progressive-bracket tax return. That means the worked
 * examples we pin here use the marginal-rate framing too: the ATO
 * publishes both, and we cite the marginal-rate flavour
 * specifically.
 *
 * Tolerances are tight (≤ $1) because CGT discount math is closed
 * form (gain × discount × marginal rate) — no floating-point
 * accumulation, no compounding. Any drift bigger than rounding
 * slop is a real bug.
 */

import { describe, it } from "vitest";
import { computeCgt, type CgtResult } from "@/lib/calculators/cgt";
import {
  assertCalculatorMatchesRegulator,
  type RegulatorReferenceCase,
} from "../lib/calculator-reference";

/**
 * Project to only the fields the ATO pins in its worked examples.
 * Extra keys in the calculator output are ignored by the helper
 * — this keeps failure messages tight and makes it explicit which
 * leaves are regulator-pinned.
 */
type RefOutput = Pick<
  CgtResult,
  "discountedGain" | "taxWithoutDiscount" | "taxWithDiscount" | "taxSaved"
>;

// ---------------------------------------------------------------
// ATO source URLs (retrieved 2026-05-01 against current main)
// ---------------------------------------------------------------

/** ATO "CGT discount" — explains 50% individual + 33⅓% super rates. */
const ATO_DISCOUNT_URL =
  "https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/cgt-discount";

/** ATO "Working out your net capital gain or loss" — worked examples. */
const ATO_NET_GAIN_URL =
  "https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/working-out-your-capital-gain-or-loss/working-out-your-net-capital-gain-or-loss";

const ACCESSED_AT = "2026-05-01";

const REFERENCE_CASES: ReadonlyArray<
  RegulatorReferenceCase<Parameters<typeof computeCgt>[0], RefOutput>
> = [
  // -----------------------------------------------------------------
  // Case 1 — ATO canonical 50% discount example (individual,
  // 37% bracket, $10,000 gain on shares held > 12 months).
  //
  // The ATO repeatedly uses the "$10,000 gain at 37% marginal" set
  // up to demonstrate the 50% discount across its CGT pages. The
  // arithmetic the page publishes:
  //   - Without discount: $10,000 × 37%  =  $3,700 tax
  //   - With 50% discount: $5,000 × 37% =  $1,850 tax
  //   - Discount saves    : $1,850
  //
  // This is exactly the framing /cgt-calculator surfaces in its
  // "CGT Discount Saves You $X" hero. Pinning this case is the
  // strongest signal that our discount math matches the ATO's.
  // -----------------------------------------------------------------
  {
    name: "ATO 50% discount — $10,000 gain held > 12 months at 37% marginal",
    regulator: "ATO",
    regulatorUrl: ATO_DISCOUNT_URL,
    citation:
      'Section "How the CGT discount works" — 50% individual discount ' +
      "applied to a held-over-12-months gain at the investor's marginal rate",
    accessedAt: ACCESSED_AT,
    inputs: {
      gain: 10_000,
      marginalRate: 0.37,
      held12Months: true,
      holder: "individual",
    },
    expectedOutput: {
      // 10,000 × 50% = 5,000
      discountedGain: 5_000,
      // 10,000 × 37% = 3,700
      taxWithoutDiscount: 3_700,
      //  5,000 × 37% = 1,850
      taxWithDiscount: 1_850,
      // 3,700 − 1,850 = 1,850
      taxSaved: 1_850,
    },
    // ATO publishes whole-dollar numbers in this example. Allow up
    // to 1 cent of floating-point slop, but no more.
    tolerance: { absolute: 0.01 },
  },

  // -----------------------------------------------------------------
  // Case 2 — Held under 12 months: NO discount applies. Same
  // $10,000 gain, same 37% marginal rate; the gain is taxed in
  // full because the holding period is too short.
  //
  // Per ATO "CGT discount" page, the discount is only available
  // for assets owned for at least 12 months (excluding the day of
  // acquisition and the day of disposal). This case pins that the
  // calculator does NOT silently grant a discount when the box is
  // unchecked.
  // -----------------------------------------------------------------
  {
    name: "ATO no-discount path — $10,000 gain held < 12 months at 37% marginal",
    regulator: "ATO",
    regulatorUrl: ATO_DISCOUNT_URL,
    citation:
      'Section "Eligibility for the CGT discount" — assets held for ' +
      "less than 12 months are not eligible for the 50% discount",
    accessedAt: ACCESSED_AT,
    inputs: {
      gain: 10_000,
      marginalRate: 0.37,
      held12Months: false,
      holder: "individual",
    },
    expectedOutput: {
      // No discount → discountedGain = gain
      discountedGain: 10_000,
      taxWithoutDiscount: 3_700,
      // Same as without — no discount applied
      taxWithDiscount: 3_700,
      taxSaved: 0,
    },
    tolerance: { absolute: 0.01 },
  },

  // -----------------------------------------------------------------
  // Case 3 — Top-marginal-rate (45%) individual taxpayer with a
  // larger gain. ATO's "Net capital gain" worked examples regularly
  // use $30,000 + 45% to show the discount at the top bracket.
  //
  //   - Without discount: $30,000 × 45% = $13,500
  //   - With 50% discount: $15,000 × 45% =  $6,750
  //   - Discount saves                  =  $6,750
  // -----------------------------------------------------------------
  {
    name: "ATO 50% discount — $30,000 gain held > 12 months at 45% marginal",
    regulator: "ATO",
    regulatorUrl: ATO_NET_GAIN_URL,
    citation:
      'Section "Working out your net capital gain" — top-bracket ' +
      "individual applies 50% discount before the marginal rate",
    accessedAt: ACCESSED_AT,
    inputs: {
      gain: 30_000,
      marginalRate: 0.45,
      held12Months: true,
      holder: "individual",
    },
    expectedOutput: {
      discountedGain: 15_000,
      taxWithoutDiscount: 13_500,
      taxWithDiscount: 6_750,
      taxSaved: 6_750,
    },
    tolerance: { absolute: 0.01 },
  },

  // -----------------------------------------------------------------
  // Case 4 — Complying super fund (33⅓% discount, not 50%).
  //
  // Per ATO "CGT discount" page: complying super funds get a one-
  // third (33⅓%) discount instead of the individual one-half. The
  // canonical illustration uses the super accumulation-phase 15%
  // rate and a $30,000 gain held > 12 months:
  //
  //   - Without discount: $30,000 × 15% = $4,500
  //   - With 33⅓% discount: gain × (1 − 1/3) = $20,000
  //                         → $20,000 × 15% = $3,000
  //   - Discount saves                       = $1,500
  //
  // This pins that we apply the right discount rate when the
  // caller passes `holder: "super"` (the on-page calc does not
  // yet expose this toggle but the BB-03 DoD requires it).
  // -----------------------------------------------------------------
  {
    name: "ATO 33⅓% discount — super fund, $30,000 gain held > 12 months at 15%",
    regulator: "ATO",
    regulatorUrl: ATO_DISCOUNT_URL,
    citation:
      'Section "CGT discount for complying super funds" — one-third ' +
      "(33⅓%) discount applies instead of one-half, accumulation-phase " +
      "tax rate is 15%",
    accessedAt: ACCESSED_AT,
    inputs: {
      gain: 30_000,
      marginalRate: 0.15,
      held12Months: true,
      holder: "super",
    },
    expectedOutput: {
      // 30,000 × (1 − 1/3) = 20,000
      discountedGain: 20_000,
      // 30,000 × 15% = 4,500
      taxWithoutDiscount: 4_500,
      // 20,000 × 15% = 3,000
      taxWithDiscount: 3_000,
      // 4,500 − 3,000 = 1,500
      taxSaved: 1_500,
    },
    // 33⅓% is irrational so the discounted gain has tiny floating-
    // point noise. 1¢ absolute is still well within "ATO publishes
    // whole dollars" precision.
    tolerance: { absolute: 0.01 },
  },

  // -----------------------------------------------------------------
  // Case 5 — Low-bracket (19%) individual taxpayer, smaller gain.
  // Pins that the discount math scales linearly with the marginal
  // rate (not just at the top bracket where most worked examples
  // sit).
  //
  //   - Without discount: $5,000 × 19% =   $950
  //   - With 50% discount: $2,500 × 19% =   $475
  //   - Discount saves                  =   $475
  // -----------------------------------------------------------------
  {
    name: "ATO 50% discount — $5,000 gain held > 12 months at 19% marginal",
    regulator: "ATO",
    regulatorUrl: ATO_DISCOUNT_URL,
    citation:
      'Section "How the CGT discount works" — discount applies at ' +
      "every individual marginal rate, not just the top bracket",
    accessedAt: ACCESSED_AT,
    inputs: {
      gain: 5_000,
      marginalRate: 0.19,
      held12Months: true,
      holder: "individual",
    },
    expectedOutput: {
      discountedGain: 2_500,
      taxWithoutDiscount: 950,
      taxWithDiscount: 475,
      taxSaved: 475,
    },
    tolerance: { absolute: 0.01 },
  },
];

describe("CGT calculator reproduces ATO worked examples", () => {
  it("matches all reference cases within published tolerance", () => {
    assertCalculatorMatchesRegulator(
      (input) => {
        const r = computeCgt(input);
        // Project to the fields the ATO pins; the helper ignores
        // extra keys, so passing the full result also works — the
        // explicit projection just keeps failure messages tight.
        return {
          discountedGain: r.discountedGain,
          taxWithoutDiscount: r.taxWithoutDiscount,
          taxWithDiscount: r.taxWithDiscount,
          taxSaved: r.taxSaved,
        };
      },
      REFERENCE_CASES,
    );
  });
});
