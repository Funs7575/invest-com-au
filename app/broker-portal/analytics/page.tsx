"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import CountUp from "@/components/CountUp";
import type { CampaignDailyStats } from "@/lib/types";

type TabKey = "overview" | "funnel" | "roi";
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

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "funnel", label: "Conversion Funnel" },
    { key: "roi", label: "ROI & Spend" },
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
              { label: "Clicks", value: totalClicks },
              { label: "Impressions", value: totalImpressions },
              { label: "CTR", value: ctr, suffix: "%", decimals: 2 },
              { label: "Conversions", value: totalConversions },
              { label: "Conv. Rate", value: convRate, suffix: "%", decimals: 2 },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{kpi.label}</p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">
                  <CountUp end={kpi.value} suffix={kpi.suffix} decimals={kpi.decimals} duration={1000} />
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Daily Clicks</h2>
            {dailyTotals.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No data for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                {renderBarChart(dailyTotals.map(d => ({ label: d.date, value: d.clicks })), "#1e293b")}
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
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <p className="text-xs text-green-600 uppercase tracking-wider font-bold">Funded</p>
              <p className="text-2xl font-extrabold text-green-800 mt-1">
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
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400" /> Funded</span>
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
                  { label: "Funded", count: conversions.filter(c => c.event_type === "funded").length, color: "bg-green-500" },
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
              <p className="text-xl font-extrabold text-green-700 mt-1">
                <CountUp end={totalConversionValue / 100} prefix="$" decimals={2} duration={1000} />
              </p>
            </div>
            <div className={`rounded-xl border p-4 hover-lift ${roi >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">ROI</p>
              <p className={`text-xl font-extrabold mt-1 ${roi >= 0 ? "text-green-700" : "text-red-700"}`}>
                <CountUp end={roi} suffix="%" decimals={1} duration={1000} />
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Cost / Conv.</p>
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
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400" /> Revenue</span>
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
    </div>
  );
}
