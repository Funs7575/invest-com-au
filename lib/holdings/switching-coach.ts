/**
 * Switching coach (PR-X5d).
 *
 * Pure function. Inputs: an investor's holdings + estimated trades-per-year
 * (a single number — UI lets the user pick from "I rarely trade" / "few
 * times a year" / "monthly" / "weekly"). Output: a comparison row showing
 * estimated annual brokerage at the user's current broker (read from
 * `broker_slug` on each holding) versus the cheapest eligible broker on
 * the brokers table for the same trade-count assumption.
 *
 * Compliance note: this is a **comparison-driven** output, identical in
 * legal footing to the public /best/share-trading rankings — it just
 * uses the user's actual holdings to make the comparison personal.
 * It says "Broker X charges Y, Broker Z charges W" — never "you should
 * switch". The UI labels the CTA "Compare brokers →" not "Switch to
 * Broker Z". Same lane as the country eligibility filter or the
 * response-time SLA reward — comparisons all the way down.
 */

export interface BrokerForCoach {
  slug: string;
  name: string;
  asx_fee_value: number | null; // AUD per ASX trade
}

export interface SwitchingCoachInput {
  /** Set of broker_slugs the user has tagged on their holdings. */
  currentBrokerSlugs: ReadonlyArray<string>;
  /** Estimate of total trades / year across all brokers. */
  tradesPerYear: number;
  /** Eligible brokers to compare against (caller should pre-filter for status='active' + country eligibility). */
  brokers: ReadonlyArray<BrokerForCoach>;
}

export interface SwitchingCoachResult {
  /** null when the user hasn't tagged broker_slugs OR the current broker isn't on the brokers table. */
  currentBroker: { slug: string; name: string; estCostCents: number } | null;
  /** null when no cheaper broker exists in the input set OR estimate would be invalid. */
  cheapest: { slug: string; name: string; estCostCents: number } | null;
  /** Estimated annual saving in cents. 0 when current is already the cheapest. */
  estSavingCents: number;
  /** Plain-English summary line for the UI. */
  summary: string;
}

export function buildSwitchingCoach(input: SwitchingCoachInput): SwitchingCoachResult {
  const { currentBrokerSlugs, tradesPerYear, brokers } = input;

  // Map slug → broker for fast lookup; skip brokers without a usable fee value.
  const eligible = brokers.filter((b) => typeof b.asx_fee_value === "number" && b.asx_fee_value! >= 0);

  const cheapest = eligible.length > 0
    ? eligible.reduce((best, b) => (b.asx_fee_value! < best.asx_fee_value! ? b : best))
    : null;

  // Pick the user's "current broker" — if they tagged multiple, use the
  // cheapest of theirs (a generous comparison: the UI shows the saving
  // even if their cheapest current broker beats their tagged-most one).
  const currentMatches = currentBrokerSlugs
    .map((slug) => eligible.find((b) => b.slug === slug))
    .filter((b): b is BrokerForCoach => Boolean(b));
  const current = currentMatches.length > 0
    ? currentMatches.reduce((best, b) => (b.asx_fee_value! < best.asx_fee_value! ? b : best))
    : null;

  if (!current || !cheapest || tradesPerYear <= 0) {
    return {
      currentBroker: null,
      cheapest: cheapest && tradesPerYear > 0
        ? {
            slug: cheapest.slug,
            name: cheapest.name,
            estCostCents: Math.round(cheapest.asx_fee_value! * 100 * tradesPerYear),
          }
        : null,
      estSavingCents: 0,
      summary: !current
        ? "Tag a broker on your holdings (and pick a trade frequency below) to see how much you'd save by switching."
        : tradesPerYear <= 0
          ? "Pick a trade frequency to estimate annual brokerage cost."
          : "No comparable brokers loaded.",
    };
  }

  const currentCostCents = Math.round(current.asx_fee_value! * 100 * tradesPerYear);
  const cheapestCostCents = Math.round(cheapest.asx_fee_value! * 100 * tradesPerYear);
  const estSavingCents = Math.max(0, currentCostCents - cheapestCostCents);

  const summary = current.slug === cheapest.slug
    ? `${current.name} is the lowest-fee match in our ASX broker set for your trade frequency. No estimated saving from switching.`
    : `Estimated brokerage at ${current.name}: ${formatAud(currentCostCents)}/yr · at ${cheapest.name}: ${formatAud(cheapestCostCents)}/yr · saving ~${formatAud(estSavingCents)}/yr.`;

  return {
    currentBroker: { slug: current.slug, name: current.name, estCostCents: currentCostCents },
    cheapest: { slug: cheapest.slug, name: cheapest.name, estCostCents: cheapestCostCents },
    estSavingCents,
    summary,
  };
}

function formatAud(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}
