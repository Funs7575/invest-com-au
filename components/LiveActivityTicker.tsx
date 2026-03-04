"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface FeeChange {
  broker_name: string;
  broker_slug: string;
  field: string;
  old_value: string;
  new_value: string;
  changed_at: string;
}

interface PopularComparison {
  slugs: string;
  names: string[];
  count: number;
}

interface LiveActivityTickerProps {
  feeChanges?: FeeChange[];
  popularComparisons?: PopularComparison[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function formatFieldName(field: string): string {
  const map: Record<string, string> = {
    asx_fee: "ASX fee",
    asx_fee_value: "ASX fee",
    us_fee: "US fee",
    us_fee_value: "US fee",
    fx_rate: "FX rate",
    inactivity_fee: "inactivity fee",
    rating: "rating",
  };
  return map[field] || field.replace(/_/g, " ");
}

function FeeChangeItem({ change }: { change: FeeChange }) {
  const isDecrease =
    change.field.includes("fee") || change.field.includes("rate")
      ? parseFloat(change.new_value) < parseFloat(change.old_value)
      : false;
  const isIncrease =
    change.field.includes("fee") || change.field.includes("rate")
      ? parseFloat(change.new_value) > parseFloat(change.old_value)
      : false;

  return (
    <Link
      href={`/broker/${change.broker_slug}`}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group min-w-0"
    >
      <span
        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold ${
          isDecrease
            ? "bg-emerald-100 text-emerald-700"
            : isIncrease
            ? "bg-red-100 text-red-600"
            : "bg-blue-100 text-blue-600"
        }`}
      >
        {isDecrease ? "↓" : isIncrease ? "↑" : "→"}
      </span>
      <span className="flex-1 min-w-0 text-[0.72rem] leading-tight text-slate-700">
        <strong className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
          {change.broker_name}
        </strong>{" "}
        {isDecrease ? "dropped" : isIncrease ? "raised" : "changed"}{" "}
        {formatFieldName(change.field)}{" "}
        <span className="text-slate-400">
          {change.old_value} → {change.new_value}
        </span>
      </span>
      <span className="shrink-0 text-[0.6rem] text-slate-400">
        {timeAgo(change.changed_at)}
      </span>
    </Link>
  );
}

function ComparisonItem({ comparison }: { comparison: PopularComparison }) {
  return (
    <Link
      href={`/versus/${comparison.slugs}`}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group min-w-0"
    >
      <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[0.6rem] font-bold">
        ⚡
      </span>
      <span className="flex-1 min-w-0 text-[0.72rem] leading-tight text-slate-700">
        <strong className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
          {comparison.names[0]} vs {comparison.names[1]}
        </strong>
      </span>
      <span className="shrink-0 text-[0.6rem] text-slate-400 tabular-nums">
        {comparison.count} this week
      </span>
    </Link>
  );
}

export default function LiveActivityTicker({
  feeChanges = [],
  popularComparisons = [],
}: LiveActivityTickerProps) {
  const [activeTab, setActiveTab] = useState<"fees" | "popular">(
    feeChanges.length > 0 ? "fees" : "popular"
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-cycle between tabs every 8 seconds if both have data
  useEffect(() => {
    if (feeChanges.length === 0 || popularComparisons.length === 0) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev === "fees" ? "popular" : "fees"));
    }, 8000);
    return () => clearInterval(interval);
  }, [feeChanges.length, popularComparisons.length]);

  // Don't render if no data
  if (feeChanges.length === 0 && popularComparisons.length === 0) return null;

  const items = activeTab === "fees" ? feeChanges : popularComparisons;
  const hasMultipleTabs = feeChanges.length > 0 && popularComparisons.length > 0;

  return (
    <div ref={containerRef} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 md:px-4 md:pt-3 md:pb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[0.65rem] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Live
          </span>
        </div>
        {hasMultipleTabs && (
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("fees")}
              className={`px-2 py-0.5 text-[0.6rem] md:text-[0.65rem] font-medium rounded-full transition-colors ${
                activeTab === "fees"
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Fee Changes
            </button>
            <button
              onClick={() => setActiveTab("popular")}
              className={`px-2 py-0.5 text-[0.6rem] md:text-[0.65rem] font-medium rounded-full transition-colors ${
                activeTab === "popular"
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Trending
            </button>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-50">
        {activeTab === "fees"
          ? feeChanges.slice(0, 3).map((change, i) => (
              <FeeChangeItem key={`fee-${i}`} change={change} />
            ))
          : popularComparisons.slice(0, 3).map((comp, i) => (
              <ComparisonItem key={`comp-${i}`} comparison={comp} />
            ))}
      </div>

      {/* Footer link */}
      <div className="px-3 py-1.5 md:px-4 md:py-2 border-t border-slate-100 text-center">
        <Link
          href={activeTab === "fees" ? "/compare" : "/versus"}
          className="text-[0.6rem] md:text-[0.65rem] text-slate-400 hover:text-slate-600 transition-colors font-medium"
        >
          {activeTab === "fees" ? "View all fee changes →" : "Browse all comparisons →"}
        </Link>
      </div>
    </div>
  );
}
