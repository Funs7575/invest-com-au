"use client";

import { useState, useEffect, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { downloadCSV } from "@/lib/csv-export";

type DateRange = "7d" | "30d" | "90d" | "all";
type Tab = "overview" | "by-page" | "by-device" | "by-placement";

interface EventRow {
  event_type: string;
  page: string;
  device_type: string;
  placement_id: number | null;
  placement_slug: string | null;
  amount_cents: number;
}

interface PageStat {
  page: string;
  clicks: number;
  impressions: number;
  spend: number;
}

interface DeviceStat {
  device_type: string;
  clicks: number;
  impressions: number;
  spend: number;
}

interface PlacementStat {
  placement_slug: string;
  placement_name: string;
  clicks: number;
  impressions: number;
  spend: number;
}

export default function AttributionAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [loading, setLoading] = useState(true);

  // Overview KPIs
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);

  // Tab data
  const [pageStats, setPageStats] = useState<PageStat[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStat[]>([]);
  const [placementStats, setPlacementStats] = useState<PlacementStat[]>([]);

  const getDateFilter = useCallback(() => {
    const now = new Date();
    switch (dateRange) {
      case "7d": {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d.toISOString();
      }
      case "30d": {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return d.toISOString();
      }
      case "90d": {
        const d = new Date(now);
        d.setDate(d.getDate() - 90);
        return d.toISOString();
      }
      case "all":
      default:
        return null;
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const dateFrom = getDateFilter();

    // Fetch all campaign_events in range
    let query = supabase
      .from("campaign_events")
      .select("event_type, page, device_type, placement_id, placement_slug, amount_cents")
      .order("created_at", { ascending: false });
    if (dateFrom) query = query.gte("created_at", dateFrom);

    const { data } = await query;
    const events: EventRow[] = (data || []) as EventRow[];

    // Compute overview KPIs
    let clicks = 0;
    let impressions = 0;
    let spend = 0;

    events.forEach((e) => {
      if (e.event_type === "click") clicks++;
      if (e.event_type === "impression") impressions++;
      spend += e.amount_cents || 0;
    });

    setTotalClicks(clicks);
    setTotalImpressions(impressions);
    setTotalSpend(spend);

    // By Page aggregation
    const pageMap: Record<string, { clicks: number; impressions: number; spend: number }> = {};
    events.forEach((e) => {
      const pg = e.page || "(unknown)";
      if (!pageMap[pg]) pageMap[pg] = { clicks: 0, impressions: 0, spend: 0 };
      if (e.event_type === "click") pageMap[pg].clicks++;
      if (e.event_type === "impression") pageMap[pg].impressions++;
      pageMap[pg].spend += e.amount_cents || 0;
    });
    setPageStats(
      Object.entries(pageMap)
        .map(([page, stats]) => ({ page, ...stats }))
        .sort((a, b) => b.clicks - a.clicks)
    );

    // By Device aggregation
    const deviceMap: Record<string, { clicks: number; impressions: number; spend: number }> = {};
    events.forEach((e) => {
      const dev = e.device_type || "(unknown)";
      if (!deviceMap[dev]) deviceMap[dev] = { clicks: 0, impressions: 0, spend: 0 };
      if (e.event_type === "click") deviceMap[dev].clicks++;
      if (e.event_type === "impression") deviceMap[dev].impressions++;
      deviceMap[dev].spend += e.amount_cents || 0;
    });
    setDeviceStats(
      Object.entries(deviceMap)
        .map(([device_type, stats]) => ({ device_type, ...stats }))
        .sort((a, b) => b.clicks - a.clicks)
    );

    // By Placement aggregation
    const placementMap: Record<string, { slug: string; clicks: number; impressions: number; spend: number }> = {};
    events.forEach((e) => {
      const slug = e.placement_slug || `placement-${e.placement_id || "unknown"}`;
      if (!placementMap[slug]) placementMap[slug] = { slug, clicks: 0, impressions: 0, spend: 0 };
      if (e.event_type === "click") placementMap[slug].clicks++;
      if (e.event_type === "impression") placementMap[slug].impressions++;
      placementMap[slug].spend += e.amount_cents || 0;
    });

    // Fetch placement names
    const slugs = Object.keys(placementMap);
    let placementNames: Record<string, string> = {};
    if (slugs.length > 0) {
      const { data: placementData } = await supabase
        .from("marketplace_placements")
        .select("slug, name")
        .in("slug", slugs);
      if (placementData) {
        placementData.forEach((p: any) => {
          placementNames[p.slug] = p.name;
        });
      }
    }

    setPlacementStats(
      Object.entries(placementMap)
        .map(([slug, stats]) => ({
          placement_slug: slug,
          placement_name: placementNames[slug] || slug,
          ...stats,
        }))
        .sort((a, b) => b.spend - a.spend)
    );

    setLoading(false);
  };

  const formatCurrency = (cents: number) => {
    const dollars = cents / 100;
    return dollars >= 1000 ? `$${(dollars / 1000).toFixed(1)}k` : `$${dollars.toFixed(2)}`;
  };

  const formatCtr = (clicks: number, impressions: number) => {
    if (impressions === 0) return "0.00%";
    return ((clicks / impressions) * 100).toFixed(2) + "%";
  };

  const formatCpc = (spend: number, clicks: number) => {
    if (clicks === 0) return "$0.00";
    return `$${(spend / 100 / clicks).toFixed(2)}`;
  };

  const handleExportCSV = () => {
    if (activeTab === "overview") {
      downloadCSV("attribution-overview.csv", ["Metric", "Value"], [
        ["Total Clicks", String(totalClicks)],
        ["Total Impressions", String(totalImpressions)],
        ["CTR", formatCtr(totalClicks, totalImpressions)],
        ["Total Spend", formatCurrency(totalSpend)],
        ["Avg CPC", formatCpc(totalSpend, totalClicks)],
      ]);
    } else if (activeTab === "by-page") {
      downloadCSV(
        "attribution-by-page.csv",
        ["Page", "Clicks", "Impressions", "CTR", "Spend", "Avg CPC"],
        pageStats.map((s) => [
          s.page,
          String(s.clicks),
          String(s.impressions),
          formatCtr(s.clicks, s.impressions),
          formatCurrency(s.spend),
          formatCpc(s.spend, s.clicks),
        ])
      );
    } else if (activeTab === "by-device") {
      downloadCSV(
        "attribution-by-device.csv",
        ["Device Type", "Clicks", "Impressions", "CTR", "Spend", "Avg CPC"],
        deviceStats.map((s) => [
          s.device_type,
          String(s.clicks),
          String(s.impressions),
          formatCtr(s.clicks, s.impressions),
          formatCurrency(s.spend),
          formatCpc(s.spend, s.clicks),
        ])
      );
    } else if (activeTab === "by-placement") {
      downloadCSV(
        "attribution-by-placement.csv",
        ["Placement", "Name", "Clicks", "Impressions", "CTR", "Spend", "Avg CPC"],
        placementStats.map((s) => [
          s.placement_slug,
          s.placement_name,
          String(s.clicks),
          String(s.impressions),
          formatCtr(s.clicks, s.impressions),
          formatCurrency(s.spend),
          formatCpc(s.spend, s.clicks),
        ])
      );
    }
  };

  const SkeletonCard = () => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
      <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-24 bg-slate-200 rounded" />
    </div>
  );

  const SkeletonRows = ({ count = 5 }: { count?: number }) => (
    <div className="p-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex justify-between gap-4">
          <div className="h-4 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-12 bg-slate-200 rounded" />
          <div className="h-4 w-12 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );

  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const avgCpc = totalClicks > 0 ? (totalSpend / 100 / totalClicks).toFixed(2) : "0.00";

  const tabs: { value: Tab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "by-page", label: "By Page" },
    { value: "by-device", label: "By Device" },
    { value: "by-placement", label: "By Placement" },
  ];

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
    { value: "90d", label: "90d" },
    { value: "all", label: "All" },
  ];

  // SVG bar chart for device stats
  const renderDeviceBarChart = () => {
    if (deviceStats.length === 0) return null;
    const maxClicks = Math.max(...deviceStats.map((d) => d.clicks), 1);
    const barHeight = 32;
    const chartHeight = deviceStats.length * (barHeight + 8) + 16;
    const chartWidth = 500;
    const labelWidth = 100;
    const barAreaWidth = chartWidth - labelWidth - 40;

    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Click Distribution by Device</h3>
        </div>
        <div className="p-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full max-w-lg"
            style={{ minWidth: 320 }}
          >
            {deviceStats.map((d, i) => {
              const y = i * (barHeight + 8) + 8;
              const barWidth = maxClicks > 0 ? (d.clicks / maxClicks) * barAreaWidth : 0;
              const colors = [
                "#f59e0b", // amber-500
                "#10b981", // emerald-500
                "#3b82f6", // blue-500
                "#8b5cf6", // violet-500
                "#ef4444", // red-500
                "#06b6d4", // cyan-500
              ];
              const color = colors[i % colors.length];

              return (
                <g key={d.device_type}>
                  {/* Label */}
                  <text
                    x={labelWidth - 8}
                    y={y + barHeight / 2 + 5}
                    textAnchor="end"
                    className="text-xs"
                    fill="#475569"
                    fontSize="12"
                  >
                    {d.device_type}
                  </text>
                  {/* Bar */}
                  <rect
                    x={labelWidth}
                    y={y}
                    width={Math.max(barWidth, 2)}
                    height={barHeight}
                    rx={4}
                    fill={color}
                    opacity={0.85}
                  />
                  {/* Count label */}
                  <text
                    x={labelWidth + Math.max(barWidth, 2) + 8}
                    y={y + barHeight / 2 + 5}
                    className="text-xs"
                    fill="#334155"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {d.clicks.toLocaleString()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header with tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Attribution Analytics</h1>
            <p className="text-sm text-slate-500">
              Track click-to-conversion attribution for marketplace campaigns.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
          >
            Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-amber-500 text-white"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Range:</span>
          {dateRangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                dateRange === opt.value
                  ? "bg-amber-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-amber-600">
                      {totalClicks.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-500">Total Clicks</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">
                      {totalImpressions.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-500">Total Impressions</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600">{ctr}%</div>
                    <div className="text-sm text-slate-500">CTR</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(totalSpend)}
                    </div>
                    <div className="text-sm text-slate-500">Total Spend</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600">${avgCpc}</div>
                    <div className="text-sm text-slate-500">Avg CPC</div>
                  </div>
                </>
              )}
            </div>

            {/* Quick summary table */}
            {!loading && (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
                </div>
                <div className="p-6 text-sm text-slate-600">
                  {totalClicks === 0 && totalImpressions === 0 ? (
                    <p className="text-center text-slate-400">
                      No campaign events recorded in this date range. Events will appear here once
                      campaigns start running.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                          Click Rate
                        </div>
                        <div className="text-lg font-bold text-slate-900">{ctr}%</div>
                        <div className="text-xs text-slate-400">
                          {totalClicks} clicks / {totalImpressions} impressions
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                          Cost Efficiency
                        </div>
                        <div className="text-lg font-bold text-slate-900">${avgCpc}</div>
                        <div className="text-xs text-slate-400">average cost per click</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                          Pages Tracked
                        </div>
                        <div className="text-lg font-bold text-slate-900">{pageStats.length}</div>
                        <div className="text-xs text-slate-400">unique page URLs</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                          Device Types
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {deviceStats.length}
                        </div>
                        <div className="text-xs text-slate-400">unique device categories</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== BY PAGE TAB ===== */}
        {activeTab === "by-page" && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Attribution by Page</h2>
            </div>
            {loading ? (
              <SkeletonRows count={8} />
            ) : pageStats.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                No page data available for this date range.
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Page URL
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Clicks
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Impressions
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        CTR
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Spend
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Avg CPC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pageStats.map((s) => (
                      <tr key={s.page} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-sm text-slate-900 max-w-xs truncate">
                          {s.page}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-amber-600 font-semibold">
                          {s.clicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                          {s.impressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                          {formatCtr(s.clicks, s.impressions)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-emerald-600 font-semibold">
                          {formatCurrency(s.spend)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                          {formatCpc(s.spend, s.clicks)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100">
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold text-slate-900">Total</td>
                      <td className="px-4 py-2 text-sm text-right text-amber-600 font-bold">
                        {totalClicks.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                        {totalImpressions.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                        {ctr}%
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-emerald-600 font-bold">
                        {formatCurrency(totalSpend)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                        ${avgCpc}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== BY DEVICE TAB ===== */}
        {activeTab === "by-device" && (
          <>
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Attribution by Device</h2>
              </div>
              {loading ? (
                <SkeletonRows count={5} />
              ) : deviceStats.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400">
                  No device data available for this date range.
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                          Device Type
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                          Clicks
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                          Impressions
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                          CTR
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                          Spend
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                          Avg CPC
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {deviceStats.map((s) => (
                        <tr key={s.device_type} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-sm text-slate-900 font-medium capitalize">
                            {s.device_type}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right text-amber-600 font-semibold">
                            {s.clicks.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                            {s.impressions.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                            {formatCtr(s.clicks, s.impressions)}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right text-emerald-600 font-semibold">
                            {formatCurrency(s.spend)}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                            {formatCpc(s.spend, s.clicks)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100">
                      <tr>
                        <td className="px-4 py-2 text-sm font-semibold text-slate-900">Total</td>
                        <td className="px-4 py-2 text-sm text-right text-amber-600 font-bold">
                          {totalClicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                          {totalImpressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                          {ctr}%
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-emerald-600 font-bold">
                          {formatCurrency(totalSpend)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                          ${avgCpc}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* SVG Bar Chart */}
            {!loading && deviceStats.length > 0 && renderDeviceBarChart()}
          </>
        )}

        {/* ===== BY PLACEMENT TAB ===== */}
        {activeTab === "by-placement" && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Attribution by Placement</h2>
            </div>
            {loading ? (
              <SkeletonRows count={6} />
            ) : placementStats.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                No placement data available for this date range.
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Placement
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Clicks
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Impressions
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        CTR
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Spend
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Avg CPC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {placementStats.map((s) => (
                      <tr key={s.placement_slug} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-sm text-slate-900">
                          <div className="font-medium">{s.placement_name}</div>
                          {s.placement_name !== s.placement_slug && (
                            <div className="text-xs text-slate-400">{s.placement_slug}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-amber-600 font-semibold">
                          {s.clicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                          {s.impressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                          {formatCtr(s.clicks, s.impressions)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-emerald-600 font-semibold">
                          {formatCurrency(s.spend)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                          {formatCpc(s.spend, s.clicks)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100">
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold text-slate-900">Total</td>
                      <td className="px-4 py-2 text-sm text-right text-amber-600 font-bold">
                        {totalClicks.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                        {totalImpressions.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                        {ctr}%
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-emerald-600 font-bold">
                        {formatCurrency(totalSpend)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                        ${avgCpc}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
