import CohortInsights from "@/components/CohortInsights";

/**
 * Maps investor_profiles.primary_vertical to the trading_interest values
 * used by the quiz_leads cohort-stats query. Unmapped verticals (super,
 * smsf, property) omit the interest param so the cohort broadens to all
 * investors in the same experience + budget band.
 */
const VERTICAL_TO_INTEREST: Record<string, string> = {
  shares: "grow",
  robo:   "grow",
  crypto: "crypto",
  trade:  "trade",
  income: "income",
};

interface Props {
  experienceLevel: string | null;
  budgetBand: string | null;
  primaryVertical: string | null;
}

/**
 * Dashboard section: "How investors like you are exploring the market."
 *
 * Renders null when the user hasn't completed enough profile to form a
 * cohort (no experience or budget data from investor_profiles).
 *
 * CohortInsights is a client component that fetches /api/cohort-stats and
 * handles the loading skeleton + editorial fallback automatically.
 */
export default function AccountCohortWidget({
  experienceLevel,
  budgetBand,
  primaryVertical,
}: Props) {
  if (!experienceLevel || !budgetBand) return null;

  const interest = primaryVertical
    ? VERTICAL_TO_INTEREST[primaryVertical]
    : undefined;

  return (
    <section aria-label="Peer cohort insights" className="mb-6">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-900">
          How investors like you explore the market
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Anonymised — based on investors with a similar experience level and
          budget, never linked to your identity.
        </p>
      </div>
      <CohortInsights
        experience={experienceLevel}
        range={budgetBand}
        interest={interest}
      />
    </section>
  );
}
