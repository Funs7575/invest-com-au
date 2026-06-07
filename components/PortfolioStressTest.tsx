"use client";

import { useState } from "react";
import { ASSET_CLASS_LABELS, type AssetClass } from "@/lib/stress-scenarios";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StressResult {
  scenarioId: string;
  scenarioName: string;
  portfolioDrawdownPct: number;
  contributions: Array<{
    assetClass: string;
    allocationPct: number;
    scenarioDrawdownPct: number;
    contributionPct: number;
  }>;
}

interface ApiResponse {
  scenarios: Array<{ id: string; name: string; period: string; description: string }>;
  results: StressResult[];
  disclaimer: string;
}

// ── Allocation slider ─────────────────────────────────────────────────────────

const ASSET_CLASSES: AssetClass[] = ["au_equities", "intl_equities", "au_property", "bonds", "cash"];

type Allocation = Record<AssetClass, number>;

const DEFAULT_ALLOCATION: Allocation = {
  au_equities:   40,
  intl_equities: 30,
  au_property:   10,
  bonds:         15,
  cash:           5,
};

function AllocationSlider({
  assetClass,
  value,
  onChange,
  total,
}: {
  assetClass: AssetClass;
  value: number;
  onChange: (v: number) => void;
  total: number;
}) {
  const remaining = 100 - total;
  const maxAllowed = value + remaining;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <label className="font-medium text-slate-700">{ASSET_CLASS_LABELS[assetClass]}</label>
        <span className="font-semibold text-slate-900 tabular-nums w-10 text-right">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(value, maxAllowed)}
        step={5}
        value={value}
        onChange={(e) => onChange(Math.min(parseInt(e.target.value, 10), maxAllowed))}
        className="w-full h-2 accent-slate-900"
      />
    </div>
  );
}

// ── Scenario result card ──────────────────────────────────────────────────────

function ScenarioCard({
  result,
  meta,
}: {
  result: StressResult;
  meta: { name: string; period: string; description: string };
}) {
  const d = result.portfolioDrawdownPct;
  const color = d <= -25 ? "#dc2626" : d <= -10 ? "#d97706" : "#16a34a";
  const pctWidth = Math.min(100, Math.abs(d));

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{meta.name}</p>
          <p className="text-xs text-slate-400">{meta.period}</p>
        </div>
        <span
          className="text-base font-extrabold tabular-nums shrink-0"
          style={{ color }}
        >
          {d > 0 ? "+" : ""}{d.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pctWidth}%`, background: color }}
        />
      </div>
      <p className="text-xs text-slate-500">{meta.description}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PortfolioStressTest() {
  const [allocation, setAllocation] = useState<Allocation>(DEFAULT_ALLOCATION);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = ASSET_CLASSES.reduce((s, k) => s + allocation[k], 0);
  const unallocated = 100 - total;

  function setClass(key: AssetClass, value: number) {
    setAllocation((prev) => ({ ...prev, [key]: value }));
  }

  async function runTest() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/portfolio-stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allocation),
      });
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "Stress test failed.");
      } else {
        setResult(json);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Sort results worst-to-best drawdown.
  const sortedResults = result
    ? [...result.results].sort((a, b) => a.portfolioDrawdownPct - b.portfolioDrawdownPct)
    : [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Portfolio Stress Test</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Enter your approximate asset allocation and see estimated drawdowns across historical crises.
        </p>
      </div>

      <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
        <p className="text-xs font-medium text-slate-500">Your allocation (total: {total}%)</p>
        {ASSET_CLASSES.map((key) => (
          <AllocationSlider
            key={key}
            assetClass={key}
            value={allocation[key]}
            onChange={(v) => setClass(key, v)}
            total={total}
          />
        ))}
        {unallocated > 0 && (
          <p className="text-xs text-amber-600">{unallocated}% unallocated — treated as cash.</p>
        )}
        <button
          onClick={runTest}
          disabled={loading}
          aria-busy={loading}
          className="w-full py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          {loading ? "Running scenarios…" : "Run stress test"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Scenario results</p>
          {sortedResults.map((r) => {
            const meta = result.scenarios.find((s) => s.id === r.scenarioId);
            if (!meta) return null;
            return <ScenarioCard key={r.scenarioId} result={r} meta={meta} />;
          })}
          <p className="text-[11px] text-slate-400 leading-relaxed">{result.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
