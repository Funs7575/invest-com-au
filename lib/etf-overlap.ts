/**
 * ETF overlap analysis — pure functions (PR 8.1).
 *
 * Computes constituent overlap between two ETFs using their top holdings.
 * Useful for identifying unintentional concentration risk when holding
 * multiple ETFs (e.g. VGS + NDQ both heavily weighted toward US mega-cap tech).
 *
 * General information only — not personal financial advice.
 * No DB calls. Fully unit-testable.
 */

export interface EtfHolding {
  ticker: string;
  securityName: string;
  weightBps: number; // basis points; 100 = 1%
}

export interface OverlappingHolding {
  ticker: string;
  securityName: string;
  /** Weight in ETF A, in basis points. */
  weightABps: number;
  /** Weight in ETF B, in basis points. */
  weightBBps: number;
  /** Average weight across both ETFs, in basis points. */
  avgWeightBps: number;
}

export interface OverlapResult {
  /** Sum of min(weightA, weightB) for each shared ticker, in basis points. */
  overlapBps: number;
  /** Overlap as a percentage of the seeded portion (≤ 100). */
  overlapPct: number;
  /** Overlapping holdings sorted by average weight descending. */
  overlappingHoldings: OverlappingHolding[];
  /** Total weight covered by the seeded data for ETF A (may be < 10000). */
  coveredWeightABps: number;
  /** Total weight covered by the seeded data for ETF B (may be < 10000). */
  coveredWeightBBps: number;
}

/**
 * Compute the overlap between two sets of ETF holdings.
 *
 * The overlap metric is: sum of min(wA, wB) for each ticker present in both.
 * This represents how much of each dollar invested in ETF A is duplicated in
 * ETF B on a ticker-by-ticker basis, normalised to the seeded data coverage.
 */
export function computeOverlap(holdingsA: EtfHolding[], holdingsB: EtfHolding[]): OverlapResult {
  const mapB = new Map<string, EtfHolding>();
  for (const h of holdingsB) mapB.set(h.ticker, h);

  const overlapping: OverlappingHolding[] = [];
  let overlapBps = 0;

  for (const hA of holdingsA) {
    const hB = mapB.get(hA.ticker);
    if (!hB) continue;
    const minWeight = Math.min(hA.weightBps, hB.weightBps);
    overlapBps += minWeight;
    overlapping.push({
      ticker: hA.ticker,
      securityName: hA.securityName,
      weightABps: hA.weightBps,
      weightBBps: hB.weightBps,
      avgWeightBps: Math.round((hA.weightBps + hB.weightBps) / 2),
    });
  }

  overlapping.sort((a, b) => b.avgWeightBps - a.avgWeightBps);

  const coveredWeightABps = holdingsA.reduce((s, h) => s + h.weightBps, 0);
  const coveredWeightBBps = holdingsB.reduce((s, h) => s + h.weightBps, 0);

  // Normalise to the smaller covered weight so result is meaningful even when
  // one fund's seeded data covers less of its total portfolio.
  const normBase = Math.min(coveredWeightABps, coveredWeightBBps);
  const overlapPct = normBase > 0 ? Math.min(100, Math.round((overlapBps / normBase) * 100)) : 0;

  return { overlapBps, overlapPct, overlappingHoldings: overlapping, coveredWeightABps, coveredWeightBBps };
}

/** Format basis points as a percentage string, e.g. 850 → "8.5%" */
export function formatWeight(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}
