/**
 * AdvisorReputationSummary
 *
 * Server-renderable (RSC) section displayed on an advisor's public profile.
 * Shows the Advisor Reputation Score — a factual composite of:
 *   - Engagement-verified review count
 *   - Total approved review count
 *   - Average star rating
 *   - Verified review percentage
 *
 * Positioned alongside (not replacing) the existing AdvisorTrustScoreSection.
 *
 * AFSL SAFETY: This section is clearly labelled as factual/informational.
 * The GENERAL_ADVICE_WARNING is displayed. The score does NOT rank advisors
 * against each other and does NOT imply suitability for any consumer.
 */

import type { AdvisorReputationScore } from "@/lib/advisor-reputation";

/* ─── Colour helpers ─── */

function barBg(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-teal-500";
  if (score >= 35) return "bg-amber-400";
  return "bg-slate-300";
}

function scoreFg(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-teal-600";
  if (score >= 35) return "text-amber-600";
  return "text-slate-400";
}

/* ─── Small star renderer ─── */

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          style={{ color: n <= Math.round(rating) ? "#f59e0b" : "#e2e8f0" }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

/* ─── Component ─── */

export default function AdvisorReputationSummary({
  reputation,
  advisorName,
  generalAdviceWarning,
}: {
  reputation: AdvisorReputationScore;
  advisorName: string;
  generalAdviceWarning: string;
}) {
  return (
    <section
      aria-labelledby="reputation-heading"
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 shrink-0"
          aria-hidden="true"
        >
          {/* Star icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#475569"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </span>
        <div>
          <h2
            id="reputation-heading"
            className="text-sm font-bold text-slate-800"
          >
            Reputation Summary
          </h2>
          <p className="text-xs text-slate-400 leading-tight">
            Factual review signals &mdash; not a recommendation
          </p>
        </div>
      </div>

      {/* Score summary row */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 px-5 py-5 border-b border-slate-100">
        {/* Overall score pill */}
        <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 border-slate-100 shrink-0 bg-white shadow-sm">
          <span
            className={`text-2xl font-extrabold tabular-nums ${scoreFg(reputation.overall)}`}
            aria-label={`Reputation score: ${reputation.overall} out of 100`}
          >
            {reputation.overall}
          </span>
          <span className="text-[0.62rem] text-slate-400 font-medium">/&nbsp;100</span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs text-slate-400 mb-0.5">Reputation Score</p>
          <p className={`text-2xl font-extrabold mb-1 ${reputation.labelColor}`}>
            {reputation.label}
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-500 mb-1.5">
            <span>
              <strong className="text-slate-700 tabular-nums">
                {reputation.totalReviews}
              </strong>{" "}
              review{reputation.totalReviews !== 1 ? "s" : ""}
            </span>
            <span>
              <strong className="text-slate-700 tabular-nums">
                {reputation.verifiedReviews}
              </strong>{" "}
              verified
            </span>
            {reputation.avgRating != null && (
              <span className="flex items-center gap-1">
                <Stars rating={reputation.avgRating} />
                <strong className="text-slate-700 tabular-nums">
                  {reputation.avgRating.toFixed(1)}
                </strong>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
            Reputation for{" "}
            <strong className="text-slate-700">{advisorName}</strong> is
            computed from engagement-verified review counts, total review
            volume, and average star rating. Factual data only.
          </p>
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="px-5 py-5 space-y-4">
        {reputation.dimensions.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-xs font-semibold text-slate-700">
                  {dim.label}
                </span>
                <span className="ml-1.5 text-xs text-slate-400">
                  ({(dim.weight * 100).toFixed(0)}% weight)
                </span>
              </div>
              <span
                className={`text-xs font-bold tabular-nums ${scoreFg(dim.score)}`}
              >
                {dim.score}
                <span className="text-slate-300 font-normal">/100</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full rounded-full ${barBg(dim.score)}`}
                style={{ width: `${dim.score}%` }}
                role="presentation"
              />
            </div>
            <p className="text-xs text-slate-400 italic">{dim.rationale}</p>
          </div>
        ))}
      </div>

      {/* Compliance footer */}
      <div className="px-5 pb-5">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong className="font-semibold">General Advice Warning:</strong>{" "}
          {generalAdviceWarning}
        </p>
      </div>
    </section>
  );
}
