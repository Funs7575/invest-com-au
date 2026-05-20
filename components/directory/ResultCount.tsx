"use client";

import type { ReactNode } from "react";
import Icon from "@/components/Icon";

/**
 * Canonical result-count display for directory pages.
 *
 * Two display modes:
 *
 *   1. Single-line: "{n} listings found"
 *   2. Pill mode: a row of stat pills — total + optional secondary
 *      facts ("84 FIRB-eligible", "6 SIV-complying"). Used on
 *      /invest hero where multiple counts add useful context.
 *
 * Single-line mode (the simpler case) is the default — pass
 * `pills={[...]}` to enable pill mode.
 *
 * Live region
 * -----------
 * The result count is wrapped in `aria-live="polite"` so screen
 * readers announce result-set changes when filters narrow. Avoid
 * `aria-live="assertive"` — filter changes shouldn't interrupt the
 * user's flow.
 */
export interface ResultPill {
  /** Tone — drives background + text colour. */
  tone: "neutral" | "live" | "info" | "good" | "warn";
  /** Numeric count rendered in bold. */
  count: number;
  /** Singular/plural label after the count. */
  label: string;
  /** Optional icon name. */
  icon?: string;
}

export interface ResultCountProps {
  /** Total result count — rendered as the primary number. */
  total: number;
  /** Singular/plural noun shown after the count when no pills supplied. */
  noun?: string;
  /** Optional stat pills row (overrides the single-line "{n} found" output). */
  pills?: ReadonlyArray<ResultPill>;
  className?: string;
  /** Optional trailing content (e.g. an inline "view all" link). */
  children?: ReactNode;
}

const PILL_TONES: Record<ResultPill["tone"], string> = {
  neutral: "bg-white border-slate-200 text-slate-700",
  live: "bg-white border-emerald-200 text-emerald-700",
  info: "bg-white border-blue-200 text-blue-700",
  good: "bg-white border-emerald-200 text-emerald-700",
  warn: "bg-white border-amber-200 text-amber-700",
};

export default function ResultCount({
  total,
  noun = "listings",
  pills,
  className = "",
  children,
}: ResultCountProps) {
  if (pills && pills.length > 0) {
    return (
      <div
        aria-live="polite"
        className={`flex items-center gap-2 flex-wrap ${className}`}
      >
        {pills.map((p, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-[0.65rem] md:text-xs font-semibold shadow-sm ${PILL_TONES[p.tone]}`}
          >
            {p.tone === "live" && !p.icon && (
              <span
                aria-hidden
                className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"
              />
            )}
            {p.icon && <Icon name={p.icon} size={11} aria-hidden />}
            <span className="font-bold">{p.count}</span> {p.label}
          </span>
        ))}
        {children}
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className={`text-sm text-slate-600 ${className}`}
    >
      <span className="font-bold text-slate-900">{total}</span> {noun}
      {total !== 1 ? "" : ""}
      {children}
    </div>
  );
}
