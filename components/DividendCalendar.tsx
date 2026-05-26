"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Distribution {
  etfSlug: string;
  etfName: string;
  exDate: string;
  payDate: string | null;
  amountCents: number | null;
  frankingPct: number;
  distributionType: string;
}

interface KnownEtf {
  slug: string;
  name: string;
}

interface ApiResponse {
  distributions: Distribution[];
  knownEtfs: KnownEtf[];
  windowMonths: number;
  disclaimer: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(cents: number | null): string {
  if (cents === null) return "TBC";
  return `$${(cents / 100).toFixed(2)}`;
}

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000));
}

function urgencyClass(iso: string): string {
  const d = daysUntil(iso);
  if (d <= 7) return "text-red-700 bg-red-50 border-red-200";
  if (d <= 30) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

// ── Row ───────────────────────────────────────────────────────────────────────

function DistributionRow({ d }: { d: Distribution }) {
  const days = daysUntil(d.exDate);
  const urg = urgencyClass(d.exDate);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 flex-wrap">
      <div className="shrink-0">
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
          {d.etfSlug.toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{d.etfName}</p>
        <p className="text-xs text-slate-500">
          Ex-date: {formatDate(d.exDate)}
          {d.payDate && ` · Pay: ${formatDate(d.payDate)}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-900">{formatAmount(d.amountCents)} /unit</p>
        {d.frankingPct > 0 && (
          <p className="text-xs text-emerald-700">{d.frankingPct}% franked</p>
        )}
      </div>
      <div className={`text-xs font-medium px-2 py-1 rounded border ${urg} shrink-0`}>
        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DividendCalendar() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [knownEtfs, setKnownEtfs] = useState<KnownEtf[]>([]);
  const [months, setMonths] = useState(3);
  const [etfFilter, setEtfFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ months: String(months) });
      if (etfFilter) params.set("etf", etfFilter);
      const res = await fetch(`/api/dividend-calendar?${params}`);
      if (!res.ok) {
        setError("Could not load dividend calendar.");
        return;
      }
      const json = (await res.json()) as ApiResponse;
      setDistributions(json.distributions);
      setKnownEtfs(json.knownEtfs);
      setDisclaimer(json.disclaimer);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }, [months, etfFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">ETF Dividend Calendar</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Upcoming ETF ex-dates and distribution payments — own shares before the ex-date to receive the distribution.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Window</label>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value, 10))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
          >
            {[1, 3, 6, 12].map((m) => (
              <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">ETF</label>
          <select
            value={etfFilter}
            onChange={(e) => setEtfFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All ETFs</option>
            {knownEtfs.map((e) => (
              <option key={e.slug} value={e.slug}>{e.slug.toUpperCase()} — {e.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl bg-white">
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded" />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <p className="p-4 text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && distributions.length === 0 && (
          <p className="p-6 text-sm text-slate-500 text-center">
            No distributions scheduled in the next {months} month{months > 1 ? "s" : ""}.
          </p>
        )}

        {!loading && !error && distributions.length > 0 && (
          <div className="px-4 divide-y divide-slate-100">
            {distributions.map((d) => (
              <DistributionRow key={`${d.etfSlug}-${d.exDate}`} d={d} />
            ))}
          </div>
        )}

        {disclaimer && (
          <div className="px-4 py-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">{disclaimer}</p>
          </div>
        )}
      </div>
    </section>
  );
}
