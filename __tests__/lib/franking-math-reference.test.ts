/**
 * ATO regulator-reference test for the franking-credit calculator.
 *
 * This file is the proof-of-concept for the
 * `assertCalculatorMatchesRegulator` pattern. It pins our
 * franking-credit math to the ATO's published worked examples so
 * that any future drift between our calculator and ATO guidance
 * surfaces as a test failure with the source URL + accessedAt date
 * embedded in the message.
 *
 * Reference math (canonical ATO formula, published in many places
 * including the "You and your shares" guide and the franking
 * tax-return guidance):
 *
 *     grossed_up_dividend  = cash_dividend / (1 - corporate_tax_rate)
 *     franking_credit      = grossed_up_dividend - cash_dividend
 *                          = cash_dividend * corp / (1 - corp)
 *     tax_payable          = grossed_up_dividend * marginal_rate
 *     net_after_tax        = grossed_up_dividend - tax_payable
 *     excess_credits       = franking_credit - tax_payable     (>0 = refund)
 *
 * The corporate tax rate the ATO uses for the standard example is
 * 30% (the rate for non-base-rate-entities), so cash dividend $700
 * fully franked yields a $300 franking credit and a $1,000
 * grossed-up taxable amount.
 *
 * If the ATO updates a worked example (rate change, threshold
 * change, new offset), the test fails loudly with the URL and
 * accessedAt date in the message — the maintainer should re-pull
 * the published numbers and update the case.
 *
 * See `docs/runbooks/calculator-reference-tests.md` for how to add
 * more cases.
 */

import { describe, it } from "vitest";
import { computeFranking, type FrankingResult } from "@/lib/franking-math";
import {
  assertCalculatorMatchesRegulator,
  type RegulatorReferenceCase,
} from "./calculator-reference";

/**
 * Wrapper that takes only the fields published in regulator worked
 * examples — anything not pinned by the ATO is left for the helper
 * to ignore (extra keys in the calculator output are fine).
 */
type RefOutput = Pick<
  FrankingResult,
  "frankingCredit" | "grossedUp" | "taxPayable" | "netAfterTax" | "excessCredits"
>;

const ATO_FRANKING_URL =
  "https://www.ato.gov.au/individuals-and-families/investments-and-assets/investing-in-shares/dividends/you-and-your-shares";

const ATO_REFUND_URL =
  "https://www.ato.gov.au/individuals-and-families/investments-and-assets/investing-in-shares/dividends/refund-of-franking-credits";

const ACCESSED_AT = "2026-04-30";

const REFERENCE_CASES: ReadonlyArray<
  RegulatorReferenceCase<Parameters<typeof computeFranking>[0], RefOutput>
> = [
  // -----------------------------------------------------------------
  // Case 1 — The ATO's canonical example
  //
  // "A company earns $1,000 of profit. It pays $300 corporate tax
  //  (30%) leaving $700 to distribute as a fully franked dividend.
  //  The shareholder receives $700 cash and a $300 franking credit;
  //  $1,000 is included as assessable income."
  //
  // We assert the math at all five published checkpoints. The
  // shareholder pays tax at the corporate rate (30%) so net after
  // tax exactly equals the cash dividend — break-even, no top-up,
  // no refund.
  // -----------------------------------------------------------------
  {
    name: "ATO canonical example — $700 fully franked, 30% marginal",
    regulator: "ATO",
    regulatorUrl: ATO_FRANKING_URL,
    citation:
      'Section "How dividends are taxed" — fully franked $700 dividend ' +
      "with $300 attached franking credit at the 30% corporate rate",
    accessedAt: ACCESSED_AT,
    inputs: {
      dividend: 700,
      frankingPct: 100,
      marginalRate: 0.30,
      includeMedicare: false,
    },
    expectedOutput: {
      // Cash dividend × corp / (1 - corp) = 700 × 0.30 / 0.70 = 300
      frankingCredit: 300,
      // 700 + 300
      grossedUp: 1000,
      // 1000 × 30%
      taxPayable: 300,
      // grossedUp - taxPayable
      netAfterTax: 700,
      // frankingCredit - taxPayable
      excessCredits: 0,
    },
    // ATO publishes whole-dollar amounts in this example. Allow up
    // to 1 cent of floating-point slop, but no more — drift bigger
    // than that is a real bug.
    tolerance: { absolute: 0.01 },
  },

  // -----------------------------------------------------------------
  // Case 2 — Refund of franking credits, 0% marginal investor
  //
  // ATO "Refund of franking credits" guidance: a low/no-income
  // investor (retiree below the tax-free threshold, SMSF in pension
  // phase, etc.) who receives a fully franked dividend has zero
  // tax payable on the grossed-up amount and gets the full $300
  // franking credit refunded as cash.
  // -----------------------------------------------------------------
  {
    name: "Refund example — $700 fully franked, 0% marginal (pension phase)",
    regulator: "ATO",
    regulatorUrl: ATO_REFUND_URL,
    citation:
      'Section "Who can claim a refund" — a non-taxable investor ' +
      "receives the full franking credit as a cash refund",
    accessedAt: ACCESSED_AT,
    inputs: {
      dividend: 700,
      frankingPct: 100,
      marginalRate: 0,
      includeMedicare: false,
    },
    expectedOutput: {
      frankingCredit: 300,
      grossedUp: 1000,
      taxPayable: 0,
      // No tax payable, so the investor keeps the entire grossed-up
      // amount: $700 cash + $300 refund = $1,000.
      netAfterTax: 1000,
      // Full franking credit is refundable.
      excessCredits: 300,
    },
    tolerance: { absolute: 0.01 },
  },

  // -----------------------------------------------------------------
  // Case 3 — High-marginal-rate top-up
  //
  // ATO "How dividends are taxed" example for a 45% marginal investor
  // receiving the same $700 fully franked dividend. Tax at 45% on
  // $1,000 grossed-up = $450; franking credit offsets $300; net
  // top-up payable = $150. Net cash after tax = $700 − $150 = $550.
  // -----------------------------------------------------------------
  {
    name: "Top-up example — $700 fully franked, 45% marginal",
    regulator: "ATO",
    regulatorUrl: ATO_FRANKING_URL,
    citation:
      'Section "Effect of marginal tax rate" — top-marginal-rate ' +
      "investor pays the top-up tax above the corporate rate",
    accessedAt: ACCESSED_AT,
    inputs: {
      dividend: 700,
      frankingPct: 100,
      marginalRate: 0.45,
      includeMedicare: false,
    },
    expectedOutput: {
      frankingCredit: 300,
      grossedUp: 1000,
      // 1000 × 45%
      taxPayable: 450,
      // 1000 − 450
      netAfterTax: 550,
      // 300 − 450 → owe $150 net (negative excess = top-up payable)
      excessCredits: -150,
    },
    tolerance: { absolute: 0.01 },
  },
];

describe("franking-math reproduces ATO worked examples", () => {
  it("matches all reference cases within published tolerance", () => {
    assertCalculatorMatchesRegulator(
      (input) => {
        const r = computeFranking(input);
        // Project to the fields the ATO pins; the helper ignores
        // extra keys, so passing the full result also works — the
        // explicit projection just keeps failure messages tight.
        return {
          frankingCredit: r.frankingCredit,
          grossedUp: r.grossedUp,
          taxPayable: r.taxPayable,
          netAfterTax: r.netAfterTax,
          excessCredits: r.excessCredits,
        };
      },
      REFERENCE_CASES,
    );
  });
});
