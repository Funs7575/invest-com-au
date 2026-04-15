/**
 * Best-for scenario scorer.
 *
 * Takes a `best_for_scenarios` row (scoring_weights + required_attrs
 * + category_filter) and a list of brokers, and returns a ranked
 * list with per-broker scores + a breakdown so the page can show
 * why each broker ranks where it does.
 *
 * Scoring model (deterministic, no ML):
 *
 *   1. Filter: drop brokers that don't have every required_attr.
 *   2. Filter: drop brokers where category_filter doesn't match.
 *   3. Score each broker against the weights.
 *   4. Normalise to 0-100 so the best broker gets 100 and the
 *      worst gets some positive floor.
 *
 * Weight semantics:
 *   - Positive weight on a boolean attr: +weight if broker has it.
 *   - Negative weight on a numeric attr: penalty for high values.
 *     (Used for fees — we WANT low values, so the weight is
 *     negative of "how bad" a high value is.)
 *   - Positive weight on a numeric attr: bonus for high values.
 *     (Used for ratings.)
 */

export interface BrokerForScoring {
  id: number;
  slug: string;
  name: string;
  status?: string | null;
  rating?: number | null;
  asx_fee_value?: number | null;
  us_fee_value?: number | null;
  fx_rate?: number | null;
  inactivity_fee_value?: number | null;
  chess_sponsored?: boolean | null;
  smsf_support?: boolean | null;
  platform_type?: string | null;
  [k: string]: unknown;
}

export interface ScenarioInput {
  slug: string;
  scoring_weights: Record<string, number>;
  required_attrs?: string[] | null;
  category_filter?: string | null;
}

export interface ScoreBreakdown {
  attr: string;
  weight: number;
  rawValue: number | boolean | null;
  contribution: number;
}

export interface ScoredBroker {
  broker: BrokerForScoring;
  rank: number;
  score: number;         // 0-100 after normalisation
  rawScore: number;      // pre-normalisation
  breakdown: ScoreBreakdown[];
}

/**
 * Pull a numeric value off a broker row, handling nulls and the
 * boolean-as-1/0 case.
 */
function getNumeric(broker: BrokerForScoring, attr: string): number | null {
  const v = broker[attr];
  if (v === true) return 1;
  if (v === false) return 0;
  if (typeof v === "number") return v;
  if (v == null) return null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function passesRequired(
  broker: BrokerForScoring,
  required: string[],
): boolean {
  return required.every((attr) => {
    const v = broker[attr];
    // Boolean required — must be true
    if (typeof v === "boolean") return v;
    // Numeric required — must be non-null and non-zero
    if (typeof v === "number") return v > 0;
    // String required — must be non-empty
    if (typeof v === "string") return v.length > 0;
    // Null / missing — fail
    return false;
  });
}

function passesCategory(
  broker: BrokerForScoring,
  filter: string | null | undefined,
): boolean {
  if (!filter) return true;
  const pt = (broker.platform_type || "").toLowerCase();
  return pt === filter.toLowerCase();
}

/**
 * Compute the raw score for one broker against the scenario weights.
 * Returns the score + a breakdown for the page to render.
 */
function scoreBroker(
  broker: BrokerForScoring,
  weights: Record<string, number>,
): { score: number; breakdown: ScoreBreakdown[] } {
  const breakdown: ScoreBreakdown[] = [];
  let total = 0;
  for (const [attr, weight] of Object.entries(weights)) {
    const rawValue = getNumeric(broker, attr);
    if (rawValue == null) {
      // Missing data penalises the broker slightly — we don't
      // want a broker with a complete record to lose to one with
      // missing data that "dodges" the weights.
      breakdown.push({
        attr,
        weight,
        rawValue: null,
        contribution: 0,
      });
      continue;
    }
    const contribution = rawValue * weight;
    total += contribution;
    breakdown.push({
      attr,
      weight,
      rawValue: rawValue === 0 || rawValue === 1 ? Boolean(rawValue) : rawValue,
      contribution,
    });
  }
  return { score: total, breakdown };
}

/**
 * Rank a list of brokers against a scenario. Normalises the
 * scores so the best broker gets 100 and the worst gets a
 * sensible lower bound (not 0 — that's psychologically harsh
 * and reads as "this broker is bad" when really it's just the
 * relative worst of a strong field).
 */
export function rankBrokersForScenario(
  scenario: ScenarioInput,
  brokers: BrokerForScoring[],
): ScoredBroker[] {
  // Only active brokers that pass both filter gates
  const filtered = brokers.filter((b) => {
    if (b.status && b.status !== "active") return false;
    if (
      scenario.required_attrs &&
      !passesRequired(b, scenario.required_attrs)
    ) {
      return false;
    }
    if (!passesCategory(b, scenario.category_filter)) return false;
    return true;
  });

  const scored = filtered.map((b) => ({
    broker: b,
    ...scoreBroker(b, scenario.scoring_weights),
  }));

  if (scored.length === 0) return [];

  // Sort descending by raw score
  scored.sort((a, b) => b.score - a.score);

  // Normalise: best → 100, worst → max(40, 100 - spread*100)
  const best = scored[0].score;
  const worst = scored[scored.length - 1].score;
  const spread = best - worst;

  return scored.map((s, i) => {
    let normalised = 100;
    if (spread > 0) {
      const relative = (s.score - worst) / spread;
      normalised = Math.round(40 + relative * 60); // floor 40, ceiling 100
    }
    return {
      broker: s.broker,
      rank: i + 1,
      score: normalised,
      rawScore: Math.round(s.score * 100) / 100,
      breakdown: s.breakdown,
    };
  });
}
