"use client";

import Icon from "@/components/Icon";

/**
 * Match-score badge + "why we routed you here" transparency strip.
 * Renders between the headline strip and the top-match / plan card on
 * the result screen. Builds retail trust by showing the math.
 *
 * Compliance: "matched based on your answers" — passive routing
 * language, never "we recommend".
 */

interface Props {
  score: number;
  bullets: string[];
}

export default function MatchExplainerCard({ score, bullets }: Props) {
  // Score color: ≥85 = emerald (very strong), 70-84 = amber, <70 = slate.
  const tone =
    score >= 85
      ? { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-300" }
      : score >= 70
        ? { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-300" }
        : { text: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", ring: "ring-slate-300" };

  return (
    <section
      className={`rounded-2xl border ${tone.border} ${tone.bg} p-5 mb-6`}
      aria-label="Match score and routing explanation"
    >
      <div className="flex items-start gap-4">
        {/* Score badge — fixed-width circle */}
        <div className="shrink-0">
          <div
            className={`w-16 h-16 rounded-full bg-white border-2 ring-2 ${tone.ring} ${tone.border} flex items-center justify-center`}
          >
            <span className={`text-2xl font-extrabold ${tone.text}`}>
              {score}
            </span>
          </div>
          <p className={`text-[10px] uppercase tracking-widest font-bold mt-1 text-center ${tone.text}`}>
            Match
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[11px] uppercase tracking-widest font-bold ${tone.text} mb-1`}>
            Why we matched you here
          </p>
          <ul className="text-sm text-slate-800 space-y-1">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <Icon
                  name="check"
                  size={12}
                  className={`mt-1 shrink-0 ${tone.text}`}
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-slate-500 mt-2">
            Routed from your answers. General information only — not personal advice.
          </p>
        </div>
      </div>
    </section>
  );
}
