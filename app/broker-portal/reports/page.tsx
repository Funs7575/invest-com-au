"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCSV } from "@/lib/csv-export";
import type { CampaignDailyStats, Campaign } from "@/lib/types";

export default function ReportsPage() {
  const [stats, setStats] = useState<CampaignDailyStats[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!account) return;

      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

      const { data: s } = await supabase
        .from("campaign_daily_stats")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .gte("stat_date", since)
        .order("stat_date", { ascending: true });

      setStats((s || []) as CampaignDailyStats[]);

      const { data: c } = await supabase
        .from("campaigns")
        .select("id, name, status, inventory_type, total_spent_cents")
        .eq("broker_slug", account.broker_slug)
        .order("created_at", { ascending: false });

      setCampaigns((c || []) as Campaign[]);
      setLoading(false);
    };
    load();
  }, [days]);

  // Aggregate stats by date
  const dailyTotals = useMemo(() => {
    const map = new Map<string, { date: string; clicks: number; impressions: number; spend: number }>();
    for (const s of stats) {
      const existing = map.get(s.stat_date) || { date: s.stat_date, clicks: 0, impressions: 0, spend: 0 };
      existing.clicks += s.clicks;
      existing.impressions += s.impressions;
      existing.spend += s.spend_cents;
      map.set(s.stat_date, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [stats]);

  // Totals
  const totalClicks = stats.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = stats.reduce((s, r) => s + r.impressions, 0);
  const totalSpend = stats.reduce((s, r) => s + r.spend_cents, 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
  const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks / 100).toFixed(2) : "0";

  // SVG bar chart
  const maxClicks = Math.max(...dailyTotals.map((d) => d.clicks), 1);
  const chartWidth = 700;
  const chartHeight = 160;
  const barWidth = dailyTotals.length > 0 ? Math.max(4, (chartWidth - 40) / dailyTotals.length - 2) : 8;

  if (loading) {
    return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Campaign performance analytics</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                days === d ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => {
              const headers = ["Date", "Clicks", "Impressions", "Spend ($)"];
              const rows = dailyTotals.map((d) => [
                d.date,
                String(d.clicks),
                String(d.impressions),
                (d.spend / 100).toFixed(2),
              ]);
              downloadCSV(`report-${days}d.csv`, headers, rows);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Clicks", value: totalClicks.toLocaleString() },
          { label: "Impressions", value: totalImpressions.toLocaleString() },
          { label: "CTR", value: `${ctr}%` },
          { label: "Total Spend", value: `$${(totalSpend / 100).toFixed(2)}` },
          { label: "Avg CPC", value: `$${avgCpc}` },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{k.label}</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Click Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-4">Daily Clicks</h2>
        {dailyTotals.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} className="w-full max-w-[700px]">
              {/* Bars */}
              {dailyTotals.map((d, i) => {
                const barH = (d.clicks / maxClicks) * chartHeight;
                const x = 30 + i * (barWidth + 2);
                return (
                  <g key={d.date}>
                    <rect
                      x={x}
                      y={chartHeight - barH}
                      width={barWidth}
                      height={barH}
                      fill="#1e293b"
                      rx={2}
                    />
                    {/* Show label every few bars */}
                    {(i % Math.ceil(dailyTotals.length / 10) === 0) && (
                      <text
                        x={x + barWidth / 2}
                        y={chartHeight + 16}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#94a3b8"
                      >
                        {d.date.slice(5)}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Y-axis labels */}
              <text x={0} y={12} fontSize={10} fill="#94a3b8">{maxClicks}</text>
              <text x={0} y={chartHeight} fontSize={10} fill="#94a3b8">0</text>
            </svg>
          </div>
        )}
      </div>

      {/* Per-campaign breakdown */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Campaign Breakdown</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No campaigns.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Campaign</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Clicks</th>
                  <th className="px-5 py-3 text-right">Impressions</th>
                  <th className="px-5 py-3 text-right">Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => {
                  const campStats = stats.filter((s) => s.campaign_id === c.id);
                  const clicks = campStats.reduce((s, r) => s + r.clicks, 0);
                  const imps = campStats.reduce((s, r) => s + r.impressions, 0);
                  const spend = campStats.reduce((s, r) => s + r.spend_cents, 0);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-900">{c.name}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.inventory_type === "featured" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {c.inventory_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{c.status.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3 text-right">{clicks}</td>
                      <td className="px-5 py-3 text-right">{imps}</td>
                      <td className="px-5 py-3 text-right font-semibold">${(spend / 100).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
