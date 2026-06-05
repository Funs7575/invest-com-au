"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import AdminShell from "@/components/AdminShell";

type Period = "7d" | "30d" | "90d" | "all";

export default function EmailPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  // Metrics
  const [totalCaptures, setTotalCaptures] = useState(0);
  const [totalQuiz, setTotalQuiz] = useState(0);
  const [totalFeeAlerts, setTotalFeeAlerts] = useState(0);
  const [bounced, setBounced] = useState(0);
  const [unsubscribed, setUnsubscribed] = useState(0);
  const [dripsSent, setDripsSent] = useState(0);
  const [capturesBySource, setCapturesBySource] = useState<[string, number][]>([]);
  const [capturesByUtm, setCapturesByUtm] = useState<[string, number][]>([]);
  const [dailyCaptures, setDailyCaptures] = useState<[string, number][]>([]);
  const [dripByTemplate, setDripByTemplate] = useState<[string, number][]>([]);
  const [recentBounces, setRecentBounces] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/email-performance?period=${period}`);
      if (!res.ok) throw new Error(`email-performance ${res.status}`);
      const data = await res.json();
      setTotalCaptures(data.totalCaptures || 0);
      setTotalQuiz(data.totalQuiz || 0);
      setTotalFeeAlerts(data.totalFeeAlerts || 0);
      setBounced(data.bounced || 0);
      setUnsubscribed(data.unsubscribed || 0);
      setDripsSent(data.dripsSent || 0);
      setCapturesBySource(data.capturesBySource || []);
      setCapturesByUtm(data.capturesByUtm || []);
      setDailyCaptures(data.dailyCaptures || []);
      setDripByTemplate(data.dripByTemplate || []);
      setRecentBounces(data.recentBounces || []);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const listHealth = useMemo(() => {
    const total = totalCaptures + totalQuiz;
    const healthPct = total > 0 ? Math.round(((total - bounced - unsubscribed) / total) * 100) : 100;
    return { total, healthy: total - bounced - unsubscribed, healthPct };
  }, [totalCaptures, totalQuiz, bounced, unsubscribed]);

  return (
    <AdminShell title="Email Performance" subtitle="Email list health, drip sequences, capture sources, and attribution">
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          <div className="flex gap-1.5 mb-5">
            {(["7d", "30d", "90d", "all"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${period === p ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{p === "all" ? "All time" : p}</button>
            ))}
          </div>

          {/* Top metrics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white col-span-2 md:col-span-1">
              <p className="text-[0.6rem] font-bold uppercase opacity-80">Total List</p>
              <p className="text-2xl font-extrabold">{listHealth.total.toLocaleString()}</p>
              <p className="text-[0.55rem] opacity-70">{listHealth.healthPct}% healthy</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Email Captures</p>
              <p className="text-2xl font-extrabold text-slate-900">{totalCaptures}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Quiz Leads</p>
              <p className="text-2xl font-extrabold text-slate-900">{totalQuiz}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Fee Alerts</p>
              <p className="text-2xl font-extrabold text-slate-900">{totalFeeAlerts}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Drips Sent</p>
              <p className="text-2xl font-extrabold text-slate-900">{dripsSent}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-red-400 uppercase">Bounced</p>
              <p className="text-2xl font-extrabold text-red-500">{bounced}</p>
              <p className="text-[0.55rem] text-slate-400">+ {unsubscribed} unsub</p>
            </div>
          </div>

          {/* Daily chart */}
          {dailyCaptures.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Daily Email Captures</h3>
              <div className="flex items-end gap-0.5 h-20">
                {dailyCaptures.map(([day, count]) => {
                  const max = Math.max(...dailyCaptures.map(d => d[1]));
                  const pct = max > 0 ? (count / max) * 100 : 0;
                  return (
                    <div key={day} className="flex-1 group relative">
                      <div className="bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-all" style={{ height: `${Math.max(2, pct)}%` }} />
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[0.5rem] rounded whitespace-nowrap z-10">{day}: {count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            {/* By source */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">By Source</h3>
              <div className="space-y-2">
                {capturesBySource.map(([src, count]) => (
                  <div key={src} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 truncate">{src}</span>
                    <span className="text-xs font-bold text-slate-900">{count}</span>
                  </div>
                ))}
                {capturesBySource.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No data</p>}
              </div>
            </div>

            {/* By UTM */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">By UTM Source</h3>
              <div className="space-y-2">
                {capturesByUtm.map(([utm, count]) => (
                  <div key={utm} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 truncate">{utm}</span>
                    <span className="text-xs font-bold text-slate-900">{count}</span>
                  </div>
                ))}
                {capturesByUtm.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No UTM data yet</p>}
              </div>
            </div>

            {/* Drip + bounces */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Drip Sequences</h3>
                <div className="space-y-2">
                  {dripByTemplate.map(([tpl, count]) => (
                    <div key={tpl} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 truncate">{tpl}</span>
                      <span className="text-xs font-bold text-slate-900">{count} sent</span>
                    </div>
                  ))}
                  {dripByTemplate.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No drips sent yet</p>}
                </div>
              </div>

              {recentBounces.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-red-700 mb-2">Recent Bounces</h3>
                  <div className="space-y-1">
                    {recentBounces.map((email, i) => (
                      <p key={i} className="text-xs text-red-600 truncate">{email}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* List health bar */}
          <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-2">List Health</h3>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${listHealth.healthPct}%` }} />
              {bounced > 0 && <div className="bg-red-400 h-full" style={{ width: `${(bounced / listHealth.total) * 100}%` }} />}
              {unsubscribed > 0 && <div className="bg-amber-400 h-full" style={{ width: `${(unsubscribed / listHealth.total) * 100}%` }} />}
            </div>
            <div className="flex gap-4 mt-2 text-[0.6rem] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy ({listHealth.healthy})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Bounced ({bounced})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Unsubscribed ({unsubscribed})</span>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
