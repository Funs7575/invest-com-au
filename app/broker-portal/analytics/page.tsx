"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import Sparkline from "@/components/Sparkline";
import type { CampaignDailyStats } from "@/lib/types";

type TabKey = "overview" | "funnel" | "roi" | "benchmarks";
type DateRange = "7d" | "30d" | "90d";

interface ConversionRow {
  id: number;
  event_type: string;
  conversion_value_cents: number;
  created_at: string;
  campaign_id: number | null;
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [days, setDays] = useState<DateRange>("30d");
  const [stats, setStats] = useState<CampaignDailyStats[]>([]);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [loading, setLoading] = useState(true);

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

      const d = days === "7d" ? 7 : days === "30d" ? 30 : 90;
      const since = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

      const [{ data: s }, { data: c }] = await Promise.all([
        supabase
          .from("campaign_daily_stats")
          .select("*")
          .eq("broker_slug", account.broker_slug)
          .gte("stat_date", since)
          .order("stat_date", { ascending: true }),
        supabase
          .from("conversion_events")
          .select("id, event_type, conversion_value_cents, created_at, campaign_id")
          .eq("broker_slug", account.broker_slug)
          .gte("created_at", new Date(Date.now() - d * 86400000).toISOString())
          .order("created_at", { ascending: true }),
      ]);

      setStats((s || []) as CampaignDailyStats[]);
      setConversions((c || []) as ConversionRow[]);
      setLoading(false);
    };
    load();
  }, [days]);

  // Daily aggregation
  const dailyTotals = useMemo(() => {
    const map = new Map<string, { date: string; clicks: number; impressions: number; spend: number; conversions: number }>();
    for (const s of stats) {
      const existing = map.get(s.stat_date) || { date: s.stat_date, clicks: 0, impressions: 0, spend: 0, conversions: 0 };
      existing.clicks += s.clicks;
      existing.impressions += s.impressions;
      existing.spend += s.spend_cents;
      existing.conversions += s.conversions;
      map.set(s.stat_date, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [stats]);

  // Conversion funnel by day
  const dailyFunnel = useMemo(() => {
    const map = new Map<string, { date: string; opened: number; funded: number; first_trade: number; value: number }>();
    for (const c of conversions) {
      const date = c.created_at.slice(0, 10);
      const existing = map.get(date) || { date, opened: 0, funded: 0, first_trade: 0, value: 0 };
      if (c.event_type === "opened") existing.opened++;
      else if (c.event_type === "funded") existing.funded++;
      else if (c.event_type === "first_trade") existing.first_trade++;
      existing.value += c.conversion_value_cents || 0;
      map.set(date, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [conversions]);

  // Totals
  const totalClicks = stats.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = stats.reduce((s, r) => s + r.impressions, 0);
  const totalSpend = stats.reduce((s, r) => s + r.spend_cents, 0);
  const totalConversions = conversions.length;
  const totalConversionValue = conversions.reduce((s, c) => s + (c.conversion_value_cents || 0), 0);
  const roi = totalSpend > 0 ? ((totalConversionValue - totalSpend) / totalSpend) * 100 : 0;
  const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions / 100 : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const convRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  // Chart helpers
  const chartWidth = 700;
  const chartHeight = 140;

  const renderBarChart = (data: { label: string; value: number }[], color: string) => {
    const max = Math.max(...data.map(d => d.value), 1);
    const barW = data.length > 0 ? Math.max(3, (chartWidth - 40) / data.length - 2) : 6;
    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`} className="w-full max-w-[700px]">
        {data.map((d, i) => {
          const h = (d.value / max) * chartHeight;
          const x = 30 + i * (barW + 2);
          return (
            <g key={d.label}>
              <rect x={x} y={chartHeight - h} width={barW} height={h} fill={color} rx={2}
                className="chart-bar-animate" style={{ animationDelay: `${i * 0.02}s` }} />
              <title>{d.label}: {d.value}</title>
              {i % Math.ceil(data.length / 8) === 0 && (
                <text x={x + barW / 2} y={chartHeight + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  {d.label.slice(5)}
                </text>
              )}
            </g>
          );
        })}
        <text x={0} y={12} fontSize={10} fill="#94a3b8">{max}</text>
        <text x={0} y={chartHeight} fontSize={10} fill="#94a3b8">0</text>
      </svg>
    );
  };

  const renderStackedChart = (data: typeof dailyFunnel) => {
    const max = Math.max(...data.map(d => d.opened + d.funded + d.first_trade), 1);
    const barW = data.length > 0 ? Math.max(3, (chartWidth - 40) / data.length - 2) : 6;
    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`} className="w-full max-w-[700px]">
        {data.map((d, i) => {
          const total = d.opened + d.funded + d.first_trade;
          const totalH = (total / max) * chartHeight;
          const x = 30 + i * (barW + 2);
          const ftH = (d.first_trade / max) * chartHeight;
          const fuH = (d.funded / max) * chartHeight;
          const opH = (d.opened / max) * chartHeight;
          return (
            <g key={d.date}>
              <rect x={x} y={chartHeight - opH - fuH - ftH} width={barW} height={opH} fill="#60a5fa" rx={1}
                className="chart-bar-animate" style={{ animationDelay: `${i * 0.02}s` }} />
              <rect x={x} y={chartHeight - fuH - ftH} width={barW} height={fuH} fill="#34d399" rx={1}
                className="chart-bar-animate" style={{ animationDelay: `${i * 0.02 + 0.01}s` }} />
              <rect x={x} y={chartHeight - ftH} width={barW} height={ftH} fill="#a78bfa" rx={1}
                className="chart-bar-animate" style={{ animationDelay: `${i * 0.02 + 0.02}s` }} />
              <title>{d.date}: {d.opened} opened, {d.funded} funded, {d.first_trade} trades</title>
              {i % Math.ceil(data.length / 8) === 0 && (
                <text x={x + barW / 2} y={chartHeight + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
        <text x={0} y={12} fontSize={10} fill="#94a3b8">{max}</text>
        <text x={0} y={chartHeight} fontSize={10} fill="#94a3b8">0</text>
      </svg>
    );
  };

  // Per-campaign benchmarking
  const campaignBenchmarks = useMemo(() => {
    const campMap = new Map<number, { id: number; clicks: number; impressions: number; spend: number; conversions: number; days: Set<string> }>();
    for (const s of stats) {
      const existing = campMap.get(s.campaign_id) || { id: s.campaign_id, clicks: 0, impressions: 0, spend: 0, conversions: 0, days: new Set<string>() };
      existing.clicks += s.clicks;
      existing.impressions += s.impressions;
      existing.spend += s.spend_cents;
      existing.conversions += s.conversions;
      existing.days.add(s.stat_date);
      campMap.set(s.campaign_id, existing);
    }
    const all = Array.from(campMap.values());
    // Calculate aggregate averages for benchmarks
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgConvRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks / 100 : 0;
    const avgCpConv = totalConversions > 0 ? totalSpend / totalConversions / 100 : 0;

    // Industry benchmarks (typical ranges for broker affiliate marketing)
    const industryBenchmarks = {
      ctr: 2.5,          // 2.5% average CTR for financial services
      convRate: 3.2,     // 3.2% conversion rate benchmark
      cpc: 1.80,         // $1.80 average CPC in financial sector
      cpConversion: 45,  // $45 cost per conversion
    };

    return {
      campaigns: all.map(c => {
        const campCtr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
        const campConvRate = c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0;
        const campCpc = c.clicks > 0 ? c.spend / c.clicks / 100 : 0;
        const campCpConv = c.conversions > 0 ? c.spend / c.conversions / 100 : 0;
        const activeDays = c.days.size;

        // Performance score: weighted average of normalized metrics (higher is better)
        const ctrScore = industryBenchmarks.ctr > 0 ? Math.min((campCtr / industryBenchmarks.ctr) * 100, 200) : 0;
        const convScore = industryBenchmarks.convRate > 0 ? Math.min((campConvRate / industryBenchmarks.convRate) * 100, 200) : 0;
        // For cost metrics, lower is better, so invert
        const cpcScore = campCpc > 0 ? Math.min((industryBenchmarks.cpc / campCpc) * 100, 200) : 100;
        const performanceScore = Math.round((ctrScore * 0.3 + convScore * 0.4 + cpcScore * 0.3));

        return {
          id: c.id,
          clicks: c.clicks,
          impressions: c.impressions,
          spend: c.spend,
          conversions: c.conversions,
          activeDays,
          ctr: campCtr,
          convRate: campConvRate,
          cpc: campCpc,
          cpConversion: campCpConv,
          performanceScore,
        };
      }).sort((a, b) => b.performanceScore - a.performanceScore),
      averages: { ctr: avgCtr, convRate: avgConvRate, cpc: avgCpc, cpConversion: avgCpConv },
      industry: industryBenchmarks,
    };
  }, [stats, totalClicks, totalImpressions, totalConversions, totalSpend]);

  const getScoreColor = (score: number) => {
    if (score >= 120) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 80) return "text-blue-700 bg-blue-50 border-blue-200";
    if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 120) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Work";
  };

  const getBenchmarkIndicator = (value: number, benchmark: number, lowerIsBetter = false) => {
    const ratio = lowerIsBetter ? (benchmark / Math.max(value, 0.01)) : (value / Math.max(benchmark, 0.01));
    if (ratio >= 1.2) return { icon: "▲", color: "text-emerald-600", label: "Above benchmark" };
    if (ratio >= 0.8) return { icon: "●", color: "text-blue-500", label: "On par" };
    return { icon: "▼", color: "text-red-500", label: "Below benchmark" };
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "funnel", label: "Conversion Funnel" },
    { key: "roi", label: "ROI & Spend" },
    { key: "benchmarks", label: "Benchmarks" },
  ];

  if (loading) return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">Deep-dive into campaign performance</p>
        </div>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as DateRange[]).map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                days === d ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {d.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 portal-stagger">
            {[
              { label: "Clicks", value: totalClicks, icon: "mouse-pointer-click", iconBg: "bg-blue-50", iconColor: "text-blue-600", sparkData: dailyTotals.map(d => d.clicks), sparkColor: "#3b82f6", tip: "" },
              { label: "Impressions", value: totalImpressions, icon: "eye", iconBg: "bg-purple-50", iconColor: "text-purple-600", sparkData: dailyTotals.map(d => d.impressions), sparkColor: "#9333ea", tip: "" },
              { label: "CTR", value: ctr, suffix: "%", decimals: 2, icon: "trending-up", iconBg: "bg-emerald-50", iconColor: "text-emerald-600", sparkData: dailyTotals.map(d => d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0), sparkColor: "#16a34a", tip: "Click-Through Rate = Clicks / Impressions x 100. Industry average for financial services is ~2.5%." },
              { label: "Conversions", value: totalConversions, icon: "target", iconBg: "bg-emerald-50", iconColor: "text-emerald-600", sparkData: dailyTotals.map(d => d.conversions), sparkColor: "#059669", tip: "Users who completed an action (opened account, funded, first trade) tracked via your Postback API." },
              { label: "Conv. Rate", value: convRate, suffix: "%", decimals: 2, icon: "bar-chart", iconBg: "bg-amber-50", iconColor: "text-amber-600", sparkData: dailyTotals.map(d => d.clicks > 0 ? (d.conversions / d.clicks) * 100 : 0), sparkColor: "#d97706", tip: "" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-5 h-5 rounded-full ${kpi.iconBg} flex items-center justify-center`}>
                    <Icon name={kpi.icon} size={10} className={kpi.iconColor} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{kpi.label}</p>
                  {kpi.tip && <InfoTip text={kpi.tip} />}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xl font-extrabold text-slate-900">
                    <CountUp end={kpi.value} suffix={kpi.suffix} decimals={kpi.decimals} duration={1000} />
                  </p>
                  {kpi.sparkData.length >= 3 && (
                    <Sparkline data={kpi.sparkData} color={kpi.sparkColor} height={20} width={50} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Daily Clicks</h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-800" /> Clicks</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-emerald-500 rounded" style={{ height: 2 }} /> Conversions</span>
              </div>
            </div>
            {dailyTotals.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No data for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                {(() => {
                  const data = dailyTotals.map(d => ({ label: d.date, value: d.clicks }));
                  const max = Math.max(...data.map(d => d.value), 1);
                  const maxConv = Math.max(...dailyTotals.map(d => d.conversions), 1);
                  const barW = data.length > 0 ? Math.max(3, (chartWidth - 40) / data.length - 2) : 6;
                  const convLinePoints = dailyTotals.map((d, i) => {
                    const x = 30 + i * (barW + 2) + barW / 2;
                    const y = (1 - d.conversions / maxConv) * chartHeight;
                    return `${x},${y}`;
                  }).join(" ");
                  return (
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`} className="w-full max-w-[700px]">
                      {data.map((d, i) => {
                        const h = (d.value / max) * chartHeight;
                        const x = 30 + i * (barW + 2);
                        return (
                          <g key={d.label}>
                            <rect x={x} y={chartHeight - h} width={barW} height={h} fill="#1e293b" rx={2}
                              className="chart-bar-animate" style={{ animationDelay: `${i * 0.02}s` }} />
                            <title>{d.label}: {d.value} clicks</title>
                            {i % Math.ceil(data.length / 8) === 0 && (
                              <text x={x + barW / 2} y={chartHeight + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">
                                {d.label.slice(5)}
                              </text>
                            )}
                          </g>
                        );
                      })}
                      <polyline points={convLinePoints} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
                      {dailyTotals.map((d, i) => {
                        const x = 30 + i * (barW + 2) + barW / 2;
                        const y = (1 - d.conversions / maxConv) * chartHeight;
                        return <circle key={`cd-${d.date}`} cx={x} cy={y} r={2} fill="#22c55e" />;
                      })}
                      <text x={0} y={12} fontSize={10} fill="#94a3b8">{max}</text>
                      <text x={0} y={chartHeight} fontSize={10} fill="#94a3b8">0</text>
                    </svg>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Daily Spend</h2>
            {dailyTotals.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No data for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                {renderBarChart(dailyTotals.map(d => ({ label: d.date, value: d.spend })), "#f59e0b")}
              </div>
            )}
          </div>
        </>
      )}

      {/* Conversion Funnel Tab */}
      {tab === "funnel" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 portal-stagger">
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <p className="text-xs text-blue-600 uppercase tracking-wider font-bold">Opened</p>
              <p className="text-2xl font-extrabold text-blue-800 mt-1">
                <CountUp end={conversions.filter(c => c.event_type === "opened").length} duration={1000} />
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold">Funded</p>
              <p className="text-2xl font-extrabold text-emerald-800 mt-1">
                <CountUp end={conversions.filter(c => c.event_type === "funded").length} duration={1000} />
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
              <p className="text-xs text-purple-600 uppercase tracking-wider font-bold">First Trade</p>
              <p className="text-2xl font-extrabold text-purple-800 mt-1">
                <CountUp end={conversions.filter(c => c.event_type === "first_trade").length} duration={1000} />
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <p className="text-xs text-amber-600 uppercase tracking-wider font-bold">Total Value</p>
              <p className="text-2xl font-extrabold text-amber-800 mt-1">
                <CountUp end={totalConversionValue / 100} prefix="$" decimals={2} duration={1000} />
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Conversions Over Time</h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-400" /> Opened</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Funded</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-400" /> First Trade</span>
              </div>
            </div>
            {dailyFunnel.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No conversion data for this period.</p>
            ) : (
              <div className="overflow-x-auto">{renderStackedChart(dailyFunnel)}</div>
            )}
          </div>

          {/* Funnel visualization */}
          {totalConversions > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-4">Funnel Drop-off</h2>
              <div className="space-y-3">
                {[
                  { label: "Clicks", count: totalClicks, color: "bg-slate-700" },
                  { label: "Opened", count: conversions.filter(c => c.event_type === "opened").length, color: "bg-blue-500" },
                  { label: "Funded", count: conversions.filter(c => c.event_type === "funded").length, color: "bg-emerald-500" },
                  { label: "First Trade", count: conversions.filter(c => c.event_type === "first_trade").length, color: "bg-purple-500" },
                ].map((stage, i, arr) => {
                  const pct = arr[0].count > 0 ? (stage.count / arr[0].count) * 100 : 0;
                  return (
                    <div key={stage.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                        <span className="text-sm font-bold text-slate-900">
                          {stage.count} <span className="text-xs text-slate-400 font-normal">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${stage.color} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.max(pct, 0.5)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ROI Tab */}
      {tab === "roi" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 portal-stagger">
            <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Spend</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                <CountUp end={totalSpend / 100} prefix="$" decimals={2} duration={1000} />
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Conv. Value</p>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">
                <CountUp end={totalConversionValue / 100} prefix="$" decimals={2} duration={1000} />
              </p>
            </div>
            <div className={`rounded-xl border p-4 hover-lift ${roi >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide flex items-center gap-1">ROI <InfoTip text="Return on Investment = (Conversion Value - Total Spend) / Total Spend x 100. Positive = profitable campaigns." /></p>
              <p className={`text-xl font-extrabold mt-1 ${roi >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                <CountUp end={roi} suffix="%" decimals={1} duration={1000} />
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide flex items-center gap-1">Cost per Conv. <InfoTip text="Average cost to acquire one conversion. Lower is better. Compare with your customer lifetime value." /></p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                <CountUp end={costPerConversion} prefix="$" decimals={2} duration={1000} />
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Daily Spend vs Conversion Value</h2>
            {dailyTotals.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No data for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-center gap-4 mb-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" /> Spend</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Revenue</span>
                </div>
                {(() => {
                  // Merge spend & conversion value per day
                  const merged = new Map<string, { spend: number; value: number }>();
                  for (const d of dailyTotals) {
                    merged.set(d.date, { spend: d.spend, value: 0 });
                  }
                  for (const d of dailyFunnel) {
                    const existing = merged.get(d.date) || { spend: 0, value: 0 };
                    existing.value = d.value;
                    merged.set(d.date, existing);
                  }
                  const entries = Array.from(merged.entries()).sort(([a], [b]) => a.localeCompare(b));
                  const max = Math.max(...entries.map(([, v]) => Math.max(v.spend, v.value)), 1);
                  const barW = entries.length > 0 ? Math.max(3, (chartWidth - 40) / entries.length / 2 - 1) : 6;

                  return (
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`} className="w-full max-w-[700px]">
                      {entries.map(([date, v], i) => {
                        const x = 30 + i * (barW * 2 + 4);
                        const spendH = (v.spend / max) * chartHeight;
                        const valH = (v.value / max) * chartHeight;
                        return (
                          <g key={date}>
                            <rect x={x} y={chartHeight - spendH} width={barW} height={spendH} fill="#f87171" rx={1}
                              className="chart-bar-animate" style={{ animationDelay: `${i * 0.02}s` }} />
                            <rect x={x + barW + 1} y={chartHeight - valH} width={barW} height={valH} fill="#34d399" rx={1}
                              className="chart-bar-animate" style={{ animationDelay: `${i * 0.02 + 0.01}s` }} />
                            <title>{date}: Spend ${(v.spend / 100).toFixed(2)}, Value ${(v.value / 100).toFixed(2)}</title>
                            {i % Math.ceil(entries.length / 8) === 0 && (
                              <text x={x + barW} y={chartHeight + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">
                                {date.slice(5)}
                              </text>
                            )}
                          </g>
                        );
                      })}
                      <text x={0} y={12} fontSize={10} fill="#94a3b8">${(max / 100).toFixed(0)}</text>
                      <text x={0} y={chartHeight} fontSize={10} fill="#94a3b8">$0</text>
                    </svg>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Efficiency table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">Efficiency Metrics</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Avg CPC", value: totalClicks > 0 ? `$${(totalSpend / totalClicks / 100).toFixed(2)}` : "—" },
                { label: "Conv. Rate", value: totalClicks > 0 ? `${convRate.toFixed(2)}%` : "—" },
                { label: "Cost per Conversion", value: totalConversions > 0 ? `$${costPerConversion.toFixed(2)}` : "—" },
                { label: "Revenue per Click", value: totalClicks > 0 ? `$${(totalConversionValue / totalClicks / 100).toFixed(2)}` : "—" },
              ].map(m => (
                <div key={m.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium">{m.label}</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Benchmarks Tab */}
      {tab === "benchmarks" && (
        <>
          {/* Your Averages vs Industry */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">Your Performance vs Industry <InfoTip text="Financial services industry averages: CTR 2.5%, Conv Rate 3.2%, CPC $1.80, Cost per Conv $45." /></h2>
            <p className="text-xs text-slate-500 mb-4">Compared to average financial services advertising benchmarks</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 portal-stagger">
              {[
                {
                  label: "CTR",
                  yours: campaignBenchmarks.averages.ctr,
                  industry: campaignBenchmarks.industry.ctr,
                  format: (v: number) => `${v.toFixed(2)}%`,
                  lowerIsBetter: false,
                },
                {
                  label: "Conv. Rate",
                  yours: campaignBenchmarks.averages.convRate,
                  industry: campaignBenchmarks.industry.convRate,
                  format: (v: number) => `${v.toFixed(2)}%`,
                  lowerIsBetter: false,
                },
                {
                  label: "Avg CPC",
                  yours: campaignBenchmarks.averages.cpc,
                  industry: campaignBenchmarks.industry.cpc,
                  format: (v: number) => `$${v.toFixed(2)}`,
                  lowerIsBetter: true,
                },
                {
                  label: "Cost / Conv.",
                  yours: campaignBenchmarks.averages.cpConversion,
                  industry: campaignBenchmarks.industry.cpConversion,
                  format: (v: number) => `$${v.toFixed(2)}`,
                  lowerIsBetter: true,
                },
              ].map(metric => {
                const indicator = getBenchmarkIndicator(metric.yours, metric.industry, metric.lowerIsBetter);
                return (
                  <div key={metric.label} className="bg-slate-50 rounded-lg p-4 hover-lift">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{metric.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-lg font-extrabold text-slate-900">{metric.format(metric.yours)}</p>
                      <span className={`text-xs font-bold ${indicator.color}`} title={indicator.label}>{indicator.icon}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[0.69rem] text-slate-400">
                      <span>Industry avg</span>
                      <span className="font-medium text-slate-500">{metric.format(metric.industry)}</span>
                    </div>
                    {/* Comparison bar */}
                    <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
                      {(() => {
                        const maxVal = Math.max(metric.yours, metric.industry) * 1.3 || 1;
                        const yoursW = (metric.yours / maxVal) * 100;
                        const industryW = (metric.industry / maxVal) * 100;
                        return (
                          <>
                            <div className="absolute h-full bg-slate-900 rounded-full" style={{ width: `${yoursW}%` }} />
                            <div className="absolute h-full w-0.5 bg-amber-500" style={{ left: `${industryW}%` }} title="Industry benchmark" />
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[0.62rem]">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded bg-slate-900" /> Yours</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded bg-amber-500" /> Industry</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-Campaign Ranking */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Campaign Performance Ranking</h2>
              <p className="text-xs text-slate-500 mt-0.5">Campaigns ranked by composite performance score</p>
            </div>
            {campaignBenchmarks.campaigns.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No campaign data for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">Rank</th>
                      <th className="px-5 py-3 text-left">Campaign ID</th>
                      <th className="px-5 py-3 text-right">Clicks</th>
                      <th className="px-5 py-3 text-right">CTR</th>
                      <th className="px-5 py-3 text-right">Conv. Rate</th>
                      <th className="px-5 py-3 text-right">Avg CPC</th>
                      <th className="px-5 py-3 text-right">Spend</th>
                      <th className="px-5 py-3 text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaignBenchmarks.campaigns.map((c, i) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-400 font-mono text-xs">#{i + 1}</td>
                        <td className="px-5 py-3 font-semibold text-slate-900">Campaign #{c.id}</td>
                        <td className="px-5 py-3 text-right">{c.clicks}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="flex items-center justify-end gap-1">
                            {c.ctr.toFixed(2)}%
                            <span className={`text-[0.62rem] ${getBenchmarkIndicator(c.ctr, campaignBenchmarks.industry.ctr).color}`}>
                              {getBenchmarkIndicator(c.ctr, campaignBenchmarks.industry.ctr).icon}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="flex items-center justify-end gap-1">
                            {c.convRate.toFixed(2)}%
                            <span className={`text-[0.62rem] ${getBenchmarkIndicator(c.convRate, campaignBenchmarks.industry.convRate).color}`}>
                              {getBenchmarkIndicator(c.convRate, campaignBenchmarks.industry.convRate).icon}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="flex items-center justify-end gap-1">
                            ${c.cpc.toFixed(2)}
                            <span className={`text-[0.62rem] ${getBenchmarkIndicator(c.cpc, campaignBenchmarks.industry.cpc, true).color}`}>
                              {getBenchmarkIndicator(c.cpc, campaignBenchmarks.industry.cpc, true).icon}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">${(c.spend / 100).toFixed(2)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(c.performanceScore)}`}>
                            {c.performanceScore}
                            <span className="text-[0.62rem] font-normal opacity-70">{getScoreLabel(c.performanceScore)}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Score explanation */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">Performance Score <InfoTip text="Composite score: CTR (30% weight) + Conversion Rate (40%) + Cost Efficiency (30%). Scores above 120 are excellent." /></h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <p className="font-bold text-emerald-700">120+ Excellent</p>
                <p className="text-emerald-600 mt-0.5">Outperforming industry benchmarks</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="font-bold text-blue-700">80–119 Good</p>
                <p className="text-blue-600 mt-0.5">On par with industry average</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <p className="font-bold text-amber-700">50–79 Fair</p>
                <p className="text-amber-600 mt-0.5">Below average — room for improvement</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="font-bold text-red-700">0–49 Needs Work</p>
                <p className="text-red-600 mt-0.5">Significantly below benchmarks</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Performance score is a weighted composite: CTR (30%), Conversion Rate (40%), Cost Efficiency (30%), benchmarked against industry averages for financial services advertising.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
