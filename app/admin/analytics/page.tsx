"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

interface ClickRow {
  id: number;
  broker_name: string;
  broker_slug: string;
  source: string;
  page: string;
  layer: string;
  clicked_at: string;
}

interface BrokerClickStat {
  broker_name: string;
  broker_slug: string;
  count: number;
}

interface SourceStat {
  source: string;
  count: number;
}

interface DailyClickStat {
  day: string;
  clicks: number;
}

interface RevenueByBroker {
  broker_name: string;
  broker_slug: string;
  clicks: number;
  estimated_epc: number;
  estimated_revenue: number;
}

interface PageStat {
  page: string;
  count: number;
}

type DateRange = "7d" | "30d" | "90d" | "all" | "custom";

export default function AdminAnalyticsPage() {
  const [recentClicks, setRecentClicks] = useState<ClickRow[]>([]);
  const [brokerStats, setBrokerStats] = useState<BrokerClickStat[]>([]);
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyClickStat[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueByBroker[]>([]);
  const [pageStats, setPageStats] = useState<PageStat[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [clicksToday, setClicksToday] = useState(0);
  const [clicksThisMonth, setClicksThisMonth] = useState(0);
  const [emailCaptures, setEmailCaptures] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "revenue" | "log">("overview");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const PAGE_SIZE = 25;

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
      case "custom":
        return customFrom ? new Date(customFrom).toISOString() : null;
      case "all":
      default:
        return null;
    }
  }, [dateRange, customFrom]);

  const getDateFilterEnd = useCallback(() => {
    if (dateRange === "custom" && customTo) {
      const d = new Date(customTo);
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    }
    return null;
  }, [dateRange, customTo]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const dateFrom = getDateFilter();
      const dateTo = getDateFilterEnd();
      const daysBack = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : dateRange === "custom" ? 90 : 30;

      // Build filtered click count query
      let filteredCountQuery = supabase.from("affiliate_clicks").select("id", { count: "exact", head: true });
      if (dateFrom) filteredCountQuery = filteredCountQuery.gte("clicked_at", dateFrom);
      if (dateTo) filteredCountQuery = filteredCountQuery.lte("clicked_at", dateTo);

      // Build recent clicks query with date filter
      let recentQuery = supabase
        .from("affiliate_clicks")
        .select("id, broker_name, broker_slug, source, page, layer, clicked_at")
        .order("clicked_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (dateFrom) recentQuery = recentQuery.gte("clicked_at", dateFrom);
      if (dateTo) recentQuery = recentQuery.lte("clicked_at", dateTo);

      const [
        recentRes,
        _filteredCount,
        totalRes,
        todayRes,
        monthRes,
        emailRes,
        brokerStatsRes,
        sourceStatsRes,
        dailyStatsRes,
        revenueStatsRes,
      ] = await Promise.all([
        recentQuery,
        filteredCountQuery,
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .gte("clicked_at", today),
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .gte("clicked_at", monthStart.toISOString()),
        supabase
          .from("email_captures")
          .select("id", { count: "exact", head: true }),
        supabase.rpc("get_click_stats_by_broker"),
        supabase.rpc("get_click_stats_by_source"),
        supabase.rpc("get_daily_click_stats", { days_back: daysBack }),
        supabase.rpc("get_revenue_stats_by_broker"),
      ]);

      if (recentRes.data) setRecentClicks(recentRes.data);
      setTotalClicks(totalRes.count || 0);
      setClicksToday(todayRes.count || 0);
      setClicksThisMonth(monthRes.count || 0);
      setEmailCaptures(emailRes.count || 0);

      if (brokerStatsRes.data) {
        setBrokerStats(
          brokerStatsRes.data.map((r: { broker_name: string; broker_slug: string; count: number }) => ({
            broker_name: r.broker_name,
            broker_slug: r.broker_slug,
            count: Number(r.count),
          }))
        );
      }

      if (sourceStatsRes.data) {
        setSourceStats(
          sourceStatsRes.data.map((r: { source: string; count: number }) => ({
            source: r.source,
            count: Number(r.count),
          }))
        );
      }

      if (dailyStatsRes.data) {
        setDailyStats(
          dailyStatsRes.data.map((r: { day: string; clicks: number }) => ({
            day: r.day,
            clicks: Number(r.clicks),
          }))
        );
      }

      if (revenueStatsRes.data) {
        setRevenueStats(
          revenueStatsRes.data.map((r: RevenueByBroker) => ({
            broker_name: r.broker_name,
            broker_slug: r.broker_slug,
            clicks: Number(r.clicks),
            estimated_epc: Number(r.estimated_epc),
            estimated_revenue: Number(r.estimated_revenue),
          }))
        );
      }

      // Compute page stats
      if (recentRes.data) {
        let allPagesQuery = supabase
          .from("affiliate_clicks")
          .select("page")
          .not("page", "is", null);
        if (dateFrom) allPagesQuery = allPagesQuery.gte("clicked_at", dateFrom);
        if (dateTo) allPagesQuery = allPagesQuery.lte("clicked_at", dateTo);

        const allPagesRes = await allPagesQuery;
        if (allPagesRes.data) {
          const pageMap: Record<string, number> = {};
          allPagesRes.data.forEach((r: { page: string }) => {
            const p = r.page || "(unknown)";
            pageMap[p] = (pageMap[p] || 0) + 1;
          });
          const sorted = Object.entries(pageMap)
            .map(([pg, count]) => ({ page: pg, count }))
            .sort((a, b) => b.count - a.count);
          setPageStats(sorted);
        }
      }

      setLoading(false);
    }

    load();
  }, [page, dateRange, customFrom, customTo, getDateFilter, getDateFilterEnd]);

  // CSV Export
  const handleExportCSV = async () => {
    setExporting(true);
    const supabase = createClient();
    const dateFrom = getDateFilter();
    const dateTo = getDateFilterEnd();

    let query = supabase
      .from("affiliate_clicks")
      .select("id, broker_name, broker_slug, source, page, layer, clicked_at")
      .order("clicked_at", { ascending: false })
      .limit(10000);
    if (dateFrom) query = query.gte("clicked_at", dateFrom);
    if (dateTo) query = query.lte("clicked_at", dateTo);

    const { data } = await query;
    if (data && data.length > 0) {
      const headers = ["ID", "Broker", "Slug", "Source", "Page", "Layer", "Clicked At"];
      const rows = data.map((r) => [
        r.id,
        `"${(r.broker_name || "").replace(/"/g, '""')}"`,
        r.broker_slug || "",
        r.source || "",
        `"${(r.page || "").replace(/"/g, '""')}"`,
        r.layer || "",
        r.clicked_at,
      ].join(","));
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clicks-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  const totalPages = Math.ceil(totalClicks / PAGE_SIZE);
  const totalRevenue = revenueStats.reduce((sum, r) => sum + r.estimated_revenue, 0);
  const topRevenueBroker = revenueStats.length > 0 ? revenueStats[0] : null;
  const avgEpc =
    revenueStats.length > 0
      ? revenueStats.reduce((sum, r) => sum + r.estimated_epc, 0) / revenueStats.length
      : 0;
  const maxDailyClicks = dailyStats.length > 0 ? Math.max(...dailyStats.map((d) => d.clicks)) : 0;

  // Revenue projections based on recent click velocity
  const totalDailyClicks = dailyStats.reduce((s, d) => s + d.clicks, 0);
  const daysWithData = dailyStats.filter((d) => d.clicks > 0).length || 1;
  const avgDailyClicks = totalDailyClicks / daysWithData;
  const recentWeekClicks = dailyStats.slice(-7).reduce((s, d) => s + d.clicks, 0);
  const avgDailyClicksRecent = recentWeekClicks / Math.min(7, dailyStats.length || 1);
  const dailyRevenue = avgDailyClicks * avgEpc;
  const dailyRevenueRecent = avgDailyClicksRecent * avgEpc;
  const projections = {
    daily: { clicks30d: avgDailyClicks, clicks7d: avgDailyClicksRecent, rev30d: dailyRevenue, rev7d: dailyRevenueRecent },
    weekly: { clicks30d: avgDailyClicks * 7, clicks7d: avgDailyClicksRecent * 7, rev30d: dailyRevenue * 7, rev7d: dailyRevenueRecent * 7 },
    monthly: { clicks30d: avgDailyClicks * 30, clicks7d: avgDailyClicksRecent * 30, rev30d: dailyRevenue * 30, rev7d: dailyRevenueRecent * 30 },
    annual: { clicks30d: avgDailyClicks * 365, clicks7d: avgDailyClicksRecent * 365, rev30d: dailyRevenue * 365, rev7d: dailyRevenueRecent * 365 },
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
        <div key={i} className="animate-pulse flex justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-12 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );

  const formatCurrency = (val: number) =>
    val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(2)}`;

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "all", label: "All time" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Analytics & Revenue</h1>
        <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
          {(["overview", "revenue", "log"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-green-700 text-white"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "revenue" ? "Revenue" : "Click Log"}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-slate-500 font-medium">Range:</span>
        {dateRangeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              dateRange === opt.value
                ? "bg-green-700 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {dateRange === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/30"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/30"
            />
          </div>
        )}
      </div>

      {/* Summary Cards — always visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-600">{totalClicks}</div>
              <div className="text-sm text-slate-500">Total Clicks</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{clicksToday}</div>
              <div className="text-sm text-slate-500">Today</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</div>
              <div className="text-sm text-slate-500">Est. Revenue</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-cyan-600">{emailCaptures}</div>
              <div className="text-sm text-slate-500">Email Captures</div>
            </div>
          </>
        )}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === "overview" && (
        <>
          {/* Daily Click Trend Chart */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Click Trend ({dateRange === "7d" ? "Last 7 Days" : dateRange === "90d" ? "Last 90 Days" : dateRange === "custom" ? "Custom Range" : dateRange === "all" ? "Last 30 Days" : "Last 30 Days"})</h2>
            </div>
            {loading ? (
              <div className="p-4 h-48 animate-pulse bg-slate-200/20" />
            ) : dailyStats.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No click data yet. Clicks will appear here once tracked.</div>
            ) : (
              <div className="p-4">
                <div className="flex items-end gap-1 h-40">
                  {dailyStats.map((d) => {
                    const heightPct = maxDailyClicks > 0 ? (d.clicks / maxDailyClicks) * 100 : 0;
                    return (
                      <div
                        key={d.day}
                        className="flex-1 group relative"
                        title={`${d.day}: ${d.clicks} clicks`}
                      >
                        <div className="flex flex-col items-center justify-end h-40">
                          {/* Tooltip */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {new Date(d.day + "T00:00:00").toLocaleDateString("en-AU", {
                              month: "short",
                              day: "numeric",
                            })}
                            : {d.clicks}
                          </div>
                          <div
                            className="w-full bg-green-600 rounded-t transition-all hover:bg-green-500"
                            style={{
                              height: `${Math.max(heightPct, 2)}%`,
                              minHeight: d.clicks > 0 ? "4px" : "2px",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>
                    {dailyStats.length > 0 &&
                      new Date(dailyStats[0].day + "T00:00:00").toLocaleDateString("en-AU", {
                        month: "short",
                        day: "numeric",
                      })}
                  </span>
                  <span>
                    {dailyStats.length > 0 &&
                      new Date(dailyStats[dailyStats.length - 1].day + "T00:00:00").toLocaleDateString(
                        "en-AU",
                        { month: "short", day: "numeric" }
                      )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Per-Broker Clicks */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Clicks by Broker</h2>
              </div>
              {loading ? (
                <SkeletonRows count={6} />
              ) : brokerStats.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No click data yet.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Broker
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Clicks
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {brokerStats.map((stat) => (
                      <tr key={stat.broker_slug} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-900">{stat.broker_name}</td>
                        <td className="px-4 py-2 text-sm text-right text-amber-600 font-semibold">
                          {stat.count}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-500">
                          {totalClicks > 0 ? ((stat.count / totalClicks) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top Sources */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Top Sources</h2>
              </div>
              {loading ? (
                <SkeletonRows count={6} />
              ) : sourceStats.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No click data yet.</div>
              ) : (
                <div className="p-4 space-y-3">
                  {sourceStats.map((stat) => {
                    const pct = totalClicks > 0 ? (stat.count / totalClicks) * 100 : 0;
                    return (
                      <div key={stat.source}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">{stat.source}</span>
                          <span className="text-slate-900 font-semibold">
                            {stat.count} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Clicks by Page */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Clicks by Page</h2>
            </div>
            {loading ? (
              <SkeletonRows count={6} />
            ) : pageStats.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No click data yet.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Page
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Clicks
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Share
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Bar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pageStats.slice(0, 15).map((stat) => {
                    const pct = totalClicks > 0 ? (stat.count / totalClicks) * 100 : 0;
                    return (
                      <tr key={stat.page} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-900 max-w-xs truncate">
                          {stat.page}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-amber-600 font-semibold">
                          {stat.count}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-500">
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 w-32">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ===== REVENUE TAB ===== */}
      {activeTab === "revenue" && (
        <>
          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-sm text-slate-500 mb-1">Total Estimated Revenue</div>
                  <div className="text-3xl font-bold text-emerald-600">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Based on EPC x clicks</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-sm text-slate-500 mb-1">Top Revenue Broker</div>
                  <div className="text-xl font-bold text-slate-900">
                    {topRevenueBroker ? topRevenueBroker.broker_name : "\u2014"}
                  </div>
                  <div className="text-sm text-emerald-600 mt-1">
                    {topRevenueBroker ? formatCurrency(topRevenueBroker.estimated_revenue) : "$0.00"}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-sm text-slate-500 mb-1">Average EPC</div>
                  <div className="text-3xl font-bold text-blue-600">${avgEpc.toFixed(2)}</div>
                  <div className="text-xs text-slate-500 mt-1">Across all brokers</div>
                </div>
              </>
            )}
          </div>

          {/* Revenue Projections */}
          {!loading && dailyStats.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Revenue Projections</h2>
                <p className="text-xs text-slate-500 mt-0.5">Estimated based on click velocity and average EPC (${avgEpc.toFixed(2)})</p>
              </div>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Period</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      <div>Est. Clicks</div>
                      <div className="text-[0.6rem] font-normal normal-case text-slate-400">30-day avg</div>
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      <div>Est. Revenue</div>
                      <div className="text-[0.6rem] font-normal normal-case text-slate-400">30-day avg</div>
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      <div>Est. Clicks</div>
                      <div className="text-[0.6rem] font-normal normal-case text-slate-400">7-day trend</div>
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      <div>Est. Revenue</div>
                      <div className="text-[0.6rem] font-normal normal-case text-slate-400">7-day trend</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(["daily", "weekly", "monthly", "annual"] as const).map((period) => {
                    const p = projections[period];
                    const label = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", annual: "Annual" }[period];
                    const isTrendUp = p.rev7d > p.rev30d;
                    const isTrendDown = p.rev7d < p.rev30d * 0.9;
                    return (
                      <tr key={period} className={`hover:bg-slate-50 ${period === "monthly" ? "bg-green-50/50" : ""}`}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{label}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600">{Math.round(p.clicks30d).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">{formatCurrency(p.rev30d)}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600">{Math.round(p.clicks7d).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">
                          <span className={isTrendUp ? "text-emerald-600" : isTrendDown ? "text-red-600" : "text-emerald-600"}>
                            {formatCurrency(p.rev7d)}
                          </span>
                          {(isTrendUp || isTrendDown) && (
                            <span className={`ml-1 text-xs ${isTrendUp ? "text-emerald-500" : "text-red-500"}`}>
                              {isTrendUp ? "\u2191" : "\u2193"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2 bg-slate-50 text-[0.65rem] text-slate-400 border-t border-slate-200">
                Projections based on avg. daily clicks ({avgDailyClicks.toFixed(1)} from 30d, {avgDailyClicksRecent.toFixed(1)} from last 7d) x avg. EPC (${avgEpc.toFixed(2)}).
                These are estimates and actual revenue depends on affiliate conversions.
              </div>
            </div>
          )}

          {/* Revenue Per Broker Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Revenue by Broker</h2>
            </div>
            {loading ? (
              <SkeletonRows count={8} />
            ) : revenueStats.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="text-4xl mb-3">💰</div>
                <div className="font-medium text-slate-500 mb-1">No revenue data yet</div>
                <div className="text-sm">
                  Set EPC values in{" "}
                  <a href="/admin/affiliate-links" className="text-amber-600 hover:underline">
                    Affiliate Links
                  </a>{" "}
                  and track clicks to see estimated revenue.
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Broker
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Clicks
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      EPC
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Est. Revenue
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {revenueStats.map((stat) => {
                    const revPct =
                      totalRevenue > 0 ? (stat.estimated_revenue / totalRevenue) * 100 : 0;
                    return (
                      <tr key={stat.broker_slug} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-900">{stat.broker_name}</td>
                        <td className="px-4 py-2 text-sm text-right text-amber-600 font-semibold">
                          {stat.clicks}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-600">
                          ${stat.estimated_epc.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-emerald-600 font-semibold">
                          {formatCurrency(stat.estimated_revenue)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${revPct}%` }}
                              />
                            </div>
                            <span className="text-slate-500 text-xs w-10 text-right">
                              {revPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100">
                  <tr>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900">Total</td>
                    <td className="px-4 py-2 text-sm text-right text-amber-600 font-bold">
                      {revenueStats.reduce((s, r) => s + r.clicks, 0)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-slate-600">\u2014</td>
                    <td className="px-4 py-2 text-sm text-right text-emerald-600 font-bold">
                      {formatCurrency(totalRevenue)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-slate-500">100%</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {/* ===== CLICK LOG TAB ===== */}
      {activeTab === "log" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Click Log</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 bg-slate-100 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="text-slate-500">
                  Page {page + 1}
                  {totalPages > 0 ? ` of ${totalPages}` : ""}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={recentClicks.length < PAGE_SIZE}
                  className="px-3 py-1 bg-slate-100 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : recentClicks.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No clicks recorded yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Broker
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Source
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Page
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Layer
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentClicks.map((click) => (
                    <tr key={click.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-900">{click.broker_name}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">{click.source || "\u2014"}</td>
                      <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate">
                        {click.page}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">{click.layer || "\u2014"}</td>
                      <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(click.clicked_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
