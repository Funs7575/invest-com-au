/**
 * AdvisorTrustScoreSection
 *
 * Server-renderable (RSC) section that displays the Advisor Trust Score
 * on a professional's public profile page. Pure SVG + HTML — no client deps.
 *
 * Displays:
 *   - Overall score gauge (SVG, same approach as broker ScoreGauge)
 *   - Per-dimension score bars with rationales
 *   - Short methodology blurb with link to full methodology page
 *   - GENERAL_ADVICE_WARNING from lib/compliance
 *
 * AFSL safety: the section is clearly labelled as factual/informational,
 * contains the general advice warning, and links to the full methodology.
 * It does not rank advisors against each other on this page.
 */

import Link from "next/link";
import type { AdvisorTrustScore } from "@/lib/advisor-trust-score";

/* ─── SVG Gauge ─── */

function TrustScoreGauge({
  score,
  size = 112,
}: {
  score: number;
  size?: number;
}) {
  const r = (size - 14) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const gaugeColor =
    score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#94a3b8";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Advisor Trust Score: ${score} out of 100`}
      className="shrink-0"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="9"
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={gaugeColor}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {/* Score number */}
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="800"
        fill="#0f172a"
      >
        {score}
      </text>
      {/* /100 label */}
      <text
        x={size / 2}
        y={size / 2 + 16}
        textAnchor="middle"
        fontSize="9"
        fontWeight="500"
        fill="#94a3b8"
      >
        / 100
      </text>
    </svg>
  );
}

/* ─── Bar colour helpers ─── */

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-slate-300";
}

function labelColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-slate-500";
}

/* ─── Component ─── */

export default function AdvisorTrustScoreSection({
  trustScore,
  advisorName,
  generalAdviceWarning,
}: {
  trustScore: AdvisorTrustScore;
  advisorName: string;
  generalAdviceWarning: string;
}) {
  return (
    <section
      aria-labelledby="trust-score-heading"
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        {/* Shield icon */}
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 shrink-0"
          aria-hidden="true"
        >
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
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        <div>
          <h2
            id="trust-score-heading"
            className="text-sm font-bold text-slate-800"
          >
            Trust Score
          </h2>
          <p className="text-xs text-slate-500 leading-tight">
            Factual credential &amp; compliance signals &mdash; not a recommendation
          </p>
        </div>
      </div>

      {/* Score summary row */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 px-5 py-5 border-b border-slate-100">
        <TrustScoreGauge score={trustScore.overall} size={112} />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs text-slate-500 mb-0.5">Overall Trust Score</p>
          <p
            className={`text-2xl font-extrabold mb-1 ${labelColor(trustScore.overall)}`}
          >
            {trustScore.label}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
            This score for{" "}
            <strong className="text-slate-700">{advisorName}</strong> is
            computed from four factual dimensions: credential verification,
            platform tenure, profile transparency, and client review record.
          </p>
          <p className="mt-2 text-xs">
            <Link
              href="/advisor/trust-score-methodology"
              className="text-slate-500 hover:text-slate-700 underline underline-offset-2"
            >
              How is this score calculated?
            </Link>
          </p>
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="px-5 py-5 space-y-4">
        {trustScore.dimensions.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-xs font-semibold text-slate-700">
                  {dim.label}
                </span>
                <span className="ml-1.5 text-xs text-slate-500">
                  ({(dim.weight * 100).toFixed(0)}% weight)
                </span>
              </div>
              <span
                className={`text-xs font-bold tabular-nums ${labelColor(dim.score)}`}
              >
                {dim.score}
                <span className="text-slate-300 font-normal">/100</span>
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full ${barColor(dim.score)}`}
                style={{ width: `${dim.score}%` }}
                role="presentation"
              />
            </div>
            {/* Dimension description */}
            <p className="text-xs text-slate-500 leading-relaxed">
              {dim.description}
            </p>
            {/* Rationale */}
            {dim.rationale && (
              <p className="text-xs text-slate-500 mt-0.5 italic">
                {dim.rationale}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Methodology note + compliance warning */}
      <div className="px-5 pb-5 space-y-3">
        {/* Methodology link */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-slate-600 mb-0.5">
            Methodology
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            The Trust Score is a factual composite of four dimensions:
            Verification &amp; Registration ({(trustScore.dimensions[0]?.weight ?? 0.30) * 100}%),
            Track Record ({(trustScore.dimensions[1]?.weight ?? 0.25) * 100}%),
            Profile Transparency ({(trustScore.dimensions[2]?.weight ?? 0.25) * 100}%),
            and Client Feedback ({(trustScore.dimensions[3]?.weight ?? 0.20) * 100}%).
            Scores are computed on-read from current profile data.{" "}
            <Link
              href="/advisor/trust-score-methodology"
              className="underline hover:text-slate-700"
            >
              Full methodology &rarr;
            </Link>
          </p>
        </div>

        {/* General advice warning */}
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong className="font-semibold">General Advice Warning:</strong>{" "}
          {generalAdviceWarning}
        </p>
      </div>
    </section>
  );
}
