"use client";

import { useState } from "react";

type LeadScoreBadgeProps = {
  score: number;
  signals?: Record<string, number>;
  tier?: string;
  compact?: boolean;
};

const SIGNAL_LABELS: Record<string, string> = {
  phone_provided: "Has phone number",
  has_phone: "Has phone number",
  message_length: "Detailed message",
  has_message: "Detailed message",
  quiz_completed: "Completed quiz",
  calculator_used: "Used calculator",
  specific_page: "Found via specific page",
  utm_source: "From marketing channel",
  utm: "From marketing channel",
  pages_visited: "Browsed multiple pages",
  qualification_data: "Has qualification data",
  qualification: "Has qualification data",
};

function getTierInfo(score: number) {
  if (score >= 70) {
    return {
      label: "Hot Lead",
      emoji: "\uD83D\uDD25",
      bg: "bg-emerald-600",
      textColor: "text-white",
      ringColor: "ring-emerald-300",
      tip: "Respond within 1 hour",
    };
  }
  if (score >= 40) {
    return {
      label: "Warm Lead",
      emoji: "\u2600\uFE0F",
      bg: "bg-amber-500",
      textColor: "text-white",
      ringColor: "ring-amber-300",
      tip: "Respond within 24 hours",
    };
  }
  return {
    label: "Cool Lead",
    emoji: "\u2139\uFE0F",
    bg: "bg-slate-400",
    textColor: "text-white",
    ringColor: "ring-slate-200",
    tip: "Follow up when convenient",
  };
}

export default function LeadScoreBadge({ score, signals, tier, compact = false }: LeadScoreBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const info = getTierInfo(score);

  return (
    <div className="inline-flex flex-col items-start">
      {/* Badge */}
      <button
        type="button"
        onClick={() => !compact && setExpanded((v) => !v)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold ${info.bg} ${info.textColor} ${!compact ? "cursor-pointer hover:ring-2 " + info.ringColor : "cursor-default"} transition-all`}
        title={`${info.label} (${score}/100) — ${info.tip}`}
      >
        <span>{info.emoji}</span>
        <span>{info.label}</span>
        <span className="opacity-80">{score}</span>
        {!compact && signals && Object.keys(signals).length > 0 && (
          <span className="ml-0.5 opacity-70">{expanded ? "\u25B2" : "\u25BC"}</span>
        )}
      </button>

      {/* Expandable signal breakdown */}
      {!compact && expanded && signals && Object.keys(signals).length > 0 && (
        <div className="mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-left z-10">
          <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Score Breakdown</div>
          <div className="space-y-1">
            {Object.entries(signals).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{SIGNAL_LABELS[key] || key.replace(/_/g, " ")}</span>
                <span className="font-bold text-slate-800">+{typeof value === "number" ? value : "✓"}</span>
              </div>
            ))}
          </div>
          {tier && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-[0.6rem] text-slate-500">
              Tier: <span className="font-semibold text-slate-700 capitalize">{tier}</span>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-slate-100 text-[0.6rem] text-amber-700 font-semibold">
            {info.tip}
          </div>
        </div>
      )}
    </div>
  );
}
