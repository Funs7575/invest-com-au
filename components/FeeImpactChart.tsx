"use client";

/**
 * FeeImpactChart — reusable animated SVG visualisation of the long-term
 * dollar "drag" two annual percentage fees impose on an investment balance.
 *
 * Pure SVG + requestAnimationFrame, no chart libraries. Matches the project's
 * SVG chart conventions (see components/charts/SVGLineChart.tsx): the chart
 * <svg> is aria-hidden and the comparison is exposed to assistive tech via an
 * aria-label summary plus a visually-hidden data-table fallback.
 *
 * The projection is a deliberately simple, self-contained compounding model:
 * each year the balance grows at `grossReturn`, then the annual fee is levied
 * on the (post-growth) balance. This is arithmetic on the caller's inputs,
 * surfaced as fact — same legal footing as lib/goals/project.ts. It is NOT
 * the per-trade brokerage model in lib/cost-scenarios.ts (different question),
 * so no helper there is reused.
 *
 * Compliance: educational arithmetic only, never financial advice.
 */

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface FeeImpactChartProps {
  /** Starting balance in dollars. */
  balance?: number;
  /** Lower annual fee as a decimal (0.001 = 0.10%). */
  rateA?: number;
  /** Higher annual fee as a decimal (0.003 = 0.30%). */
  rateB?: number;
  /** Projection horizon in whole years. */
  years?: number;
  /** Assumed gross annual return before fees, as a decimal (0.07 = 7%). */
  grossReturn?: number;
  /** Optional labels for each fee line. */
  labelA?: string;
  labelB?: string;
  className?: string;
}

interface YearPoint {
  year: number;
  /** Balance net of the lower fee. */
  balanceA: number;
  /** Balance net of the higher fee. */
  balanceB: number;
}

/**
 * Project a balance forward `years` years, growing at `grossReturn` then
 * deducting `feeRate` (as a decimal) on the grown balance each year.
 * Returns the balance at the end of every year, index 0 being year 1.
 */
export function projectFeeImpact(
  balance: number,
  feeRate: number,
  grossReturn: number,
  years: number,
): number[] {
  const out: number[] = [];
  let current = balance;
  for (let y = 0; y < years; y++) {
    const grown = current * (1 + grossReturn);
    current = grown * (1 - feeRate);
    out.push(current);
  }
  return out;
}

/** Build the year-by-year series comparing two fee rates. */
export function buildFeeImpactSeries(
  balance: number,
  rateA: number,
  rateB: number,
  grossReturn: number,
  years: number,
): YearPoint[] {
  const seriesA = projectFeeImpact(balance, rateA, grossReturn, years);
  const seriesB = projectFeeImpact(balance, rateB, grossReturn, years);
  const points: YearPoint[] = [];
  for (let i = 0; i < years; i++) {
    points.push({
      year: i + 1,
      balanceA: seriesA[i] ?? balance,
      balanceB: seriesB[i] ?? balance,
    });
  }
  return points;
}

const formatPct = (rate: number): string => {
  // 0.001 -> "0.10%". Trim to at most 2 dp, keep at least 2 for sub-1% rates.
  const pct = rate * 100;
  return `${pct.toFixed(pct < 1 ? 2 : 1)}%`;
};

export default function FeeImpactChart({
  balance = 50000,
  rateA = 0.001,
  rateB = 0.003,
  years = 10,
  grossReturn = 0.07,
  labelA,
  labelB,
  className = "",
}: FeeImpactChartProps) {
  // Guard against nonsensical inputs that would break the SVG geometry.
  const safeYears = Math.max(1, Math.round(years));
  const series = buildFeeImpactSeries(balance, rateA, rateB, grossReturn, safeYears);

  const finalA = series[series.length - 1]?.balanceA ?? balance;
  const finalB = series[series.length - 1]?.balanceB ?? balance;
  // Drag = how much the higher fee costs vs the lower fee at the horizon.
  const totalDrag = Math.max(0, finalA - finalB);

  const lowLabel = labelA ?? `${formatPct(rateA)} fee`;
  const highLabel = labelB ?? `${formatPct(rateB)} fee`;

  // Animation progress 0 -> 1. Starts at 1 (final state) when reduced motion
  // is preferred, so the chart renders complete with no animation.
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Defer setState out of the synchronous effect body to avoid cascading renders.
      rafRef.current = requestAnimationFrame(() => setProgress(1));
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    const duration = 1400;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      // Ease-out cubic, matching CountUp.tsx / FeeImpactClient's AnimatedNumber.
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [balance, rateA, rateB, grossReturn, safeYears]);

  // ── SVG geometry ──
  const width = 520;
  const height = 240;
  const padding = { top: 24, right: 16, bottom: 36, left: 64 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(finalA, finalB, balance, 1);
  const x = (i: number) =>
    padding.left + (safeYears === 1 ? chartWidth : (i / (safeYears - 1)) * chartWidth);
  const y = (v: number) =>
    padding.top + (1 - v / maxVal) * chartHeight;

  // Reveal the lines progressively from left to right.
  const revealCount = Math.max(2, Math.ceil(progress * series.length));
  const shown = series.slice(0, revealCount);

  const lineFor = (key: "balanceA" | "balanceB") =>
    shown.map((p, i) => `${x(i)},${y(p[key])}`).join(" ");

  // Shaded "drag" band between the two lines, up to the revealed point.
  const dragArea = [
    ...shown.map((p, i) => `${x(i)},${y(p.balanceA)}`),
    ...shown
      .map((p, i) => `${x(i)},${y(p.balanceB)}`)
      .reverse(),
  ].join(" ");

  const colorA = "#16a34a"; // emerald-600 — lower fee, more money kept
  const colorB = "#dc2626"; // red-600 — higher fee
  const ariaSummary =
    `Fee impact over ${safeYears} ${safeYears === 1 ? "year" : "years"}: ` +
    `starting from ${formatCurrency(balance)} growing at ${formatPct(grossReturn)} a year, ` +
    `a ${formatPct(rateA)} annual fee leaves ${formatCurrency(finalA)} while a ` +
    `${formatPct(rateB)} annual fee leaves ${formatCurrency(finalB)} — ` +
    `a difference of ${formatCurrency(totalDrag)}.`;

  const gridLines = 4;
  const gridSteps = Array.from({ length: gridLines + 1 }, (_, i) => {
    const val = (i / gridLines) * maxVal;
    return { val, gy: padding.top + (1 - i / gridLines) * chartHeight };
  });

  return (
    <figure
      className={`w-full ${className}`}
      role="group"
      aria-label={ariaSummary}
    >
      {/* Headline drag figure */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Cost of the higher fee
          </span>
          <div className="text-2xl md:text-3xl font-extrabold text-red-600 tracking-tight">
            {formatCurrency(totalDrag)}
            <span className="text-base font-bold text-slate-400">
              {" "}
              over {safeYears} {safeYears === 1 ? "yr" : "yrs"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-600" />
            {lowLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-600" />
            {highLabel}
          </span>
        </div>
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full"
        style={{ maxWidth: width }}
        aria-hidden="true"
      >
        {/* Grid + y-axis labels */}
        {gridSteps.map((g, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={g.gy}
              x2={padding.left + chartWidth}
              y2={g.gy}
              strokeWidth={1}
              strokeDasharray={i === 0 ? "0" : "4,4"}
              className="stroke-slate-200"
            />
            <text
              x={padding.left - 8}
              y={g.gy}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={10}
              className="fill-slate-400"
            >
              {formatCurrency(g.val)}
            </text>
          </g>
        ))}

        {/* Drag band */}
        {shown.length >= 2 && (
          <polygon points={dragArea} fill={colorB} opacity={0.08} />
        )}

        {/* Lower-fee line (more money kept) */}
        {shown.length >= 2 && (
          <polyline
            points={lineFor("balanceA")}
            fill="none"
            stroke={colorA}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Higher-fee line */}
        {shown.length >= 2 && (
          <polyline
            points={lineFor("balanceB")}
            fill="none"
            stroke={colorB}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* End-point markers + native tooltips, once fully revealed */}
        {progress >= 1 && (
          <>
            <g>
              <circle
                cx={x(series.length - 1)}
                cy={y(finalA)}
                r={4}
                fill="white"
                stroke={colorA}
                strokeWidth={2.5}
              />
              <title>{`${lowLabel}: ${formatCurrency(finalA)}`}</title>
            </g>
            <g>
              <circle
                cx={x(series.length - 1)}
                cy={y(finalB)}
                r={4}
                fill="white"
                stroke={colorB}
                strokeWidth={2.5}
              />
              <title>{`${highLabel}: ${formatCurrency(finalB)}`}</title>
            </g>
          </>
        )}

        {/* X-axis labels: first, middle, last year */}
        {[0, Math.floor((safeYears - 1) / 2), safeYears - 1]
          .filter((idx, i, arr) => arr.indexOf(idx) === i)
          .map((idx) => (
            <text
              key={idx}
              x={x(idx)}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-400"
            >
              {`Yr ${idx + 1}`}
            </text>
          ))}
      </svg>

      <figcaption className="text-xs text-slate-400 leading-relaxed mt-2">
        Assumes {formatCurrency(balance)} growing at {formatPct(grossReturn)} a
        year before fees, with each fee deducted annually. Illustrative only —
        not a forecast or financial advice.
      </figcaption>

      {/* Visually-hidden data-table fallback for screen readers. */}
      <table className="sr-only">
        <caption>{ariaSummary}</caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">{lowLabel} balance</th>
            <th scope="col">{highLabel} balance</th>
            <th scope="col">Difference</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.year}>
              <th scope="row">{p.year}</th>
              <td>{formatCurrency(p.balanceA)}</td>
              <td>{formatCurrency(p.balanceB)}</td>
              <td>{formatCurrency(Math.max(0, p.balanceA - p.balanceB))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
