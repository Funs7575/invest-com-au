"use client";

import { useState } from "react";
import { formatWeight, type OverlapResult } from "@/lib/etf-overlap";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiResponse extends OverlapResult {
  etfA: { slug: string; name: string; holdingsSeeded: number };
  etfB: { slug: string; name: string; holdingsSeeded: number };
  disclaimer: string;
}

// ── Known ETFs (matches migration seed data) ──────────────────────────────────

const KNOWN_ETFS = [
  { slug: "vas", name: "VAS — Vanguard Australian Shares Index" },
  { slug: "ioz", name: "IOZ — iShares Core S&P/ASX 200" },
  { slug: "vhy", name: "VHY — Vanguard Australian Shares High Yield" },
  { slug: "vgs", name: "VGS — Vanguard MSCI International Shares" },
  { slug: "ndq", name: "NDQ — BetaShares NASDAQ 100" },
  { slug: "ivv", name: "IVV — iShares S&P 500" },
];

// ── Overlap bar ───────────────────────────────────────────────────────────────

function OverlapBar({ pct }: { pct: number }) {
  const color = pct >= 60 ? "#dc2626" : pct >= 30 ? "#d97706" : "#16a34a";
  const label = pct >= 60 ? "High" : pct >= 30 ? "Moderate" : "Low";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium" style={{ color }}>
        <span>{label} overlap</span>
        <span>{pct}%</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EtfOverlapDetector() {
  const [etfA, setEtfA] = useState("vgs");
  const [etfB, setEtfB] = useState("ndq");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyse() {
    if (etfA === etfB) {
      setError("Please select two different ETFs.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/etf-overlap?a=${etfA}&b=${etfB}`);
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "Failed to analyse overlap.");
      } else {
        setResult(json);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">ETF Overlap Detector</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          See how much your ETFs overlap — high overlap means unintentional concentration in the same companies.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">ETF A</label>
          <select
            value={etfA}
            onChange={(e) => setEtfA(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
          >
            {KNOWN_ETFS.map((e) => (
              <option key={e.slug} value={e.slug}>{e.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">ETF B</label>
          <select
            value={etfB}
            onChange={(e) => setEtfB(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
          >
            {KNOWN_ETFS.map((e) => (
              <option key={e.slug} value={e.slug}>{e.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={analyse}
          disabled={loading}
          className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg disabled:opacity-50 shrink-0"
        >
          {loading ? "Analysing…" : "Analyse"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
          {/* Summary */}
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-1 text-xs text-slate-500">
              <span className="font-medium text-slate-800">{result.etfA.name}</span>
              <span>vs</span>
              <span className="font-medium text-slate-800">{result.etfB.name}</span>
            </div>
            <OverlapBar pct={result.overlapPct} />
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{result.overlappingHoldings.length} securities</span> appear in both ETFs,
              representing <span className="font-semibold">{formatWeight(result.overlapBps)}</span> of shared exposure
              across the seeded holdings data.
            </p>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>Coverage — {result.etfA.slug.toUpperCase()}: {formatWeight(result.coveredWeightABps)} of fund</span>
              <span>Coverage — {result.etfB.slug.toUpperCase()}: {formatWeight(result.coveredWeightBBps)} of fund</span>
            </div>
          </div>

          {/* Holdings table */}
          {result.overlappingHoldings.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Overlapping holdings
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 text-left">
                      <th className="pb-2 font-medium">Security</th>
                      <th className="pb-2 font-medium text-right">{result.etfA.slug.toUpperCase()}</th>
                      <th className="pb-2 font-medium text-right">{result.etfB.slug.toUpperCase()}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {result.overlappingHoldings.map((h) => (
                      <tr key={h.ticker}>
                        <td className="py-2 pr-4">
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-2">{h.ticker}</span>
                          <span className="text-slate-600">{h.securityName}</span>
                        </td>
                        <td className="py-2 text-right text-slate-700 tabular-nums">{formatWeight(h.weightABps)}</td>
                        <td className="py-2 text-right text-slate-700 tabular-nums">{formatWeight(h.weightBBps)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.overlappingHoldings.length === 0 && (
            <div className="p-4 text-sm text-slate-500">
              No overlapping securities found in the seeded holdings data. These ETFs appear well-diversified relative to each other.
            </div>
          )}

          <div className="px-4 py-3">
            <p className="text-[11px] text-slate-400">{result.disclaimer}</p>
          </div>
        </div>
      )}
    </section>
  );
}
