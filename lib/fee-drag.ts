/**
 * Fee-drag mathematics + the programmatic scenario grid behind
 * /super/fee-drag. Pure functions, no data files — every page is fully
 * static and indexable from day one (mega-session #5; unlike the
 * registry datasets there is nothing to ingest).
 *
 * Model: lump-sum compounding of a starting balance at a gross return
 * less an annual fee, no contributions, nominal dollars. Deliberately
 * the simplest defensible model — the pages exist to show the *gap*
 * between two fee levels, and contributions/inflation shift both sides
 * similarly. Assumptions are surfaced verbatim on every page.
 */

export const DEFAULT_GROSS_RETURN_PCT = 7;
export const PROJECTION_YEARS = [10, 20, 30] as const;

export interface FeeDragScenario {
  slug: string;
  balance: number;
  /** e.g. "100k" — for headlines. */
  balanceLabel: string;
  lowFeePct: number;
  highFeePct: number;
}

export interface FeeDragOutcome {
  years: number;
  endAtLowFee: number;
  endAtHighFee: number;
  drag: number;
  /** Drag as % of the low-fee end balance. */
  dragPct: number;
}

const BALANCES: { balance: number; label: string }[] = [
  { balance: 25_000, label: "25k" },
  { balance: 50_000, label: "50k" },
  { balance: 100_000, label: "100k" },
  { balance: 250_000, label: "250k" },
  { balance: 500_000, label: "500k" },
  { balance: 1_000_000, label: "1m" },
];

const FEE_PAIRS: [number, number][] = [
  [0.5, 1.0],
  [0.5, 1.5],
  [1.0, 1.5],
  [1.0, 2.0],
];

function feeToken(pct: number): string {
  return String(pct).replace(".", "-");
}

export function compound(balance: number, grossReturnPct: number, feePct: number, years: number): number {
  const net = 1 + (grossReturnPct - feePct) / 100;
  return balance * Math.pow(net, years);
}

export function feeDragOutcomes(
  balance: number,
  lowFeePct: number,
  highFeePct: number,
  grossReturnPct: number = DEFAULT_GROSS_RETURN_PCT,
): FeeDragOutcome[] {
  return PROJECTION_YEARS.map((years) => {
    const endAtLowFee = compound(balance, grossReturnPct, lowFeePct, years);
    const endAtHighFee = compound(balance, grossReturnPct, highFeePct, years);
    const drag = endAtLowFee - endAtHighFee;
    return {
      years,
      endAtLowFee,
      endAtHighFee,
      drag,
      dragPct: (drag / endAtLowFee) * 100,
    };
  });
}

export const FEE_DRAG_SCENARIOS: FeeDragScenario[] = BALANCES.flatMap(({ balance, label }) =>
  FEE_PAIRS.map(([low, high]) => ({
    slug: `${label}-fee-${feeToken(low)}-vs-${feeToken(high)}`,
    balance,
    balanceLabel: label,
    lowFeePct: low,
    highFeePct: high,
  })),
);

const scenarioIndex = new Map(FEE_DRAG_SCENARIOS.map((s) => [s.slug, s]));

export function feeDragScenario(slug: string): FeeDragScenario | null {
  return scenarioIndex.get(slug) ?? null;
}

/** Same balance, other fee pairs + same fee pair, neighbouring balances. */
export function relatedScenarios(scenario: FeeDragScenario, limit = 6): FeeDragScenario[] {
  const sameBalance = FEE_DRAG_SCENARIOS.filter(
    (s) => s.balance === scenario.balance && s.slug !== scenario.slug,
  );
  const sameFees = FEE_DRAG_SCENARIOS.filter(
    (s) =>
      s.lowFeePct === scenario.lowFeePct &&
      s.highFeePct === scenario.highFeePct &&
      s.slug !== scenario.slug,
  ).sort((a, b) => Math.abs(a.balance - scenario.balance) - Math.abs(b.balance - scenario.balance));
  const merged: FeeDragScenario[] = [];
  for (const s of [...sameBalance, ...sameFees]) {
    if (!merged.some((m) => m.slug === s.slug)) merged.push(s);
    if (merged.length >= limit) break;
  }
  return merged;
}

export function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}
