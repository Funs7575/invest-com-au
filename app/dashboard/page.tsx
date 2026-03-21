"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type DashboardData = {
  summary: {
    events: { total: number; today: number; "7d": number; "30d": number };
    clicks: { total: number; today: number; "7d": number; "30d": number };
    emails: number;
    quiz_leads: number;
    advisor_leads: number;
    fee_alerts: number;
    reviews: number;
  };
  top_pages: { page: string; count: number }[];
  top_broker_clicks: { broker_name: string; broker_slug: string; count: number }[];
  top_events: { event_type: string; count: number }[];
  clicks_by_placement: { placement_type: string; count: number }[];
  daily_events: { day: string; count: number }[];
  daily_clicks: { day: string; count: number }[];
  device_breakdown: { device_type: string; count: number }[];
  generated_at: string;
};

function KPICard({ label, value, sub, icon, color }: { label: string; value: number | string; sub?: string; icon: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon name={icon} size={20} className="text-white" />
        </div>
        <div>
          <div className="text-2xl font-extrabold text-slate-900">{typeof value === "number" ? value.toLocaleString() : value}</div>
          <div className="text-xs text-slate-500">{label}</div>
          {sub && <div className="text-[0.6rem] text-slate-400">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function MiniBar({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-[0.62rem] text-slate-500 w-28 truncate shrink-0">{d.label}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[0.62rem] font-bold text-slate-700 w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function SparkChart({ data, color = "#8b5cf6" }: { data: { day: string; count: number }[]; color?: string }) {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-xs text-slate-400">No data</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 100 / data.length;

  return (
    <div className="h-20 flex items-end gap-[1px]">
      {data.map((d) => (
        <div
          key={d.day}
          className="rounded-t transition-all duration-300 hover:opacity-80 group relative"
          style={{ width: `${width}%`, height: `${(d.count / max) * 100}%`, backgroundColor: color, minHeight: d.count > 0 ? "2px" : "0" }}
          title={`${d.day}: ${d.count}`}
        >
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[0.55rem] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
            {d.day.slice(5)}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"7d" | "30d">("7d");

  useEffect(() => {
    fetch("/api/analytics-dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12">
        <div className="container-custom max-w-5xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-slate-200 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64 bg-slate-100 rounded-xl" />
              <div className="h-64 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center">
        <Icon name="alert-triangle" size={32} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-600 mb-4">{error || "No data available"}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Retry
          </button>
          <Link href="/admin" className="px-4 py-2 text-sm font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            Go to Admin
          </Link>
        </div>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="py-5 md:py-10">
      <div className="container-custom max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 md:mb-8">
          <div>
            <h1 className="text-xl md:text-3xl font-extrabold text-slate-900">Analytics</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Last updated: {new Date(data.generated_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            {(["7d", "30d"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {p === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6">
          <KPICard label="Events" value={s.events[period]} sub={`${s.events.today} today`} icon="activity" color="bg-violet-600" />
          <KPICard label="Affiliate Clicks" value={s.clicks[period]} sub={`${s.clicks.today} today`} icon="mouse-pointer" color="bg-amber-600" />
          <KPICard label="Email Captures" value={s.emails} icon="mail" color="bg-blue-600" />
          <KPICard label="Quiz Completions" value={s.quiz_leads} icon="target" color="bg-emerald-600" />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <div className="text-lg font-extrabold text-violet-700">{s.advisor_leads}</div>
            <div className="text-[0.6rem] text-slate-500">Advisor Leads</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <div className="text-lg font-extrabold text-slate-700">{s.fee_alerts}</div>
            <div className="text-[0.6rem] text-slate-500">Fee Alert Subs</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <div className="text-lg font-extrabold text-amber-600">{s.reviews}</div>
            <div className="text-[0.6rem] text-slate-500">User Reviews</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Daily Events */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Daily Events (30d)</h3>
            <SparkChart data={data.daily_events} color="#8b5cf6" />
            <div className="flex justify-between text-[0.55rem] text-slate-400 mt-1">
              <span>{data.daily_events[0]?.day.slice(5) || ""}</span>
              <span>{data.daily_events[data.daily_events.length - 1]?.day.slice(5) || ""}</span>
            </div>
          </div>

          {/* Daily Clicks */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Daily Clicks (30d)</h3>
            <SparkChart data={data.daily_clicks} color="#d97706" />
            <div className="flex justify-between text-[0.55rem] text-slate-400 mt-1">
              <span>{data.daily_clicks[0]?.day.slice(5) || ""}</span>
              <span>{data.daily_clicks[data.daily_clicks.length - 1]?.day.slice(5) || ""}</span>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Top Pages */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Top Pages (7d)</h3>
            {data.top_pages.length > 0 ? (
              <MiniBar
                data={data.top_pages.slice(0, 8).map((p) => ({ label: p.page || "/", value: Number(p.count) }))}
                maxVal={Number(data.top_pages[0]?.count || 1)}
              />
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No data yet</p>
            )}
          </div>

          {/* Top Broker Clicks */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Top Broker Clicks (7d)</h3>
            {data.top_broker_clicks.length > 0 ? (
              <MiniBar
                data={data.top_broker_clicks.slice(0, 8).map((b) => ({ label: b.broker_name, value: Number(b.count) }))}
                maxVal={Number(data.top_broker_clicks[0]?.count || 1)}
              />
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No clicks yet</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Event Types */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Event Types (7d)</h3>
            {data.top_events.length > 0 ? (
              <div className="space-y-1">
                {data.top_events.slice(0, 10).map((e) => (
                  <div key={e.event_type} className="flex items-center justify-between text-[0.62rem]">
                    <span className="text-slate-600 truncate">{e.event_type}</span>
                    <span className="font-bold text-slate-800 ml-2">{Number(e.count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No events yet</p>
            )}
          </div>

          {/* Click Placements */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Click Placements (7d)</h3>
            {data.clicks_by_placement.length > 0 ? (
              <div className="space-y-1">
                {data.clicks_by_placement.map((p) => (
                  <div key={p.placement_type} className="flex items-center justify-between text-[0.62rem]">
                    <span className="text-slate-600">{p.placement_type}</span>
                    <span className="font-bold text-slate-800">{Number(p.count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No data yet</p>
            )}
          </div>

          {/* Device Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Devices (7d)</h3>
            {data.device_breakdown.length > 0 ? (
              <div className="space-y-2">
                {data.device_breakdown.map((d) => {
                  const total = data.device_breakdown.reduce((sum, x) => sum + Number(x.count), 0);
                  const pct = total > 0 ? ((Number(d.count) / total) * 100).toFixed(0) : "0";
                  return (
                    <div key={d.device_type} className="flex items-center gap-2">
                      <Icon name={d.device_type === "mobile" ? "smartphone" : d.device_type === "tablet" ? "tablet" : "monitor"} size={14} className="text-slate-400" />
                      <span className="text-[0.62rem] text-slate-600 flex-1">{d.device_type}</span>
                      <span className="text-[0.62rem] font-bold text-slate-800">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No data yet</p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2">Full admin panel with more detailed analytics:</p>
          <Link href="/admin" className="text-xs font-semibold text-violet-600 hover:text-violet-800">
            Open Admin Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
