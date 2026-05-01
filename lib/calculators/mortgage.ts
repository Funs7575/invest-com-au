/**
 * Mortgage repayment + stress-test math — pure functions.
 *
 * Mirrors the math the on-page mortgage calculator at
 * `/mortgage-calculator`
 * (`app/mortgage-calculator/MortgageCalculatorClient.tsx`) runs
 * inline:
 *   - Principal & Interest monthly repayment via the standard
 *     amortisation formula `P * [r(1+r)^n] / [(1+r)^n - 1]`.
 *   - Interest-Only monthly repayment as `P * r` (no principal
 *     component).
 *   - Rate-shift "stress test" scenarios: re-run the same
 *     formula at the user's rate ± an offset (the BB-06 Definition
 *     of Done specifies +1/+2/+3 percentage points; the on-page
 *     calc currently surfaces ±0.5/1.0/1.5 — both are thin
 *     wrappers on the same primitive).
 *
 * Why this lives in lib/ separately from the component
 * ----------------------------------------------------
 * The W-NEW-01 regulator-reference test pattern needs a pure
 * function to call. Extracting the math into typed exports lets
 * `__tests__/calculators/mortgage-regulator-reference.test.ts`
 * pin the calculator to ASIC's published worked examples (and
 * the universally-published amortisation formula) without
 * touching the component (Tier B: additive only).
 *
 * Future BB-06 work can swap the component to import these
 * functions so the on-page calc and the regulator-reference
 * test share a single source of truth. Until then, keep these
 * two implementations behaviourally identical.
 *
 * Scope discipline
 * ----------------
 * This file is intentionally narrow:
 *   - Closed-form monthly repayment (P&I and IO).
 *   - Total paid + total interest derived from monthly × term.
 *   - Per-scenario stress test (rate shift in percentage points).
 *
 * It does NOT model offset accounts, comparison rates, fees, LMI,
 * extra repayments, redraw, or amortisation schedules at the
 * monthly grain (the on-page calc builds a year-by-year schedule
 * inline; that's a richer surface that BB-06's full DoD will
 * land separately).
 *
 * References
 * ----------
 *   ASIC MoneySmart "Mortgage calculator":
 *     https://moneysmart.gov.au/home-loans/mortgage-calculator
 *   ASIC MoneySmart "Interest-only mortgage calculator":
 *     https://moneysmart.gov.au/home-loans/interest-only-mortgage-calculator
 *   APRA APG 223 (serviceability assessment buffer — informs
 *     the +3% stress-test scenario in BB-06's DoD):
 *     https://www.apra.gov.au/sites/default/files/apg_223_residential_mortgage_lending.pdf
 */

/**
 * APRA's prudential serviceability buffer: lenders must assess a
 * borrower's capacity at a rate at least 3 percentage points above
 * the contracted rate. Used as the canonical "+3pp" stress-test
 * shock in BB-06's DoD.
 *
 * Source: APRA APG 223 (October 2021 update; current as at
 * 2026-05-01) — reaffirmed at the 3pp level since the November
 * 2021 increase from 2.5pp.
 */
export const APRA_SERVICEABILITY_BUFFER_PP = 3;

/**
 * Repayment type — drives whether the formula amortises principal
 * or just services interest. Mirrors the toggle in
 * `MortgageCalculatorClient`.
 */
export type RepaymentType = "pi" | "io";

export interface MortgageInput {
  /**
   * Principal balance in AUD. Must be ≥ 0; zero is a degenerate
   * but mathematically valid input (returns zero repayments).
   */
  principal: number;
  /**
   * Annual interest rate as a percentage (e.g. `6` for 6.00% p.a.,
   * NOT `0.06`). Matches the on-page calc's input unit.
   */
  annualRatePct: number;
  /**
   * Loan term in whole years. Must be > 0 for P&I; ignored for IO
   * (interest-only repayments don't depend on term — they're just
   * `P * monthly_rate` per period).
   */
  termYears: number;
  /** Repayment type. Defaults to `"pi"` (principal & interest). */
  type?: RepaymentType;
}

export interface MortgageResult {
  /** Echo of `principal`. */
  principal: number;
  /** Echo of `annualRatePct`. */
  annualRatePct: number;
  /** Echo of `termYears`. */
  termYears: number;
  /** Effective repayment type used. */
  type: RepaymentType;
  /**
   * Monthly repayment in AUD. For P&I: from amortisation formula.
   * For IO: `principal × monthly_rate`.
   */
  monthlyRepayment: number;
  /**
   * Total of all monthly repayments over the full term
   * (`monthly × term × 12`). For P&I this includes principal +
   * interest. For IO this is interest only — the principal is
   * still owed at the end of the term.
   */
  totalRepaid: number;
  /**
   * Total interest paid over the term.
   *   - P&I: `totalRepaid − principal`.
   *   - IO:  equals `totalRepaid` (every payment is interest).
   */
  totalInterest: number;
  /**
   * Total cost of the loan (interest + principal). For P&I this
   * equals `totalRepaid`. For IO this is `totalRepaid + principal`
   * because the principal is still owed at the end.
   */
  totalCost: number;
}

/**
 * Standard P&I monthly repayment formula:
 *   M = P × [r(1+r)^n] / [(1+r)^n − 1]
 * where r = monthly rate (annual / 12) and n = term in months.
 *
 * If the rate is zero, M reduces to `P / n` (straight-line
 * principal repayment with no interest). That branch is the same
 * one the on-page calc takes — kept here so the lib helper
 * matches a 0% test row exactly.
 *
 * Mirrors `MortgageCalculatorClient.tsx` lines 22-27.
 */
export function piMonthlyRepayment(
  principal: number,
  annualRatePct: number,
  termYears: number,
): number {
  const p = Math.max(0, principal);
  const n = Math.max(0, termYears) * 12;
  if (n === 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return p / n;
  const factor = Math.pow(1 + r, n);
  return (p * (r * factor)) / (factor - 1);
}

/**
 * Interest-only monthly repayment: `P × monthly_rate`. The
 * principal balance is unchanged at the end of the IO period —
 * the borrower owes the full `principal` plus the `totalRepaid`
 * already serviced.
 *
 * Mirrors `MortgageCalculatorClient.tsx` lines 30-32.
 */
export function ioMonthlyRepayment(
  principal: number,
  annualRatePct: number,
): number {
  return Math.max(0, principal) * (annualRatePct / 100 / 12);
}

/**
 * Compute the headline mortgage numbers (monthly + total
 * interest + total cost) for a single scenario. Pure function;
 * no I/O, no state.
 *
 * Mirrors `MortgageCalculatorClient.tsx` lines 52-60 (`monthly`
 * memo + `totalPaid` / `totalInterest` / `totalCost` derivations).
 */
export function computeMortgage(input: MortgageInput): MortgageResult {
  const type: RepaymentType = input.type ?? "pi";
  const principal = Math.max(0, input.principal);
  const annualRatePct = Math.max(0, input.annualRatePct);
  const termYears = Math.max(0, input.termYears);

  const monthly =
    type === "pi"
      ? piMonthlyRepayment(principal, annualRatePct, termYears)
      : ioMonthlyRepayment(principal, annualRatePct);

  const totalMonths = termYears * 12;
  const totalRepaid = monthly * totalMonths;
  const totalInterest = type === "pi" ? totalRepaid - principal : totalRepaid;
  const totalCost = type === "pi" ? totalRepaid : totalRepaid + principal;

  return {
    principal,
    annualRatePct,
    termYears,
    type,
    monthlyRepayment: monthly,
    totalRepaid,
    totalInterest,
    totalCost,
  };
}

export interface RateShiftScenario {
  /**
   * Rate offset in percentage points (e.g. `1` = +1pp shock,
   * `-0.5` = a 50bp cut). Matches the unit the on-page calc
   * surfaces in its rate-comparison table.
   */
  offsetPp: number;
  /** Effective rate at this scenario (`base + offsetPp`, floored at 0%). */
  effectiveRatePct: number;
  /** Monthly repayment at the shifted rate. */
  monthlyRepayment: number;
  /** Difference in monthly repayment vs the base scenario. */
  monthlyDelta: number;
  /** Total interest paid over the term at the shifted rate. */
  totalInterest: number;
}

/**
 * Re-run the mortgage math at a list of rate offsets (in
 * percentage points) and report the per-scenario monthly
 * repayment + total interest + delta vs the base.
 *
 * BB-06's DoD asks for +1/+2/+3pp stress scenarios; pass
 * `[0, 1, 2, 3]` to surface the base + the three APRA-buffer
 * shocks. The on-page calc currently passes `[-1.5, -1.0, -0.5,
 * 0, 0.5, 1.0, 1.5]` — both are thin wrappers on this primitive.
 *
 * The base scenario (offset = 0) IS included in the output so
 * each row is self-contained; callers can filter it out if
 * presenting only shocks.
 */
export function buildStressScenarios(
  base: MortgageInput,
  offsetsPp: ReadonlyArray<number>,
): ReadonlyArray<RateShiftScenario> {
  const baseResult = computeMortgage(base);
  return offsetsPp.map((offsetPp) => {
    // Match on-page calc behaviour: floor effective rate at 0.1%
    // when shocked downward to avoid the zero-rate branch
    // distorting the comparison. (See `MortgageCalculatorClient`
    // lines 65-72.)
    const effectiveRatePct = Math.max(0.1, base.annualRatePct + offsetPp);
    const scenarioResult = computeMortgage({
      ...base,
      annualRatePct: effectiveRatePct,
    });
    return {
      offsetPp,
      effectiveRatePct,
      monthlyRepayment: scenarioResult.monthlyRepayment,
      monthlyDelta:
        scenarioResult.monthlyRepayment - baseResult.monthlyRepayment,
      totalInterest: scenarioResult.totalInterest,
    };
  });
}
