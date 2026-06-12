/**
 * lib/getmatched/fee-projection.ts
 *
 * Get Matched Showcase G3 (docs/plans/GET_MATCHED_SHOWCASE.md): a factual
 * annual-platform-cost projection for a broker, on the user's stated budget
 * and goal. Surfaced on the result cards as "≈ $X/yr on your stated amount".
 *
 * COMPLIANCE: strictly calculator output (FACTUAL_CALCULATOR_DISCLAIMER). The
 * trade-frequency assumption is returned in `assumptionLabel` so the UI can
 * disclose it inline — no hidden inputs, no suitability judgement. Returns
 * null when fee data is insufficient (UI then omits the line entirely).
 *
 * Reuses the documented cost model from `lib/cost-scenarios.ts` (ASX brokerage
 * × trades × 12 + parsed inactivity fee). Those helpers are module-private in
 * cost-scenarios.ts, so the equivalent maths is re-expressed here against the
 * same `Broker` fee fields — the formula is identical, the assumption is the
 * only thing that differs per goal. Pure, deterministic, exhaustively tested.
 */

import type { Broker } from "@/lib/types";

export interface FeeProjection {
  /** Estimated annual platform cost in AUD, rounded to the nearest dollar. */
  annualCostAud: number;
  /** The disclosed assumption, e.g. "≈12 ASX trades/yr". */
  assumptionLabel: string;
}

/**
 * Documented trades/yr assumptions keyed by stated goal. An active goal
 * (trade / crypto-active) assumes more turnover; a hands-off goal assumes
 * very little. These are illustrative averages, disclosed to the user.
 */
const TRADES_PER_YEAR: Record<string, number> = {
  trade: 24,
  crypto: 24,
  grow: 12,
  income: 12,
  property: 12,
  super: 12,
  automate: 4,
  alt_assets: 4,
  royalties: 4,
  pre_ipo: 4,
  browse: 6,
  home: 6,
  help: 6,
};

const DEFAULT_TRADES_PER_YEAR = 12;

/**
 * Resolve the trades/yr assumption from the stated goal, with an experience
 * nudge: an "active trader" crypto sub-answer leans to the active band, while
 * a beginner leans down one step. Returned via assumptionLabel for disclosure.
 */
function tradesPerYear(
  intent: string | null | undefined,
  experience: string | null | undefined,
  cryptoActive: boolean,
): number {
  let base =
    (intent ? TRADES_PER_YEAR[intent] : undefined) ?? DEFAULT_TRADES_PER_YEAR;

  // A self-described active crypto trader trades more than a holder.
  if (cryptoActive) base = Math.max(base, 24);

  // Experience nudge: advanced/pro trades a little more, beginners a little
  // less — bounded so the assumption stays plausible and documented.
  if (experience === "pro") base = Math.round(base * 1.25);
  else if (experience === "beginner") base = Math.max(2, Math.round(base * 0.5));

  return base;
}

/** Annual ASX brokerage = per-trade fee × trades/yr. */
function annualAsxBrokerage(b: Broker, tradesYr: number): number | null {
  if (b.asx_fee_value === null || b.asx_fee_value === undefined) return null;
  return b.asx_fee_value * tradesYr;
}

/**
 * Parse a broker's inactivity fee string into an annual AUD cost. Mirrors the
 * format handling in cost-scenarios.ts: "$10/month", "$50/qtr", "None", "$0".
 */
function annualInactivityCost(b: Broker): number {
  const raw = b.inactivity_fee;
  if (!raw || raw === "None" || raw === "$0" || raw === "No") return 0;
  const match = raw.match(/\$(\d+(?:\.\d+)?)/);
  if (!match || match[1] === undefined) return 0;
  const amount = parseFloat(match[1]);
  if (Number.isNaN(amount)) return 0;
  if (/month/i.test(raw)) return amount * 12;
  if (/qtr|quarter/i.test(raw)) return amount * 4;
  return amount; // assume annual
}

export interface FeeProjectionInput {
  broker: Broker;
  budgetBand?: string | null;
  intent?: string | null;
  experience?: string | null;
  /** crypto_sub answer — "active" raises the turnover assumption. */
  cryptoSub?: string | null;
}

/**
 * Estimate the annual platform cost for a broker under the user's stated
 * goal + experience. Returns null when there's no documented ASX fee to
 * project from (the UI omits the line rather than guessing).
 *
 * The budget band is accepted for API symmetry and future per-band trade-size
 * modelling, but the headline annual cost here is brokerage-driven (the same
 * model the cost-scenario pages use) so it does not depend on portfolio value.
 */
export function projectAnnualFee(input: FeeProjectionInput): FeeProjection | null {
  const { broker, intent, experience, cryptoSub } = input;

  const tradesYr = tradesPerYear(intent, experience, cryptoSub === "active");
  const brokerage = annualAsxBrokerage(broker, tradesYr);
  // No documented ASX fee → we cannot project a credible number.
  if (brokerage === null) return null;

  const inactivity = annualInactivityCost(broker);
  const annualCostAud = Math.round(brokerage + inactivity);

  const assumptionLabel = `≈${tradesYr} ASX trades/yr`;

  return { annualCostAud, assumptionLabel };
}

/** Format an annual cost projection for display, e.g. "$0/yr" or "$288/yr". */
export function formatAnnualFee(p: FeeProjection): string {
  return `$${p.annualCostAud.toLocaleString("en-AU")}/yr`;
}
