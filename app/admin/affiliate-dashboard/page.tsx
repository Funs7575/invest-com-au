"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

type Period = "7d" | "30d" | "90d" | "all";

interface BrokerStats {
  broker_slug: string;
  broker_name: string;
  clicks: number;
  signups: number;
  revenue_cents: number;
  conversion_rate: number;
  epc_cents: number;
}

interface DailyPoint {
  date: string;
  clicks: number;
  signups: number;
  revenue_cents: number;
}

interface SignupRecord {
  id: number;
  broker_slug: string;
  click_id: string | null;
  signup_date: string;
  revenue_cents: number;
  status: string;
  source: string;
  external_ref: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
}

export default function AffiliateDashboardPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [tab, setTab] = useState<"overview" | "signups" | "monthly">("overview");
  const [clicks, setClicks] = useState<{ broker_slug: string; broker_name: string; created_at: string }[]>([]);
  const [signups, setSignups] = useState<SignupRecord[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<{ month: string; broker_slug: string; broker_name: string; total_clicks: number; total_signups: number; total_revenue_cents: number; conversion_rate: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const since = period === "all" ? "2020-01-01" : new Date(Date.now() - (period === "7d" ? 7 : period === "30d" ? 30 : 90) * 86400000).toISOString();

      const [clicksRes, signupsRes, reportsRes] = await Promise.all([
        supabase.from("affiliate_clicks").select("broker_slug, broker_name, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
        supabase.from("broker_signups").select("id, broker_slug, click_id, signup_date, revenue_cents, status, source, external_ref, utm_source, utm_campaign").gte("signup_date", since).order("signup_date", { ascending: false }),
        supabase.from("affiliate_monthly_reports").select("*").order("month", { ascending: false }).limit(50),
      ]);

      setClicks(clicksRes.data || []);
      setSignups(signupsRes.data || []);
      setMonthlyReports(reportsRes.data || []);
      setLoading(false);
    };
    load();
  }, [period]);

  // Aggregate by broker
  const brokerStats = useMemo((): BrokerStats[] => {
    const map = new Map<string, BrokerStats>();
    for (const c of clicks) {
      if (!map.has(c.broker_slug)) {
        map.set(c.broker_slug, { broker_slug: c.broker_slug, broker_name: c.broker_name || c.broker_slug, clicks: 0, signups: 0, revenue_cents: 0, conversion_rate: 0, epc_cents: 0 });
      }
      map.get(c.broker_slug)!.clicks++;
    }
    for (const s of signups) {
      if (!map.has(s.broker_slug)) {
        map.set(s.broker_slug, { broker_slug: s.broker_slug, broker_name: s.broker_slug, clicks: 0, signups: 0, revenue_cents: 0, conversion_rate: 0, epc_cents: 0 });
      }
      const stat = map.get(s.broker_slug)!;
      if (s.status !== "rejected") {
        stat.signups++;
        stat.revenue_cents += s.revenue_cents || 0;
      }
    }
    const result = Array.from(map.values());
    for (const r of result) {
      r.conversion_rate = r.clicks > 0 ? r.signups / r.clicks : 0;
      r.epc_cents = r.clicks > 0 ? r.revenue_cents / r.clicks : 0;
    }
    return result.sort((a, b) => b.clicks - a.clicks);
  }, [clicks, signups]);

  // Daily trend
  const dailyTrend = useMemo((): DailyPoint[] => {
    const map = new Map<string, DailyPoint>();
    for (const c of clicks) {
      const d = c.created_at.slice(0, 10);
      if (!map.has(d)) map.set(d, { date: d, clicks: 0, signups: 0, revenue_cents: 0 });
      map.get(d)!.clicks++;
    }
    for (const s of signups) {
      const d = s.signup_date.slice(0, 10);
      if (!map.has(d)) map.set(d, { date: d, clicks: 0, signups: 0, revenue_cents: 0 });
      const pt = map.get(d)!;
      pt.signups++;
      pt.revenue_cents += s.revenue_cents || 0;
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [clicks, signups]);

  const totalClicks = clicks.length;
  const totalSignups = signups.filter(s => s.status !== "rejected").length;
  const totalRevenue = signups.filter(s => s.status !== "rejected").reduce((s, r) => s + (r.revenue_cents || 0), 0);
  const overallCR = totalClicks > 0 ? (totalSignups / totalClicks * 100).toFixed(2) : "0.00";
  const overallEPC = totalClicks > 0 ? (totalRevenue / totalClicks / 100).toFixed(2) : "0.00";

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    paid: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Affiliate Performance</h1>
          <p className="text-sm text-slate-500">Track clicks → signups → revenue across all broker partners</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["7d", "30d", "90d", "all"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === p ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Clicks", value: totalClicks.toLocaleString(), icon: "mouse-pointer" },
          { label: "Signups", value: totalSignups.toLocaleString(), icon: "user-plus" },
          { label: "Revenue", value: fmt(totalRevenue), icon: "dollar-sign" },
          { label: "Conv. Rate", value: `${overallCR}%`, icon: "percent" },
          { label: "EPC", value: `$${overallEPC}`, icon: "trending-up" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={card.icon} size={16} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500">{card.label}</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">{loading ? "—" : card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["overview", "signups", "monthly"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "overview" ? "By Broker" : t === "signups" ? "All Signups" : "Monthly Reports"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}
        </div>
      ) : tab === "overview" ? (
        /* By Broker Table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Broker</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Clicks</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Signups</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Revenue</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Conv. Rate</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">EPC</th>
              </tr>
            </thead>
            <tbody>
              {brokerStats.map(b => (
                <tr key={b.broker_slug} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{b.broker_name}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{b.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{b.signups}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmt(b.revenue_cents)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{(b.conversion_rate * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmt(Math.round(b.epc_cents))}</td>
                </tr>
              ))}
              {brokerStats.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No affiliate data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : tab === "signups" ? (
        /* All Signups Table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Broker</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Campaign</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Revenue</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {signups.map(s => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{new Date(s.signup_date).toLocaleDateString("en-AU")}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{s.broker_slug}</td>
                  <td className="px-4 py-3 text-slate-600">{s.utm_source || s.source}</td>
                  <td className="px-4 py-3 text-slate-600">{s.utm_campaign || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmt(s.revenue_cents)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${STATUS_COLORS[s.status] || "bg-slate-100 text-slate-600"}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {signups.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No signups recorded yet. Set up postback URLs with your broker partners.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Monthly Reports */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Month</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Broker</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Clicks</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Signups</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Revenue</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReports.map(r => (
                <tr key={`${r.month}-${r.broker_slug}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.month}</td>
                  <td className="px-4 py-3 text-slate-700">{r.broker_name || r.broker_slug}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{r.total_clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{r.total_signups}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmt(r.total_revenue_cents)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{r.conversion_rate ? `${(r.conversion_rate * 100).toFixed(2)}%` : "—"}</td>
                </tr>
              ))}
              {monthlyReports.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Monthly reports will be generated on the 1st of each month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily Trend Chart (simple bar visualization) */}
      {tab === "overview" && dailyTrend.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Daily Click Trend</h3>
          <div className="flex items-end gap-[2px] h-24">
            {dailyTrend.slice(-30).map(d => {
              const maxClicks = Math.max(...dailyTrend.slice(-30).map(x => x.clicks), 1);
              const h = Math.max(4, (d.clicks / maxClicks) * 96);
              return (
                <div key={d.date} className="flex-1 group relative" title={`${d.date}: ${d.clicks} clicks, ${d.signups} signups`}>
                  <div className="bg-slate-800 hover:bg-slate-600 rounded-t transition-colors" style={{ height: `${h}px` }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[0.6rem] text-slate-400">{dailyTrend.slice(-30)[0]?.date}</span>
            <span className="text-[0.6rem] text-slate-400">{dailyTrend[dailyTrend.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}
