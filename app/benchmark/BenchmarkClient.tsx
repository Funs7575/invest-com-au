"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Broker, BrokerBenchmark, BenchmarkDimension } from "@/lib/types";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { trackEvent } from "@/lib/tracking";
import Icon from "@/components/Icon";

const DIMENSIONS: { key: BenchmarkDimension; label: string; description: string }[] = [
  { key: "asxFees", label: "ASX Fees", description: "Lower ASX brokerage = higher percentile" },
  { key: "usFees", label: "US Fees", description: "Lower US trading fees = higher percentile" },
  { key: "fxRate", label: "FX Rate", description: "Lower currency conversion markup = higher percentile" },
  { key: "platformRating", label: "Platform Rating", description: "Higher editorial rating = higher percentile" },
  { key: "features", label: "Features", description: "CHESS, SMSF, payment methods, and platform breadth" },
  { key: "costStability", label: "Cost Stability", description: "Fewer fee changes = higher percentile" },
];

function computeBenchmarks(brokers: Broker[]): BrokerBenchmark[] {
  const n = brokers.length;
  if (n === 0) return [];

  // Extract raw values for ranking
  const asxVals = brokers.map((b) => b.asx_fee_value ?? 999);
  const usVals = brokers.map((b) => (b.us_fee_value != null && b.us_fee_value < 900 ? b.us_fee_value : 999));
  const fxVals = brokers.map((b) => b.fx_rate ?? 99);
  const ratingVals = brokers.map((b) => b.rating ?? 0);
  const featureVals = brokers.map((b) => {
    let score = 0;
    if (b.chess_sponsored) score += 3;
    if (b.smsf_support) score += 2;
    if (b.payment_methods) score += Math.min(b.payment_methods.length, 3);
    if (b.platforms) score += Math.min(b.platforms.length, 3);
    if (b.markets && b.markets.length > 2) score += 2;
    return score;
  });

  // Cost stability: fewer fee_changelog entries = more stable
  const stabilityVals = brokers.map((b) => {
    const changes = b.fee_changelog?.length ?? 0;
    return Math.max(0, 10 - changes); // higher = more stable
  });

  // Rank function (ascending: lower value = better rank for fees; descending: higher value = better rank for ratings/features)
  function rank(vals: number[], ascending: boolean): number[] {
    const sorted = [...vals].sort((a, b) => (ascending ? a - b : b - a));
    return vals.map((v) => sorted.indexOf(v) + 1);
  }

  const asxRanks = rank(asxVals, true);
  const usRanks = rank(usVals, true);
  const fxRanks = rank(fxVals, true);
  const ratingRanks = rank(ratingVals, false);
  const featureRanks = rank(featureVals, false);
  const stabilityRanks = rank(stabilityVals, false);

  return brokers.map((b, i) => {
    const ranks: Record<BenchmarkDimension, number> = {
      asxFees: asxRanks[i],
      usFees: usRanks[i],
      fxRate: fxRanks[i],
      platformRating: ratingRanks[i],
      features: featureRanks[i],
      costStability: stabilityRanks[i],
    };
    const percentiles: Record<BenchmarkDimension, number> = {
      asxFees: Math.round(((n - asxRanks[i]) / (n - 1)) * 100),
      usFees: Math.round(((n - usRanks[i]) / (n - 1)) * 100),
      fxRate: Math.round(((n - fxRanks[i]) / (n - 1)) * 100),
      platformRating: Math.round(((n - ratingRanks[i]) / (n - 1)) * 100),
      features: Math.round(((n - featureRanks[i]) / (n - 1)) * 100),
      costStability: Math.round(((n - stabilityRanks[i]) / (n - 1)) * 100),
    };
    const overallPercentile = Math.round(
      Object.values(percentiles).reduce((s, v) => s + v, 0) / 6
    );
    return {
      slug: b.slug,
      name: b.name,
      color: b.color,
      icon: b.icon,
      percentiles,
      ranks,
      overallPercentile,
    };
  });
}

// SVG radar chart
function RadarChart({
  benchmark,
  compareBenchmark,
}: {
  benchmark: BrokerBenchmark;
  compareBenchmark?: BrokerBenchmark | null;
}) {
  const cx = 150;
  const cy = 150;
  const R = 120;
  const levels = [20, 40, 60, 80, 100];

  const angleStep = (2 * Math.PI) / 6;
  const startAngle = -Math.PI / 2; // Start at top

  function point(dimIndex: number, value: number): [number, number] {
    const angle = startAngle + dimIndex * angleStep;
    const r = (value / 100) * R;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function polygonPoints(values: number[]): string {
    return values.map((v, i) => point(i, v).join(",")).join(" ");
  }

  const dimValues = DIMENSIONS.map((d) => benchmark.percentiles[d.key]);
  const compareValues = compareBenchmark
    ? DIMENSIONS.map((d) => compareBenchmark.percentiles[d.key])
    : null;

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[340px] mx-auto">
      {/* Grid levels */}
      {levels.map((level) => (
        <polygon
          key={level}
          points={polygonPoints(DIMENSIONS.map(() => level))}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={0.5}
        />
      ))}
      {/* Axis lines */}
      {DIMENSIONS.map((_, i) => {
        const [ex, ey] = point(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={ex}
            y2={ey}
            stroke="#e2e8f0"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Compare polygon */}
      {compareValues && (
        <polygon
          points={polygonPoints(compareValues)}
          fill={`${compareBenchmark!.color}15`}
          stroke={compareBenchmark!.color}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.7}
        />
      )}
      {/* Main polygon */}
      <polygon
        points={polygonPoints(dimValues)}
        fill={`${benchmark.color}20`}
        stroke={benchmark.color}
        strokeWidth={2}
      />
      {/* Dots */}
      {dimValues.map((v, i) => {
        const [px, py] = point(i, v);
        return (
          <circle
            key={i}
            cx={px}
            cy={py}
            r={4}
            fill={benchmark.color}
            stroke="white"
            strokeWidth={2}
          />
        );
      })}
      {/* Labels */}
      {DIMENSIONS.map((d, i) => {
        const [lx, ly] = point(i, 118);
        const textAnchor =
          Math.abs(lx - cx) < 5 ? "middle" : lx > cx ? "start" : "end";
        return (
          <text
            key={d.key}
            x={lx}
            y={ly}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            className="text-[8px] font-semibold fill-slate-500"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

function PercentileBar({
  value,
  color,
  label,
  rank,
  total,
}: {
  value: number;
  color: string;
  label: string;
  rank: number;
  total: number;
}) {
  const barColor =
    value >= 70 ? "bg-green-500" : value >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          #{rank}/{total} · {value}th %ile
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function BenchmarkClient({ brokers }: { brokers: Broker[] }) {
  const { isPro, loading: authLoading } = useSubscription();
  const [selectedSlug, setSelectedSlug] = useState("");
  const [compareSlug, setCompareSlug] = useState("");

  const benchmarks = useMemo(() => computeBenchmarks(brokers), [brokers]);

  const selected = benchmarks.find((b) => b.slug === selectedSlug) || null;
  const compare = benchmarks.find((b) => b.slug === compareSlug) || null;
  const sorted = useMemo(
    () => [...benchmarks].sort((a, b) => b.overallPercentile - a.overallPercentile),
    [benchmarks]
  );

  // Track benchmark view
  const handleSelect = (slug: string) => {
    setSelectedSlug(slug);
    if (slug) {
      trackEvent("benchmark_select", { broker: slug }, "/benchmark");
    }
  };

  return (
    <div className="py-12">
      <div className="container-custom max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand">Fee Benchmarking</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
          Fee Benchmarking Dashboard
        </h1>
        <p className="text-slate-600 mb-8">
          See where your broker ranks on every fee dimension. Visual radar chart
          with percentile rankings across {brokers.length} Australian brokers.
        </p>

        {/* Broker selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Select Broker
            </label>
            <select
              value={selectedSlug}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
            >
              <option value="">Choose a broker...</option>
              {brokers.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Compare With{" "}
              {!isPro && !authLoading && (
                <span className="text-xs text-amber-600 font-normal">(Pro)</span>
              )}
            </label>
            {isPro ? (
              <select
                value={compareSlug}
                onChange={(e) => setCompareSlug(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
              >
                <option value="">None</option>
                {brokers
                  .filter((b) => b.slug !== selectedSlug)
                  .map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
              </select>
            ) : (
              <div className="relative">
                <select
                  disabled
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm opacity-50 cursor-not-allowed"
                >
                  <option>Upgrade to Pro to compare</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Radar Chart + Overall Score */}
        {selected ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Radar */}
              <div className="flex-1 w-full">
                <RadarChart benchmark={selected} compareBenchmark={compare} />
                {compare && (
                  <div className="flex justify-center gap-6 mt-2 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: selected.color }}
                      />
                      {selected.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border-2"
                        style={{
                          borderColor: compare.color,
                          background: `${compare.color}30`,
                        }}
                      />
                      {compare.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Overall score */}
              <div className="text-center md:w-48">
                <div className="relative w-32 h-32 mx-auto">
                  <svg viewBox="0 0 120 120" className="w-full h-full">
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke={
                        selected.overallPercentile >= 70
                          ? "#22c55e"
                          : selected.overallPercentile >= 40
                          ? "#f59e0b"
                          : "#ef4444"
                      }
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(selected.overallPercentile / 100) * 327} 327`}
                      transform="rotate(-90 60 60)"
                      className="transition-all duration-700"
                    />
                    <text
                      x="60"
                      y="55"
                      textAnchor="middle"
                      className="text-2xl font-extrabold fill-slate-900"
                    >
                      {selected.overallPercentile}
                    </text>
                    <text
                      x="60"
                      y="73"
                      textAnchor="middle"
                      className="text-[9px] font-medium fill-slate-400"
                    >
                      percentile
                    </text>
                  </svg>
                </div>
                <p className="text-sm font-bold text-slate-700 mt-2">
                  {selected.name}
                </p>
                <p className="text-xs text-slate-500">
                  Overall Ranking: #{sorted.findIndex((b) => b.slug === selected.slug) + 1} of{" "}
                  {sorted.length}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 mb-8 text-center text-slate-400">
            <Icon name="bar-chart-3" size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-1">Select a broker to see their radar chart</p>
            <p className="text-sm">
              Choose from {brokers.length} Australian brokers above
            </p>
          </div>
        )}

        {/* Dimension Breakdown */}
        {selected && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-extrabold mb-4">Dimension Breakdown</h2>
            {isPro || authLoading ? (
              <div className="space-y-4">
                {DIMENSIONS.map((d) => (
                  <PercentileBar
                    key={d.key}
                    value={selected.percentiles[d.key]}
                    color={selected.color}
                    label={d.label}
                    rank={selected.ranks[d.key]}
                    total={brokers.length}
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-4">
                  {DIMENSIONS.slice(0, 2).map((d) => (
                    <PercentileBar
                      key={d.key}
                      value={selected.percentiles[d.key]}
                      color={selected.color}
                      label={d.label}
                      rank={selected.ranks[d.key]}
                      total={brokers.length}
                    />
                  ))}
                </div>
                <div className="relative">
                  <div className="space-y-4 blur-sm pointer-events-none select-none">
                    {DIMENSIONS.slice(2).map((d) => (
                      <PercentileBar
                        key={d.key}
                        value={selected.percentiles[d.key]}
                        color={selected.color}
                        label={d.label}
                        rank={selected.ranks[d.key]}
                        total={brokers.length}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/90 border border-slate-200 rounded-xl p-5 text-center shadow-lg">
                      <p className="text-sm font-bold text-slate-900 mb-1">
                        Unlock Full Breakdown
                      </p>
                      <p className="text-xs text-slate-500 mb-3">
                        See all 6 dimensions with detailed rankings
                      </p>
                      <Link
                        href="/pro"
                        className="inline-block px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Upgrade to Pro
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-extrabold">Overall Leaderboard</h2>
            <p className="text-xs text-slate-500">
              Ranked by average percentile across all 6 dimensions
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Broker
                  </th>
                  <th className="text-center px-3 py-3 font-semibold text-slate-600">
                    Overall
                  </th>
                  {DIMENSIONS.map((d) => (
                    <th
                      key={d.key}
                      className="text-center px-3 py-3 font-semibold text-slate-600 hidden md:table-cell"
                    >
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((b, i) => (
                  <tr
                    key={b.slug}
                    className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${
                      b.slug === selectedSlug ? "bg-green-50/50" : ""
                    }`}
                    onClick={() => handleSelect(b.slug)}
                  >
                    <td className="px-4 py-3 font-bold text-slate-400">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-[0.55rem] font-bold shrink-0"
                          style={{
                            background: `${b.color}20`,
                            color: b.color,
                          }}
                        >
                          {b.icon || b.name.charAt(0)}
                        </div>
                        <span className="font-medium">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          b.overallPercentile >= 70
                            ? "bg-green-100 text-green-700"
                            : b.overallPercentile >= 40
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {b.overallPercentile}
                      </span>
                    </td>
                    {DIMENSIONS.map((d) => (
                      <td
                        key={d.key}
                        className="px-3 py-3 text-center text-xs text-slate-500 hidden md:table-cell"
                      >
                        {b.percentiles[d.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2">
            Methodology
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Percentile rankings are computed by ranking all {brokers.length}{" "}
            non-crypto Australian brokers on each dimension. For fee dimensions
            (ASX, US, FX), lower is better. For quality dimensions (rating,
            features, stability), higher is better. The overall score is the
            simple average of all 6 dimension percentiles. Data is sourced from
            official broker fee schedules and verified by our editorial team.
          </p>
        </div>
      </div>
    </div>
  );
}
