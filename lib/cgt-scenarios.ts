/**
 * CGT scenario grid behind /cgt-calculator/[scenario] — programmatic
 * worked examples over the existing pure engine (lib/calculators/cgt).
 * Pure math, nothing to ingest: every page is fully static and
 * indexable from day one, same posture as lib/fee-drag.
 *
 * Each scenario is one (gain, marginal rate) pair; the page tells the
 * one story that matters — what the 12-month discount does to the tax
 * bill — plus the super-holder variant.
 */

import { computeCgt, type CgtResult } from "@/lib/calculators/cgt";
import { formatMoney } from "@/lib/fee-drag";

export { formatMoney };

export interface CgtScenario {
  slug: string;
  gain: number;
  /** e.g. "50k" — for headlines. */
  gainLabel: string;
  /** Marginal rate as a fraction, e.g. 0.37. */
  marginalRate: number;
  /** e.g. "37" — for headlines and slugs. */
  rateLabel: string;
}

const GAINS: { gain: number; label: string }[] = [
  { gain: 10_000, label: "10k" },
  { gain: 25_000, label: "25k" },
  { gain: 50_000, label: "50k" },
  { gain: 100_000, label: "100k" },
  { gain: 250_000, label: "250k" },
  { gain: 500_000, label: "500k" },
];

/** Resident marginal rates (excl. Medicare levy) — matches the engine's
 * framing; the rate is an input, not tax advice about the reader's bracket. */
const RATES: { rate: number; label: string }[] = [
  { rate: 0.3, label: "30" },
  { rate: 0.37, label: "37" },
  { rate: 0.45, label: "45" },
];

export const CGT_SCENARIOS: CgtScenario[] = GAINS.flatMap(({ gain, label }) =>
  RATES.map(({ rate, label: rateLabel }) => ({
    slug: `${label}-gain-at-${rateLabel}pc`,
    gain,
    gainLabel: label,
    marginalRate: rate,
    rateLabel,
  })),
);

const index = new Map(CGT_SCENARIOS.map((s) => [s.slug, s]));

export function cgtScenario(slug: string): CgtScenario | null {
  return index.get(slug) ?? null;
}

export interface CgtScenarioOutcomes {
  /** Sold within 12 months — no discount. */
  shortHold: CgtResult;
  /** Held > 12 months — 50% individual discount. */
  longHold: CgtResult;
  /** Held > 12 months inside super — 1/3 discount. */
  superHold: CgtResult;
}

export function cgtScenarioOutcomes(s: CgtScenario): CgtScenarioOutcomes {
  return {
    shortHold: computeCgt({ gain: s.gain, marginalRate: s.marginalRate, held12Months: false }),
    longHold: computeCgt({ gain: s.gain, marginalRate: s.marginalRate, held12Months: true }),
    superHold: computeCgt({
      gain: s.gain,
      // Super funds pay 15% on investment earnings; the marginal-rate input
      // models that flat rate rather than the member's personal bracket.
      marginalRate: 0.15,
      held12Months: true,
      holder: "super",
    }),
  };
}

/** Same gain at other rates + same rate at neighbouring gains. */
export function relatedCgtScenarios(s: CgtScenario, limit = 6): CgtScenario[] {
  const sameGain = CGT_SCENARIOS.filter((o) => o.gain === s.gain && o.slug !== s.slug);
  const sameRate = CGT_SCENARIOS.filter((o) => o.marginalRate === s.marginalRate && o.slug !== s.slug).sort(
    (a, b) => Math.abs(a.gain - s.gain) - Math.abs(b.gain - s.gain),
  );
  const merged: CgtScenario[] = [];
  for (const o of [...sameGain, ...sameRate]) {
    if (!merged.some((m) => m.slug === o.slug)) merged.push(o);
    if (merged.length >= limit) break;
  }
  return merged;
}
