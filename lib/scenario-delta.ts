/**
 * Scenario delta calculations — richer compare view.
 *
 * Computes per-metric absolute and percentage deltas between two
 * `ScenarioResult` objects without any "better/worse" framing.
 * Uses neutral size language: "larger" / "smaller" / "equal".
 *
 * AFSL scope
 * ----------
 * Delta labels are factual and neutral. "Larger" means numerically
 * greater; it is NOT a recommendation. Callers MUST display
 * `GENERAL_ADVICE_WARNING` from `lib/compliance.ts` alongside any
 * comparison.
 *
 * Design
 * ------
 * - Pure function; no I/O, no state.
 * - Each `DeltaRow` carries raw numbers so rendering code can apply
 *   its own formatting (currency, percentage, integer).
 * - The `sizeA` / `sizeB` indicator is always from A's perspective:
 *     "larger" means A > B; "smaller" means A < B; "equal" means equal.
 */

import { type ScenarioResult } from "@/lib/scenario-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeltaSize = "larger" | "smaller" | "equal";

export interface DeltaRow {
  /** Human-readable metric name (matches the compare table rows). */
  metric: string;
  /** Category grouping for collapsible sections. */
  category: "retirement" | "super" | "investmentTax" | "property";
  /** Raw numeric value for scenario A (before formatting). */
  valueA: number;
  /** Raw numeric value for scenario B (before formatting). */
  valueB: number;
  /** Absolute difference: valueA − valueB. Negative means A < B. */
  absoluteDelta: number;
  /**
   * Percentage delta relative to B: ((A − B) / |B|) × 100.
   * `null` when B is 0 (division by zero guard).
   */
  pctDelta: number | null;
  /**
   * Neutral size indicator from A's perspective.
   * "larger" → A numerically greater; "smaller" → A numerically less; "equal" → identical.
   */
  sizeA: DeltaSize;
  /** Format hint for the rendering layer. */
  format: "currency" | "years" | "percentage" | "boolean";
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function row(
  metric: string,
  category: DeltaRow["category"],
  valueA: number,
  valueB: number,
  format: DeltaRow["format"],
): DeltaRow {
  const absoluteDelta = valueA - valueB;
  const pctDelta = valueB !== 0 ? (absoluteDelta / Math.abs(valueB)) * 100 : null;
  const sizeA: DeltaSize =
    Math.abs(absoluteDelta) < 0.005
      ? "equal"
      : absoluteDelta > 0
        ? "larger"
        : "smaller";
  return { metric, category, valueA, valueB, absoluteDelta, pctDelta, sizeA, format };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Compute per-metric deltas between two scenario results.
 *
 * Returns an array of `DeltaRow` objects — one per key metric.
 * The list is ordered for display: retirement first, then super,
 * then investment tax, then property (if either side has one).
 *
 * Pure function. No I/O, no state.
 */
export function computeScenarioDelta(
  a: ScenarioResult,
  b: ScenarioResult,
): DeltaRow[] {
  const rows: DeltaRow[] = [
    // ── Retirement ──────────────────────────────────────────────────
    row(
      "Projected super at retirement",
      "retirement",
      a.retirement.projectedSuperAtRetirement,
      b.retirement.projectedSuperAtRetirement,
      "currency",
    ),
    row(
      "4% rule target",
      "retirement",
      a.retirement.targetBalance4PctRule,
      b.retirement.targetBalance4PctRule,
      "currency",
    ),
    row(
      "Gap to target (absolute)",
      "retirement",
      Math.abs(a.retirement.gapToTarget),
      Math.abs(b.retirement.gapToTarget),
      "currency",
    ),
    row(
      "Drawdown years",
      "retirement",
      a.retirement.drawdownYears,
      b.retirement.drawdownYears,
      "years",
    ),
    row(
      "Years to retirement",
      "retirement",
      a.retirement.yearsToRetirement,
      b.retirement.yearsToRetirement,
      "years",
    ),
    row(
      "Annual employer SG",
      "retirement",
      a.retirement.annualEmployerContrib,
      b.retirement.annualEmployerContrib,
      "currency",
    ),

    // ── Super contributions ──────────────────────────────────────────
    row(
      "Total concessional contributions p.a.",
      "super",
      a.superContributions.totalConcessional,
      b.superContributions.totalConcessional,
      "currency",
    ),
    row(
      "Super tax p.a.",
      "super",
      a.superContributions.totalSuperTax,
      b.superContributions.totalSuperTax,
      "currency",
    ),
    row(
      "Tax saving vs taking as income p.a.",
      "super",
      a.superContributions.taxSavingOnExtraContribs,
      b.superContributions.taxSavingOnExtraContribs,
      "currency",
    ),
    row(
      "Net concessional in super p.a.",
      "super",
      a.superContributions.netConcessionalInSuper,
      b.superContributions.netConcessionalInSuper,
      "currency",
    ),

    // ── Investment tax ────────────────────────────────────────────────
    row(
      "Tax on investment income p.a.",
      "investmentTax",
      a.investmentTax.taxOnInvestmentIncome,
      b.investmentTax.taxOnInvestmentIncome,
      "currency",
    ),
    row(
      "Net investment income after tax p.a.",
      "investmentTax",
      a.investmentTax.netInvestmentIncome,
      b.investmentTax.netInvestmentIncome,
      "currency",
    ),
    row(
      "Effective rate on investment income",
      "investmentTax",
      a.investmentTax.effectiveRateOnInvestmentIncome,
      b.investmentTax.effectiveRateOnInvestmentIncome,
      "percentage",
    ),
  ];

  // ── Property (include when either side has a property) ────────────
  if (a.property.hasProperty || b.property.hasProperty) {
    rows.push(
      row(
        "Projected property value at retirement",
        "property",
        a.property.projectedPropertyValue,
        b.property.projectedPropertyValue,
        "currency",
      ),
      row(
        "Gross capital gain on sale",
        "property",
        a.property.grossGain,
        b.property.grossGain,
        "currency",
      ),
      row(
        "CGT payable (with discount)",
        "property",
        a.property.cgt.taxWithDiscount,
        b.property.cgt.taxWithDiscount,
        "currency",
      ),
      row(
        "Net equity after estimated CGT",
        "property",
        a.property.netEquityAfterCgt,
        b.property.netEquityAfterCgt,
        "currency",
      ),
      row(
        "Estimated annual rental income",
        "property",
        a.property.estimatedAnnualRentalIncome,
        b.property.estimatedAnnualRentalIncome,
        "currency",
      ),
      row(
        "Estimated annual holding costs",
        "property",
        a.property.estimatedAnnualHoldingCosts,
        b.property.estimatedAnnualHoldingCosts,
        "currency",
      ),
    );
  }

  return rows;
}
