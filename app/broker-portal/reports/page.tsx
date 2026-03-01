"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCSV } from "@/lib/csv-export";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import type { CampaignDailyStats, Campaign } from "@/lib/types";

type DateMode = "preset" | "custom";

export default function ReportsPage() {
  const [stats, setStats] = useState<CampaignDailyStats[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [dateMode, setDateMode] = useState<DateMode>("preset");
  const [customFrom, setCustomFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [drillCampaignId, setDrillCampaignId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!account) return;

      const since = dateMode === "custom"
        ? customFrom
        : new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

      const until = dateMode === "custom" ? customTo : new Date().toISOString().slice(0, 10);

      const query = supabase
        .from("campaign_daily_stats")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .gte("stat_date", since)
        .lte("stat_date", until)
        .order("stat_date", { ascending: true });

      const { data: s } = await query;
      setStats((s || []) as CampaignDailyStats[]);

      const { data: c } = await supabase
        .from("campaigns")
        .select("id, name, status, inventory_type, total_spent_cents, placement_id")
        .eq("broker_slug", account.broker_slug)
        .order("created_at", { ascending: false });

      setCampaigns((c || []) as Campaign[]);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, dateMode, customFrom, customTo]);

  // Filtered stats based on drill-down
  const filteredStats = useMemo(() => {
    if (drillCampaignId === null) return stats;
    return stats.filter(s => s.campaign_id === drillCampaignId);
  }, [stats, drillCampaignId]);

  // Aggregate stats by date
  const dailyTotals = useMemo(() => {
    const map = new Map<string, { date: string; clicks: number; impressions: number; spend: number; conversions: number }>();
    for (const s of filteredStats) {
      const existing = map.get(s.stat_date) || { date: s.stat_date, clicks: 0, impressions: 0, spend: 0, conversions: 0 };
      existing.clicks += s.clicks;
      existing.impressions += s.impressions;
      existing.spend += s.spend_cents;
      existing.conversions += s.conversions;
      map.set(s.stat_date, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredStats]);

  // Totals
  const totalClicks = filteredStats.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = filteredStats.reduce((s, r) => s + r.impressions, 0);
  const totalSpend = filteredStats.reduce((s, r) => s + r.spend_cents, 0);
  const totalConversions = filteredStats.reduce((s, r) => s + r.conversions, 0);
  const ctrNum = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpcNum = totalClicks > 0 ? totalSpend / totalClicks / 100 : 0;
  const convRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  // Per-campaign breakdown with drill-down
  const campaignBreakdown = useMemo(() => {
    return campaigns.map(c => {
      const campStats = stats.filter(s => s.campaign_id === c.id);
      const clicks = campStats.reduce((s, r) => s + r.clicks, 0);
      const imps = campStats.reduce((s, r) => s + r.impressions, 0);
      const spend = campStats.reduce((s, r) => s + r.spend_cents, 0);
      const convs = campStats.reduce((s, r) => s + r.conversions, 0);
      const ctr = imps > 0 ? (clicks / imps) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks / 100 : 0;
      return { ...c, clicks, impressions: imps, spend, conversions: convs, ctr, cpc };
    }).filter(c => c.clicks > 0 || c.impressions > 0 || c.spend > 0)
      .sort((a, b) => b.spend - a.spend);
  }, [campaigns, stats]);

  // SVG bar chart
  const maxClicks = Math.max(...dailyTotals.map((d) => d.clicks), 1);
  const chartWidth = 700;
  const chartHeight = 160;
  const barWidth = dailyTotals.length > 0 ? Math.max(4, (chartWidth - 40) / dailyTotals.length - 2) : 8;

  const drillCampaign = drillCampaignId !== null ? campaigns.find(c => c.id === drillCampaignId) : null;

  if (loading) {
    return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Export reports, drill into individual campaigns, and compare date ranges.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date mode toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setDateMode("preset")}
              className={`px-3 py-2 min-h-[36px] text-[0.69rem] font-semibold rounded-md transition-colors ${
                dateMode === "preset" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Preset
            </button>
            <button
              onClick={() => setDateMode("custom")}
              className={`px-3 py-2 min-h-[36px] text-[0.69rem] font-semibold rounded-md transition-colors ${
                dateMode === "custom" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Custom
            </button>
          </div>

          {dateMode === "preset" ? (
            <div className="flex gap-1">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-2 min-h-[36px] text-xs font-semibold rounded-lg transition-colors ${
                    days === d ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2.5 py-2 min-h-[40px] text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2.5 py-2 min-h-[40px] text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              />
            </div>
          )}

          <button
            onClick={() => {
              const headers = ["Date", "Clicks", "Impressions", "Conversions", "Spend ($)", "CTR (%)", "Conv Rate (%)"];
              const rows = dailyTotals.map((d) => [
                d.date,
                String(d.clicks),
                String(d.impressions),
                String(d.conversions),
                (d.spend / 100).toFixed(2),
                d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : "0",
                d.clicks > 0 ? ((d.conversions / d.clicks) * 100).toFixed(2) : "0",
              ]);
              const label = dateMode === "custom" ? `${customFrom}_${customTo}` : `${days}d`;
              downloadCSV(`report-${label}.csv`, headers, rows);
            }}
            className="px-3 py-2 min-h-[36px] text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Drill-down indicator */}
      {drillCampaign && (
        <div className="bg-slate-900 text-white rounded-xl px-4 py-3 flex items-center justify-between bounce-in-up">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Drill-down:</span>
            <span className="text-sm font-bold">{drillCampaign.name}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              drillCampaign.inventory_type === "featured" ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"
            }`}>{drillCampaign.inventory_type}</span>
          </div>
          <button
            onClick={() => setDrillCampaignId(null)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Clear filter ×
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 portal-stagger">
        {[
          { label: "Clicks", value: totalClicks, icon: "mouse-pointer-click", iconBg: "bg-blue-50", iconColor: "text-blue-600", borderColor: "border-t-blue-500", tooltip: "" },
          { label: "Impressions", value: totalImpressions, icon: "eye", iconBg: "bg-purple-50", iconColor: "text-purple-600", borderColor: "border-t-purple-500", tooltip: "" },
          { label: "CTR", value: ctrNum, suffix: "%", decimals: 2, icon: "trending-up", iconBg: "bg-emerald-50", iconColor: "text-emerald-600", borderColor: "border-t-emerald-500", tooltip: "Click-Through Rate = Clicks / Impressions x 100. Measures how compelling your ad is to viewers." },
          { label: "Conversions", value: totalConversions, icon: "target", iconBg: "bg-emerald-50", iconColor: "text-emerald-600", borderColor: "border-t-emerald-500", tooltip: "" },
          { label: "Conv. Rate", value: convRate, suffix: "%", decimals: 2, icon: "bar-chart", iconBg: "bg-amber-50", iconColor: "text-amber-600", borderColor: "border-t-amber-500", tooltip: "Conversion Rate = Conversions / Clicks x 100. Measures how well clicks translate to desired actions." },
          { label: "Total Spend", value: totalSpend / 100, prefix: "$", decimals: 2, icon: "dollar-sign", iconBg: "bg-red-50", iconColor: "text-red-600", borderColor: "border-t-red-500", tooltip: "" },
          { label: "Avg CPC", value: avgCpcNum, prefix: "$", decimals: 2, icon: "coins", iconBg: "bg-slate-100", iconColor: "text-slate-600", borderColor: "border-t-slate-500", tooltip: "Average Cost Per Click = Total Spend / Total Clicks. Your effective price for each visitor." },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-xl border border-slate-200 border-t-2 ${kpi.borderColor} p-3 hover-lift`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className={`w-5 h-5 rounded-full ${kpi.iconBg} flex items-center justify-center`}>
                <Icon name={kpi.icon} size={10} className={kpi.iconColor} />
              </div>
              <p className="text-[0.62rem] text-slate-500 font-medium uppercase tracking-wide">{kpi.label}</p>
              {kpi.tooltip && <InfoTip text={kpi.tooltip} />}
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">
              <CountUp end={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} decimals={kpi.decimals} duration={1000} />
            </p>
          </div>
        ))}
      </div>

      {/* Click Chart with Spend Line Overlay */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">
            Daily Clicks {drillCampaign ? `— ${drillCampaign.name}` : ""}
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-800" /> Clicks</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded bg-amber-500" style={{ height: 2 }} /> Spend</span>
          </div>
        </div>
        {dailyTotals.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            {(() => {
              const maxSpend = Math.max(...dailyTotals.map(d => d.spend), 1);
              const spendLinePoints = dailyTotals.map((d, i) => {
                const x = 30 + i * (barWidth + 2) + barWidth / 2;
                const y = (1 - d.spend / maxSpend) * chartHeight;
                return `${x},${y}`;
              }).join(" ");
              return (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} className="w-full max-w-[700px]">
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
                          className="chart-bar-animate"
                          style={{ animationDelay: `${i * 0.03}s` }}
                        />
                        <title>{d.date}: {d.clicks} clicks, {d.conversions} conversions, ${(d.spend / 100).toFixed(2)} spent</title>
                        {(i % Math.ceil(dailyTotals.length / 10) === 0) && (
                          <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">
                            {d.date.slice(5)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  {/* Spend line overlay */}
                  <polyline
                    points={spendLinePoints}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.8}
                  />
                  {/* Spend dots */}
                  {dailyTotals.map((d, i) => {
                    const x = 30 + i * (barWidth + 2) + barWidth / 2;
                    const y = (1 - d.spend / maxSpend) * chartHeight;
                    return <circle key={`dot-${d.date}`} cx={x} cy={y} r={2.5} fill="#f59e0b" opacity={0.9} />;
                  })}
                  <text x={0} y={12} fontSize={10} fill="#94a3b8">{maxClicks}</text>
                  <text x={0} y={chartHeight} fontSize={10} fill="#94a3b8">0</text>
                  {/* Spend axis on right */}
                  <text x={chartWidth - 2} y={12} textAnchor="end" fontSize={10} fill="#f59e0b">${(maxSpend / 100).toFixed(0)}</text>
                </svg>
              );
            })()}
          </div>
        )}
      </div>

      {/* Per-campaign breakdown with drill-down */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Campaign Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click a campaign row to drill down into its daily data</p>
          </div>
          {drillCampaignId !== null && (
            <button
              onClick={() => setDrillCampaignId(null)}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Show all
            </button>
          )}
        </div>
        {campaignBreakdown.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No campaigns with data.</div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto portal-table-stagger">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-3 md:px-5 py-3 text-left">Campaign</th>
                    <th className="px-3 md:px-5 py-3 text-left">Type</th>
                    <th className="px-3 md:px-5 py-3 text-left">Status</th>
                    <th className="px-3 md:px-5 py-3 text-right">Clicks</th>
                    <th className="px-3 md:px-5 py-3 text-right">Impr.</th>
                    <th className="px-3 md:px-5 py-3 text-right">CTR</th>
                    <th className="px-3 md:px-5 py-3 text-right">Conv.</th>
                    <th className="px-3 md:px-5 py-3 text-right">Conv. Rate</th>
                    <th className="px-3 md:px-5 py-3 text-right">Avg CPC</th>
                    <th className="px-3 md:px-5 py-3 text-right">Spend</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-slate-100">
                {campaignBreakdown.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setDrillCampaignId(drillCampaignId === c.id ? null : c.id)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      drillCampaignId === c.id ? "bg-slate-900/5 ring-1 ring-inset ring-slate-200" : ""
                    }`}
                  >
                    <td className="px-3 md:px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {drillCampaignId === c.id && <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                        {c.name}
                      </span>
                    </td>
                    <td className="px-3 md:px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        c.inventory_type === "featured" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {c.inventory_type}
                      </span>
                    </td>
                    <td className="px-3 md:px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{c.status.replace(/_/g, " ")}</td>
                    <td className="px-3 md:px-5 py-3 text-right">{c.clicks}</td>
                    <td className="px-3 md:px-5 py-3 text-right">{c.impressions}</td>
                    <td className="px-3 md:px-5 py-3 text-right text-xs">{c.ctr.toFixed(2)}%</td>
                    <td className="px-3 md:px-5 py-3 text-right">{c.conversions}</td>
                    <td className="px-3 md:px-5 py-3 text-right text-xs">{c.clicks > 0 ? ((c.conversions / c.clicks) * 100).toFixed(2) : "0.00"}%</td>
                    <td className="px-3 md:px-5 py-3 text-right text-xs">${c.cpc.toFixed(2)}</td>
                    <td className="px-3 md:px-5 py-3 text-right font-semibold">${(c.spend / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {/* Scroll hint — fades right edge on mobile */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent lg:hidden" />
          </div>
        )}
      </div>

      {/* Daily detail table for drill-down */}
      {drillCampaignId !== null && dailyTotals.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">
              Daily Detail — {drillCampaign?.name}
            </h2>
            <button
              onClick={() => {
                const headers = ["Date", "Clicks", "Impressions", "Conversions", "Spend ($)"];
                const rows = dailyTotals.map(d => [
                  d.date,
                  String(d.clicks),
                  String(d.impressions),
                  String(d.conversions),
                  (d.spend / 100).toFixed(2),
                ]);
                downloadCSV(`campaign-${drillCampaignId}-detail.csv`, headers, rows);
              }}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-right">Clicks</th>
                  <th className="px-5 py-3 text-right">Impressions</th>
                  <th className="px-5 py-3 text-right">CTR</th>
                  <th className="px-5 py-3 text-right">Conversions</th>
                  <th className="px-5 py-3 text-right">Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyTotals.map(d => (
                  <tr key={d.date} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-slate-700 font-mono text-xs">{d.date}</td>
                    <td className="px-5 py-2.5 text-right">{d.clicks}</td>
                    <td className="px-5 py-2.5 text-right">{d.impressions}</td>
                    <td className="px-5 py-2.5 text-right text-xs">
                      {d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : "0.00"}%
                    </td>
                    <td className="px-5 py-2.5 text-right">{d.conversions}</td>
                    <td className="px-5 py-2.5 text-right font-semibold">${(d.spend / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
