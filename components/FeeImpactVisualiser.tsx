"use client";

import { useMemo, useState } from "react";

interface Props {
  initialAmount?: number;
  feeA?: number;
  feeB?: number;
  labelA?: string;
  labelB?: string;
  years?: number;
  annualReturn?: number;
}

function compoundGrowth(
  principal: number,
  annualReturn: number,
  feePercent: number,
  years: number,
): number[] {
  const points: number[] = [];
  let value = principal;
  const netRate = (annualReturn - feePercent) / 100;
  for (let y = 0; y <= years; y++) {
    points.push(value);
    value = value * (1 + netRate);
  }
  return points;
}

function formatAud(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

const W = 560;
const H = 220;
const PAD = { top: 16, right: 20, bottom: 32, left: 56 };

export default function FeeImpactVisualiser({
  initialAmount = 50_000,
  feeA = 0.1,
  feeB = 0.65,
  labelA = "Low-cost",
  labelB = "Average",
  years = 20,
  annualReturn = 7,
}: Props) {
  const [amount, setAmount] = useState(initialAmount);
  const [yrs, setYrs] = useState(years);

  const seriesA = useMemo(() => compoundGrowth(amount, annualReturn, feeA, yrs), [amount, annualReturn, feeA, yrs]);
  const seriesB = useMemo(() => compoundGrowth(amount, annualReturn, feeB, yrs), [amount, annualReturn, feeB, yrs]);

  const maxVal = Math.max(...seriesA, ...seriesB);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const toX = (i: number) => PAD.left + (i / yrs) * innerW;
  const toY = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  const pathFor = (series: number[]) =>
    series
      .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
      .join(" ");

  const endA = seriesA[yrs] ?? 0;
  const endB = seriesB[yrs] ?? 0;
  const gap = endA - endB;

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => (maxVal * i) / yTicks);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-1">Fee impact over time</h3>
      <p className="text-xs text-slate-500 mb-4">
        {feeA}% vs {feeB}% MER on {formatAud(amount)} at {annualReturn}% annual return
      </p>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600 mb-1 block">Starting amount</span>
          <select
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {[10_000, 25_000, 50_000, 100_000, 250_000, 500_000].map((v) => (
              <option key={v} value={v}>{formatAud(v)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600 mb-1 block">Time horizon</span>
          <select
            value={yrs}
            onChange={(e) => setYrs(Number(e.target.value))}
            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {[5, 10, 15, 20, 30].map((v) => (
              <option key={v} value={v}>{v} years</option>
            ))}
          </select>
        </label>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Fee impact chart: ${labelA} (${feeA}%) ends at ${formatAud(endA)}, ${labelB} (${feeB}%) ends at ${formatAud(endB)}, difference ${formatAud(gap)}`}
      >
        {/* Y-axis ticks */}
        {tickVals.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={toY(v)}
              x2={W - PAD.right}
              y2={toY(v)}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={toY(v) + 4}
              textAnchor="end"
              fontSize="9"
              fill="#94a3b8"
            >
              {formatAud(v)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {[0, Math.round(yrs / 2), yrs].map((y) => (
          <text
            key={y}
            x={toX(y)}
            y={H - 8}
            textAnchor="middle"
            fontSize="9"
            fill="#94a3b8"
          >
            {y === 0 ? "Today" : `Year ${y}`}
          </text>
        ))}

        {/* Area fill between lines */}
        <path
          d={`${pathFor(seriesA)} L ${toX(yrs).toFixed(1)} ${toY(endB).toFixed(1)} ${seriesB
            .slice()
            .reverse()
            .map((v, i) => `L ${toX(yrs - i).toFixed(1)} ${toY(v).toFixed(1)}`)
            .join(" ")} Z`}
          fill="#fef3c7"
          fillOpacity="0.6"
        />

        {/* Series B (higher fee) */}
        <path
          d={pathFor(seriesB)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="5 3"
          strokeLinecap="round"
        />

        {/* Series A (lower fee) */}
        <path
          d={pathFor(seriesA)}
          fill="none"
          stroke="#0f172a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* End labels */}
        <text
          x={toX(yrs) + 5}
          y={toY(endA) + 4}
          fontSize="10"
          fontWeight="700"
          fill="#0f172a"
        >
          {formatAud(endA)}
        </text>
        <text
          x={toX(yrs) + 5}
          y={toY(endB) + 4}
          fontSize="10"
          fill="#f59e0b"
          fontWeight="600"
        >
          {formatAud(endB)}
        </text>
      </svg>

      {/* Summary callout */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-200 flex items-center justify-center shrink-0 text-base">
          ⚠️
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">
            {formatAud(gap)} difference over {yrs} years
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            The {labelB.toLowerCase()} fee of {feeB}% costs you {formatAud(gap)} more than a {feeA}% option — money that stays invested compounds further.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-slate-900 block rounded-full" />
          {labelA} ({feeA}% MER)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-amber-400 block rounded-full border-dashed border border-amber-400" />
          {labelB} ({feeB}% MER)
        </div>
      </div>
    </div>
  );
}
