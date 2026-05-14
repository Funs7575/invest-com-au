"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface FunnelData {
  since: string;
  totals: Record<string, number>;
  routeCounts: Record<string, number>;
  intentCounts: Record<string, number>;
  sampleCount: number;
}

const FUNNEL_ORDER = [
  "started",
  "question_answered",
  "plan_shown",
  "cta_clicked",
  "plan_saved",
  "account_created",
  "brief_drafted",
  "brief_submitted",
  "risk_flagged",
];

export default function AdminGmFunnelPage() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/get-matched/funnel");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setData(json as FunnelData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <AdminShell title="Get Matched · Funnel" subtitle="Last 30 days.">
        <p className="text-sm text-slate-500">Loading…</p>
      </AdminShell>
    );
  }

  if (error || !data) {
    return (
      <AdminShell title="Get Matched · Funnel" subtitle="Last 30 days.">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error ?? "No data."}
        </div>
      </AdminShell>
    );
  }

  const maxTotal = Math.max(1, ...Object.values(data.totals));

  return (
    <AdminShell title="Get Matched · Funnel" subtitle="Last 30 days.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-4 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3">
            Funnel
          </h2>
          <ul className="space-y-2">
            {FUNNEL_ORDER.map((event) => {
              const count = data.totals[event] ?? 0;
              const width = Math.round((count / maxTotal) * 100);
              return (
                <li key={event} className="text-xs">
                  <div className="flex justify-between mb-0.5">
                    <span className="font-mono">{event}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-amber-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] text-slate-400 mt-3">
            Sample: {data.sampleCount} events since {new Date(data.since).toLocaleDateString()}
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3">
            Top routes
          </h2>
          <ul className="space-y-1.5 text-sm">
            {Object.entries(data.routeCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([route, count]) => (
                <li key={route} className="flex justify-between">
                  <span className="text-slate-700">{route}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
          </ul>

          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mt-5 mb-3">
            Top intents
          </h2>
          <ul className="space-y-1.5 text-sm">
            {Object.entries(data.intentCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([intent, count]) => (
                <li key={intent} className="flex justify-between">
                  <span className="text-slate-700 font-mono text-xs">{intent}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
