/**
 * Portfolio health score (PR-X5d).
 *
 * Pure function. Inputs: an investor's holdings as stored in
 * `investor_holdings` (cost basis only — current value lookup is a
 * separate concern, see lib/holdings/value.ts when it ships). Outputs:
 * three sub-scores 0–100 + an overall score + a list of plain-English
 * callouts the UI can render.
 *
 * What the score means:
 *   - "diversification": penalises single-position concentration + few
 *     positions overall. A 10-position evenly-weighted portfolio scores
 *     higher than a 30-position with one 60% concentration.
 *   - "exchangeSpread": penalises 100% AU concentration. Some exposure
 *     to US / global is a *factual* risk-management signal — not advice
 *     to act, but a comparison-driven observation.
 *   - "ageDiversity": penalises everything-bought-this-month patterns
 *     (a possible market-timing signal). Older average holding age =
 *     dollar-cost-averaged or held through a cycle.
 *
 * Compliance: this is a comparison-and-observation score, not advice.
 * The callouts are factual ("80% of cost basis is in one position")
 * and contain no recommendations to act. UI must surface the
 * "general information only — see your accountant" disclaimer.
 */

export interface HoldingForScore {
  ticker: string;
  exchange: string;
  shares: number;
  costBasisPerShareCents: number;
  acquiredAt: string; // YYYY-MM-DD
}

export interface HealthScore {
  diversificationScore: number;
  exchangeSpreadScore: number;
  ageDiversityScore: number;
  overallScore: number;
  callouts: string[];
}

const AU_EXCHANGES = new Set(["ASX"]);
// Treat HKEX/SGX/TYO/KRX/LSE as "international", same bucket as US.
// CRYPTO + OTHER also count as non-AU exposure.

export function computeHealthScore(holdings: ReadonlyArray<HoldingForScore>): HealthScore {
  if (holdings.length === 0) {
    return {
      diversificationScore: 0,
      exchangeSpreadScore: 0,
      ageDiversityScore: 0,
      overallScore: 0,
      callouts: ["Add some holdings to see your portfolio's diversification score."],
    };
  }

  const positionValues = holdings.map((h) => ({
    h,
    cents: h.shares * h.costBasisPerShareCents,
  }));
  const totalCents = positionValues.reduce((s, p) => s + p.cents, 0) || 1;

  // ── Diversification: position count + max concentration ───────────────
  const sortedDesc = [...positionValues].sort((a, b) => b.cents - a.cents);
  const top1Share = sortedDesc[0]!.cents / totalCents;
  const top3Share = sortedDesc.slice(0, 3).reduce((s, p) => s + p.cents, 0) / totalCents;

  const positionCountScore = Math.min(holdings.length / 10, 1) * 100; // 10+ positions = full marks
  const concentrationPenalty = top1Share > 0.5
    ? (top1Share - 0.5) * 200 // 50% → 0; 80% → 60-point penalty
    : 0;
  const diversificationScore = clamp(positionCountScore - concentrationPenalty);

  // ── Exchange spread: AU vs non-AU ─────────────────────────────────────
  const auCents = positionValues
    .filter((p) => AU_EXCHANGES.has(p.h.exchange))
    .reduce((s, p) => s + p.cents, 0);
  const auShare = auCents / totalCents;
  // Sweet spot 30–80% AU. Very low (no AU) and very high (all AU) both penalised.
  const exchangeSpreadScore = clamp(100 - Math.max(0, Math.abs(auShare - 0.55) - 0.25) * 200);

  // ── Age diversity: stdev of acquired-at days ago ──────────────────────
  const today = new Date();
  const days = positionValues.map((p) => Math.max(0, daysBetween(today, p.h.acquiredAt)));
  const meanDays = days.reduce((s, d) => s + d, 0) / days.length;
  const variance = days.reduce((s, d) => s + (d - meanDays) ** 2, 0) / days.length;
  const stdev = Math.sqrt(variance);
  // 90+ days stdev = full marks; everything-this-week = 0.
  const ageDiversityScore = clamp((stdev / 90) * 100);

  const overallScore = Math.round(
    diversificationScore * 0.5 + exchangeSpreadScore * 0.3 + ageDiversityScore * 0.2,
  );

  // ── Callouts: plain-English factual observations ──────────────────────
  const callouts: string[] = [];
  if (top1Share >= 0.4) {
    callouts.push(
      `Your largest position (${sortedDesc[0]!.h.ticker}) is ${(top1Share * 100).toFixed(0)}% of cost basis. High-concentration portfolios swing harder than diversified ones.`,
    );
  }
  if (top3Share >= 0.85 && holdings.length > 3) {
    callouts.push(
      `Your top 3 positions are ${(top3Share * 100).toFixed(0)}% of cost basis — most of your other holdings are footnotes by weight.`,
    );
  }
  if (auShare === 1) {
    callouts.push(
      "Every holding is AU-listed. Adding US or global names is one way investors diversify across currency + economic cycles — see /best/share-trading for international-friendly brokers.",
    );
  }
  if (auShare === 0 && holdings.length > 0) {
    callouts.push(
      "No AU-listed holdings. AU residents often anchor part of their portfolio in ASX names for franking + currency match — see /best/share-trading.",
    );
  }
  if (holdings.length < 3) {
    callouts.push(
      `Only ${holdings.length} position${holdings.length === 1 ? "" : "s"} on file. Diversification scores improve once you have 5+ positions across different sectors.`,
    );
  }

  return {
    diversificationScore: Math.round(diversificationScore),
    exchangeSpreadScore: Math.round(exchangeSpreadScore),
    ageDiversityScore: Math.round(ageDiversityScore),
    overallScore,
    callouts,
  };
}

function clamp(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function daysBetween(today: Date, isoDate: string): number {
  const acquired = new Date(`${isoDate}T00:00:00Z`).getTime();
  const now = today.getTime();
  return Math.floor((now - acquired) / 86400_000);
}
