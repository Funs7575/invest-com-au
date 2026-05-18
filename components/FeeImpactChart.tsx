"use client";

import { useId, useMemo } from "react";

interface Props {
  /** Starting balance in dollars. */
  startingBalance: number;
  /** Annual return assumption as a percentage (e.g. 7 = 7%). */
  annualReturnPct: number;
  /** Years to project. */
  years: number;
  /** Pair of comparable annual fee rates as percentages (e.g. 0.1 and 0.3). */
  feeAPct: number;
  feeBPct: number;
  /** Labels for the two scenarios, shown in the legend. */
  feeALabel?: string;
  feeBLabel?: string;
  /** Optional className for outer wrapper. */
  className?: string;
}

// FIN_NOTEBOOK item 13 — animated fee-impact visualization.
//
// Renders two compound-growth lines (low-fee vs high-fee) for a balance
// over N years, in pure SVG with a CSS animation that draws each line
// over ~1s on first paint. No chart library; works inside MDX, inside
// listing pages, anywhere we already render server components.
//
// The component is intentionally not interactive (no tooltips, no
// crosshair) — the value is the asymmetry between the two lines, not
// per-point lookup. Trust signal that survives screenshots into
// Twitter/LinkedIn.
export default function FeeImpactChart({
  startingBalance,
  annualReturnPct,
  years,
  feeAPct,
  feeBPct,
  feeALabel = "Low fee",
  feeBLabel = "High fee",
  className = "",
}: Props) {
  const reactId = useId();
  const gradientId = `fee-chart-gradient-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const { pointsA, pointsB, finalA, finalB, gap, viewBoxW, viewBoxH, maxY } = useMemo(() => {
    const r = annualReturnPct / 100;
    const fA = feeAPct / 100;
    const fB = feeBPct / 100;
    const valuesA: number[] = [];
    const valuesB: number[] = [];
    let a = startingBalance;
    let b = startingBalance;
    for (let i = 0; i <= years; i++) {
      valuesA.push(a);
      valuesB.push(b);
      a = a * (1 + r - fA);
      b = b * (1 + r - fB);
    }
    const finalA = valuesA[valuesA.length - 1] ?? startingBalance;
    const finalB = valuesB[valuesB.length - 1] ?? startingBalance;
    const max = Math.max(...valuesA, ...valuesB);

    const W = 600;
    const H = 280;
    const padL = 8;
    const padR = 8;
    const padT = 16;
    const padB = 28;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const xFor = (i: number) => padL + (i / years) * innerW;
    const yFor = (v: number) => padT + innerH - (v / max) * innerH;

    const pointsA = valuesA.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
    const pointsB = valuesB.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");

    return {
      pointsA,
      pointsB,
      finalA,
      finalB,
      gap: finalA - finalB,
      viewBoxW: W,
      viewBoxH: H,
      maxY: max,
    };
  }, [startingBalance, annualReturnPct, years, feeAPct, feeBPct]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Math.abs(n));

  // Use a key derived from the inputs so re-renders restart the animation.
  const animationKey = `${startingBalance}-${annualReturnPct}-${years}-${feeAPct}-${feeBPct}`;

  return (
    <figure className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`} aria-label="Fee impact chart">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Compound impact over {years} years
          </p>
          <p className="text-lg font-bold text-slate-900">
            {fmt(gap)} extra at {feeAPct.toFixed(2)}% fee
          </p>
        </div>
        <p className="text-xs text-slate-500 text-right">
          Starting {fmt(startingBalance)} · {annualReturnPct}% pa return
        </p>
      </div>
      <svg
        viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Two compound-growth lines: ${feeALabel} ends at ${fmt(finalA)}, ${feeBLabel} ends at ${fmt(finalB)}.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid baseline */}
        <line x1="8" y1={viewBoxH - 28} x2={viewBoxW - 8} y2={viewBoxH - 28} stroke="#e2e8f0" strokeWidth="1" />

        {/* High-fee line (drawn first so low-fee overlays it) */}
        <polyline
          key={`b-${animationKey}`}
          points={pointsB}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="2000"
          strokeDashoffset="2000"
          style={{
            animation: "fee-line-draw 1.1s 0.15s ease-out forwards",
          }}
        />
        {/* Low-fee line + filled gap */}
        <polyline
          key={`a-${animationKey}`}
          points={pointsA}
          fill="none"
          stroke="#059669"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="2000"
          strokeDashoffset="2000"
          style={{
            animation: "fee-line-draw 1.4s 0.3s ease-out forwards",
          }}
        />

        {/* Year ticks (start, mid, end) */}
        <text x="8" y={viewBoxH - 8} fontSize="11" fill="#64748b">Year 0</text>
        <text x={viewBoxW / 2 - 12} y={viewBoxH - 8} fontSize="11" fill="#64748b">
          Year {Math.round(years / 2)}
        </text>
        <text x={viewBoxW - 56} y={viewBoxH - 8} fontSize="11" fill="#64748b" textAnchor="start">
          Year {years}
        </text>

        <style>{`
          @keyframes fee-line-draw {
            to { stroke-dashoffset: 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            polyline { animation: none !important; stroke-dashoffset: 0 !important; }
          }
        `}</style>
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-600" /> {feeALabel} ({feeAPct.toFixed(2)}%) →
          <strong>{fmt(finalA)}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-slate-400" /> {feeBLabel} ({feeBPct.toFixed(2)}%) →
          <strong>{fmt(finalB)}</strong>
        </span>
        <span className="text-slate-500">
          Max axis: {fmt(maxY)}
        </span>
      </figcaption>
    </figure>
  );
}
