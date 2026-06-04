"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdvisorTrustScore } from "@/lib/advisor-trust-score";

type TrustScoreResponse = {
  score: AdvisorTrustScore;
  cached_overall: number | null;
  cached_updated_at: string | null;
  cached_version: number;
};

const TIER_CONFIG = {
  trust_elite: { label: "Elite", color: "bg-violet-100 text-violet-800 border-violet-200", threshold: 85 },
  trust_pro:   { label: "Pro",   color: "bg-blue-100 text-blue-800 border-blue-200",     threshold: 70 },
  trust_growth:{ label: "Growth",color: "bg-emerald-100 text-emerald-800 border-emerald-200", threshold: 55 },
  trust_starter:{ label: "Starter", color: "bg-slate-100 text-slate-700 border-slate-200", threshold: 40 },
} as const;

function tierFor(score: number): keyof typeof TIER_CONFIG | null {
  if (score >= 85) return "trust_elite";
  if (score >= 70) return "trust_pro";
  if (score >= 55) return "trust_growth";
  if (score >= 40) return "trust_starter";
  return null;
}

function ScoreGauge({ value, size = 96 }: { value: number; size?: number }) {
  const radius = size * 0.43;
  const circumference = 2 * Math.PI * radius;
  const pct = value / 100;
  const dashOffset = circumference * (1 - pct);
  const stroke = value >= 70 ? "#7c3aed" : value >= 50 ? "#0ea5e9" : "#94a3b8";
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={size * 0.09} />
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none" stroke={stroke}
        strokeWidth={size * 0.09} strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize={size * 0.24} fontWeight="800" fill="#1e293b">
        {value}
      </text>
      <text x={cx} y={cy + size * 0.14} textAnchor="middle" fontSize={size * 0.11} fill="#94a3b8">
        /100
      </text>
    </svg>
  );
}

function DimensionBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-semibold text-slate-800">{score}/100</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${score}%`, transition: "width 0.5s ease" }}
          />
        </div>
        <span className="text-[0.6rem] text-slate-400 w-10 text-right shrink-0">
          {Math.round(weight * 100)}% wt
        </span>
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdvisorTrustScoreCard() {
  const [data, setData] = useState<TrustScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/advisor-auth/trust-score")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TrustScoreResponse | null) => { if (d) setData(d); })
      .catch(() => { /* fail silently */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
        <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
        <div className="h-24 w-24 bg-slate-200 rounded-full mx-auto" />
      </div>
    );
  }

  if (!data) return null;

  const { score } = data;
  const tier = tierFor(score.overall);
  const tierCfg = tier ? TIER_CONFIG[tier] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Trust Score</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Factual credential composite —{" "}
            <Link href="/advisor/trust-score-methodology" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">
              see methodology
            </Link>
          </p>
        </div>
        {tierCfg && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${tierCfg.color}`}>
            {tierCfg.label}
          </span>
        )}
      </div>

      {/* Gauge + overall */}
      <div className="flex items-center gap-6">
        <ScoreGauge value={score.overall} size={96} />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-extrabold text-slate-900 leading-tight">{score.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {tierCfg
              ? `${tier === "trust_elite" ? "Maximum" : `Next tier at ${TIER_CONFIG[tier === "trust_starter" ? "trust_growth" : tier === "trust_growth" ? "trust_pro" : "trust_elite"].threshold}`} pts`
              : "Improve your profile to earn a tier badge"}
          </p>
          {data.cached_updated_at && (
            <p className="text-[0.65rem] text-slate-400 mt-2">
              Last updated {fmtDate(data.cached_updated_at)}
            </p>
          )}
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="space-y-2.5 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Breakdown</p>
        {score.dimensions.map((d) => (
          <DimensionBar key={d.key} label={d.label} score={d.score} weight={d.weight} />
        ))}
      </div>

      {/* Next-tier nudge */}
      {tier && tier !== "trust_elite" && (
        <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-xs text-violet-800">
          <span className="font-semibold">
            {tier === "trust_pro"
              ? "Elite tier:"
              : tier === "trust_growth"
              ? "Pro tier:"
              : "Growth tier:"}
          </span>{" "}
          {tier === "trust_pro"
            ? "Score 85+ — add fresh verification or gather more reviews."
            : tier === "trust_growth"
            ? "Score 70+ — complete your profile and add AFSL details."
            : "Score 55+ — add a bio, photo, qualifications, and your first review."}
        </div>
      )}
    </div>
  );
}
