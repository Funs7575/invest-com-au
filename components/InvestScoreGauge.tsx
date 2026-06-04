/**
 * InvestScoreGauge — server component.
 *
 * Reads today's Invest Score from invest_score_daily and renders a
 * semi-circular SVG gauge. Returns null silently when no score has been
 * computed yet (first run of the cron hasn't completed).
 *
 * ISR: revalidated every hour alongside the daily cron group that
 * computes the score.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600;

const SEGMENT_COLORS = [
  "#ef4444", // Very Cautious  (0–25)
  "#f97316", // Cautious       (25–40)
  "#eab308", // Neutral        (40–55)
  "#22c55e", // Constructive   (55–70)
  "#10b981", // Positive       (70–85)
  "#06b6d4", // Very Positive  (85–100)
] as const;

function scoreColor(score: number): string {
  if (score < 25) return SEGMENT_COLORS[0];
  if (score < 40) return SEGMENT_COLORS[1];
  if (score < 55) return SEGMENT_COLORS[2];
  if (score < 70) return SEGMENT_COLORS[3];
  if (score < 85) return SEGMENT_COLORS[4];
  return SEGMENT_COLORS[5];
}

/**
 * Convert a 0–100 score to an SVG arc path on a 200×110 viewBox.
 * The arc spans 180° (left = 0, right = 100).
 * cx=100, cy=100, r=70.
 */
function needleTransform(score: number): string {
  const angle = (score / 100) * 180 - 90; // -90° = left, +90° = right
  return `rotate(${angle}, 100, 100)`;
}

export default async function InvestScoreGauge() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invest_score_daily")
    .select("date, score, label, components, updated_at")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const { score, label } = data;
  const color = scoreColor(score);
  const components = data.components as {
    rateLevel?: number;
    rateMomentum?: number;
    platformActivity?: number;
    marketBreadth?: number;
  } | null;

  return (
    <section className="container-custom my-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center gap-5 md:gap-8 shadow-sm">
        {/* Gauge */}
        <div className="shrink-0">
          <svg
            viewBox="0 0 200 110"
            width={160}
            height={88}
            aria-label={`Invest Score: ${Math.round(score)} — ${label}`}
            role="img"
          >
            {/* Background arc */}
            <path
              d="M 15 100 A 85 85 0 0 1 185 100"
              fill="none"
              stroke="rgba(148,163,184,0.25)"
              strokeWidth={16}
              strokeLinecap="round"
            />
            {/* Score arc */}
            <path
              d="M 15 100 A 85 85 0 0 1 185 100"
              fill="none"
              stroke={color}
              strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 267} 267`}
              style={{ transition: "stroke-dasharray 0.8s ease-out" }}
            />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="22"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              transform={needleTransform(score)}
              style={{ transformOrigin: "100px 100px", transition: "transform 0.8s ease-out" }}
            />
            <circle cx="100" cy="100" r="5" fill="currentColor" />
            {/* Labels */}
            <text x="12" y="108" fontSize="9" fill="#94a3b8" textAnchor="middle">0</text>
            <text x="188" y="108" fontSize="9" fill="#94a3b8" textAnchor="middle">100</text>
            {/* Score text */}
            <text x="100" y="90" fontSize="22" fontWeight="700" fill="currentColor" textAnchor="middle">
              {Math.round(score)}
            </text>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: color }}
            />
            <h2 className="text-base md:text-lg font-bold text-slate-900">
              The Invest Score
              <span className="ml-2 text-sm font-semibold" style={{ color }}>
                {label}
              </span>
            </h2>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mb-3 leading-relaxed">
            A daily composite of public market signals — savings rate levels, rate momentum,
            advisor platform activity, and market breadth. Not a buy/sell signal.
          </p>

          {/* Component breakdown */}
          {components && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {[
                { key: "rateLevel", label: "Rate level", value: components.rateLevel },
                { key: "rateMomentum", label: "Rate momentum", value: components.rateMomentum },
                { key: "platformActivity", label: "Activity", value: components.platformActivity },
                { key: "marketBreadth", label: "Breadth", value: components.marketBreadth },
              ].map(({ key, label: compLabel, value }) => (
                <div key={key} className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[10px] text-slate-400 font-medium mb-0.5">{compLabel}</div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: value != null ? scoreColor(value) : "#94a3b8" }}
                  >
                    {value ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/methodology/invest-score"
            className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors underline-offset-2 hover:underline"
          >
            How is The Invest Score calculated? →
          </Link>
        </div>
      </div>
    </section>
  );
}
