"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Broker, BrokerHealthScore } from "@/lib/types";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { trackEvent } from "@/lib/tracking";

const DIMENSIONS = [
  { key: "regulatory_score" as const, label: "Regulatory", weight: 0.25, noteKey: "regulatory_notes" as const },
  { key: "client_money_score" as const, label: "Client Money", weight: 0.25, noteKey: "client_money_notes" as const },
  { key: "financial_stability_score" as const, label: "Financial Stability", weight: 0.20, noteKey: "financial_stability_notes" as const },
  { key: "platform_reliability_score" as const, label: "Platform Reliability", weight: 0.15, noteKey: "platform_reliability_notes" as const },
  { key: "insurance_score" as const, label: "Insurance", weight: 0.15, noteKey: "insurance_notes" as const },
];

function ScoreGauge({ score, color, size = 140 }: { score: number; color: string; size?: number }) {
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const gaugeColor = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={gaugeColor}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-3xl font-extrabold"
        fill="#0f172a"
      >
        {score}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 20}
        textAnchor="middle"
        className="text-[10px] font-medium"
        fill="#94a3b8"
      >
        / 100
      </text>
    </svg>
  );
}

function DimensionBar({ score, label, note, weight, isPro }: {
  score: number;
  label: string;
  note?: string;
  weight: number;
  isPro: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const barColor = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{(weight * 100).toFixed(0)}% weight</span>
          <span className={`text-sm font-bold ${score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-500"}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      {isPro && note && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-green-700 hover:underline"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>
          {expanded && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5 leading-relaxed">
              {note}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function HealthScoresClient({
  brokers,
  scores,
}: {
  brokers: Broker[];
  scores: BrokerHealthScore[];
}) {
  const { isPro, loading: authLoading } = useSubscription();
  const [selectedSlug, setSelectedSlug] = useState("");

  const scoreMap = useMemo(
    () => new Map(scores.map((s) => [s.broker_slug, s])),
    [scores]
  );

  const selectedScore = scoreMap.get(selectedSlug) || null;
  const selectedBroker = brokers.find((b) => b.slug === selectedSlug) || null;

  const sorted = useMemo(
    () =>
      [...scores].sort((a, b) => b.overall_score - a.overall_score),
    [scores]
  );

  return (
    <div className="py-12">
      <div className="container-custom max-w-4xl mx-auto">
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">Broker Health Scores</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
          Broker Health &amp; Risk Scores
        </h1>
        <p className="text-slate-600 mb-8">
          Proprietary safety scores for every Australian broker. See how your broker rates across regulatory compliance,
          client money handling, financial stability, platform reliability, and insurance.
        </p>

        {/* Broker selector */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Select Broker
          </label>
          <select
            value={selectedSlug}
            onChange={(e) => {
              setSelectedSlug(e.target.value);
              if (e.target.value) trackEvent("health_score_select", { broker: e.target.value }, "/health-scores");
            }}
            className="w-full md:w-80 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
          >
            <option value="">Choose a broker...</option>
            {brokers.map((b) => (
              <option key={b.slug} value={b.slug}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Score Detail */}
        {selectedScore && selectedBroker ? (
          <div className="space-y-6 mb-8">
            {/* Gauge + summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ScoreGauge score={selectedScore.overall_score} color={selectedBroker.color} />
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-extrabold">{selectedBroker.name}</h2>
                  <p className={`text-lg font-bold mt-1 ${
                    selectedScore.overall_score >= 80 ? "text-green-600" : selectedScore.overall_score >= 50 ? "text-amber-600" : "text-red-500"
                  }`}>
                    {selectedScore.overall_score >= 80 ? "Excellent Safety Rating" : selectedScore.overall_score >= 50 ? "Good Safety Rating" : "Below Average Safety"}
                  </p>
                  {selectedScore.afsl_number && (
                    <p className="text-xs text-slate-500 mt-2">
                      AFSL: {selectedScore.afsl_number} ({selectedScore.afsl_status || "active"})
                      {" · "}
                      <a
                        href={`https://connectonline.asic.gov.au/RegistrySearch/faces/landing/SearchRegisters.jspx`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 hover:underline"
                      >
                        Verify on ASIC →
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dimension breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="text-lg font-extrabold mb-4">Score Breakdown</h3>
              {isPro || authLoading ? (
                <div className="space-y-5">
                  {DIMENSIONS.map((d) => (
                    <DimensionBar
                      key={d.key}
                      score={selectedScore[d.key]}
                      label={d.label}
                      note={selectedScore[d.noteKey] || undefined}
                      weight={d.weight}
                      isPro={isPro}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-5 mb-4">
                    <DimensionBar
                      score={selectedScore.regulatory_score}
                      label="Regulatory"
                      weight={0.25}
                      isPro={false}
                    />
                  </div>
                  <div className="relative">
                    <div className="space-y-5 blur-sm pointer-events-none select-none">
                      {DIMENSIONS.slice(1).map((d) => (
                        <DimensionBar
                          key={d.key}
                          score={selectedScore[d.key]}
                          label={d.label}
                          weight={d.weight}
                          isPro={false}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 border border-slate-200 rounded-xl p-5 text-center shadow-lg">
                        <p className="text-sm font-bold text-slate-900 mb-1">Full Safety Breakdown</p>
                        <p className="text-xs text-slate-500 mb-3">See all 5 dimensions with detailed notes</p>
                        <Link href="/pro" className="inline-block px-4 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors">
                          Upgrade to Pro
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 mb-8 text-center text-slate-400">
            <p className="text-lg mb-1">Select a broker above to see their safety score</p>
            <p className="text-sm">{scores.length} brokers with health scores available</p>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-extrabold">Safety Leaderboard</h2>
            <p className="text-xs text-slate-500">All brokers ranked by overall health score</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Broker</th>
                  <th className="text-center px-3 py-3 font-semibold text-slate-600">Score</th>
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 hidden sm:table-cell">AFSL</th>
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 hidden md:table-cell">Regulatory</th>
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 hidden md:table-cell">Stability</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const broker = brokers.find((b) => b.slug === s.broker_slug);
                  return (
                    <tr
                      key={s.broker_slug}
                      className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${
                        s.broker_slug === selectedSlug ? "bg-green-50/50" : ""
                      }`}
                      onClick={() => {
                        setSelectedSlug(s.broker_slug);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <td className="px-4 py-3 font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{broker?.name || s.broker_slug}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          s.overall_score >= 80 ? "bg-green-100 text-green-700" :
                          s.overall_score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        }`}>
                          {s.overall_score}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-500 hidden sm:table-cell">{s.afsl_number || "—"}</td>
                      <td className="px-3 py-3 text-center text-xs hidden md:table-cell">{s.regulatory_score}</td>
                      <td className="px-3 py-3 text-center text-xs hidden md:table-cell">{s.financial_stability_score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Methodology</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Health scores are based on publicly available information including AFSL status, corporate structure,
            client money handling practices, CHESS sponsorship, financial reporting, platform uptime data,
            and insurance coverage. Scores are weighted: Regulatory (25%), Client Money (25%),
            Financial Stability (20%), Platform Reliability (15%), Insurance (15%). Scores are reviewed
            quarterly by our editorial team. This is for informational purposes only and does not constitute financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
