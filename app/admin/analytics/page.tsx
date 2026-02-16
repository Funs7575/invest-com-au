"use client";

import { useEffect, useState } from "react";
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
  const PAGE_SIZE = 25;

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [
        recentRes,
        totalRes,
        todayRes,
        monthRes,
        emailRes,
        brokerStatsRes,
        sourceStatsRes,
        dailyStatsRes,
        revenueStatsRes,
      ] = await Promise.all([
        supabase
          .from("affiliate_clicks")
          .select("id, broker_name, broker_slug, source, page, layer, clicked_at")
          .order("clicked_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
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
        supabase.rpc("get_daily_click_stats", { days_back: 30 }),
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

      // Compute page stats from recent clicks (client-side for now)
      if (recentRes.data) {
        const pageMap: Record<string, number> = {};
        // We use the full click log to compute page stats - fetch all for this
        const allPagesRes = await supabase
          .from("affiliate_clicks")
          .select("page")
          .not("page", "is", null);
        if (allPagesRes.data) {
          allPagesRes.data.forEach((r: { page: string }) => {
            const p = r.page || "(unknown)";
            pageMap[p] = (pageMap[p] || 0) + 1;
          });
        }
        const sorted = Object.entries(pageMap)
          .map(([pg, count]) => ({ page: pg, count }))
          .sort((a, b) => b.count - a.count);
        setPageStats(sorted);
      }

      setLoading(false);
    }

    load();
  }, [page]);

  const totalPages = Math.ceil(totalClicks / PAGE_SIZE);
  const totalRevenue = revenueStats.reduce((sum, r) => sum + r.estimated_revenue, 0);
  const topRevenueBroker = revenueStats.length > 0 ? revenueStats[0] : null;
  const avgEpc =
    revenueStats.length > 0
      ? revenueStats.reduce((sum, r) => sum + r.estimated_epc, 0) / revenueStats.length
      : 0;
  const maxDailyClicks = dailyStats.length > 0 ? Math.max(...dailyStats.map((d) => d.clicks)) : 0;

  const SkeletonCard = () => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse">
      <div className="h-8 w-16 bg-slate-700 rounded mb-2" />
      <div className="h-4 w-24 bg-slate-700 rounded" />
    </div>
  );

  const SkeletonRows = ({ count = 5 }: { count?: number }) => (
    <div className="p-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex justify-between">
          <div className="h-4 w-32 bg-slate-700 rounded" />
          <div className="h-4 w-12 bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  );

  const formatCurrency = (val: number) =>
    val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(2)}`;

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Analytics & Revenue</h1>
        <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {(["overview", "revenue", "log"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-amber-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "revenue" ? "Revenue" : "Click Log"}
            </button>
          ))}
        </div>
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
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-400">{totalClicks}</div>
              <div className="text-sm text-slate-400">Total Clicks</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">{clicksToday}</div>
              <div className="text-sm text-slate-400">Today</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-3xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</div>
              <div className="text-sm text-slate-400">Est. Revenue</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-3xl font-bold text-cyan-400">{emailCaptures}</div>
              <div className="text-sm text-slate-400">Email Captures</div>
            </div>
          </>
        )}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === "overview" && (
        <>
          {/* Daily Click Trend Chart */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Click Trend (Last 30 Days)</h2>
            </div>
            {loading ? (
              <div className="p-4 h-48 animate-pulse bg-slate-700/20" />
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
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {new Date(d.day + "T00:00:00").toLocaleDateString("en-AU", {
                              month: "short",
                              day: "numeric",
                            })}
                            : {d.clicks}
                          </div>
                          <div
                            className="w-full bg-amber-500 rounded-t transition-all hover:bg-amber-400"
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
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Clicks by Broker</h2>
              </div>
              {loading ? (
                <SkeletonRows count={6} />
              ) : brokerStats.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No click data yet.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                        Broker
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                        Clicks
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {brokerStats.map((stat) => (
                      <tr key={stat.broker_slug} className="hover:bg-slate-700/30">
                        <td className="px-4 py-2 text-sm text-white">{stat.broker_name}</td>
                        <td className="px-4 py-2 text-sm text-right text-amber-400 font-semibold">
                          {stat.count}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-400">
                          {totalClicks > 0 ? ((stat.count / totalClicks) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top Sources */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Top Sources</h2>
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
                          <span className="text-slate-300">{stat.source}</span>
                          <span className="text-white font-semibold">
                            {stat.count} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
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
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Clicks by Page</h2>
            </div>
            {loading ? (
              <SkeletonRows count={6} />
            ) : pageStats.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No click data yet.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                      Page
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      Clicks
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      Share
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      Bar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {pageStats.slice(0, 15).map((stat) => {
                    const pct = totalClicks > 0 ? (stat.count / totalClicks) * 100 : 0;
                    return (
                      <tr key={stat.page} className="hover:bg-slate-700/30">
                        <td className="px-4 py-2 text-sm text-white max-w-xs truncate">
                          {stat.page}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-amber-400 font-semibold">
                          {stat.count}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-400">
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 w-32">
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
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
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                  <div className="text-sm text-slate-400 mb-1">Total Estimated Revenue</div>
                  <div className="text-3xl font-bold text-emerald-400">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Based on EPC × clicks</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                  <div className="text-sm text-slate-400 mb-1">Top Revenue Broker</div>
                  <div className="text-xl font-bold text-white">
                    {topRevenueBroker ? topRevenueBroker.broker_name : "—"}
                  </div>
                  <div className="text-sm text-emerald-400 mt-1">
                    {topRevenueBroker ? formatCurrency(topRevenueBroker.estimated_revenue) : "$0.00"}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                  <div className="text-sm text-slate-400 mb-1">Average EPC</div>
                  <div className="text-3xl font-bold text-blue-400">${avgEpc.toFixed(2)}</div>
                  <div className="text-xs text-slate-500 mt-1">Across all brokers</div>
                </div>
              </>
            )}
          </div>

          {/* Revenue Per Broker Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Revenue by Broker</h2>
            </div>
            {loading ? (
              <SkeletonRows count={8} />
            ) : revenueStats.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="text-4xl mb-3">💰</div>
                <div className="font-medium text-slate-400 mb-1">No revenue data yet</div>
                <div className="text-sm">
                  Set EPC values in{" "}
                  <a href="/admin/affiliate-links" className="text-amber-400 hover:underline">
                    Affiliate Links
                  </a>{" "}
                  and track clicks to see estimated revenue.
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                      Broker
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      Clicks
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      EPC
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      Est. Revenue
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {revenueStats.map((stat) => {
                    const revPct =
                      totalRevenue > 0 ? (stat.estimated_revenue / totalRevenue) * 100 : 0;
                    return (
                      <tr key={stat.broker_slug} className="hover:bg-slate-700/30">
                        <td className="px-4 py-2 text-sm text-white">{stat.broker_name}</td>
                        <td className="px-4 py-2 text-sm text-right text-amber-400 font-semibold">
                          {stat.clicks}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-300">
                          ${stat.estimated_epc.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-emerald-400 font-semibold">
                          {formatCurrency(stat.estimated_revenue)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${revPct}%` }}
                              />
                            </div>
                            <span className="text-slate-400 text-xs w-10 text-right">
                              {revPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-700/30">
                  <tr>
                    <td className="px-4 py-2 text-sm font-semibold text-white">Total</td>
                    <td className="px-4 py-2 text-sm text-right text-amber-400 font-bold">
                      {revenueStats.reduce((s, r) => s + r.clicks, 0)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-slate-300">—</td>
                    <td className="px-4 py-2 text-sm text-right text-emerald-400 font-bold">
                      {formatCurrency(totalRevenue)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-slate-400">100%</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {/* ===== CLICK LOG TAB ===== */}
      {activeTab === "log" && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Click Log</h2>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="text-slate-400">
                Page {page + 1}
                {totalPages > 0 ? ` of ${totalPages}` : ""}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={recentClicks.length < PAGE_SIZE}
                className="px-3 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-4 w-24 bg-slate-700 rounded" />
                  <div className="h-4 w-20 bg-slate-700 rounded" />
                  <div className="h-4 w-32 bg-slate-700 rounded" />
                  <div className="h-4 w-16 bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : recentClicks.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No clicks recorded yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                      Broker
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                      Source
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                      Page
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                      Layer
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {recentClicks.map((click) => (
                    <tr key={click.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-2 text-sm text-white">{click.broker_name}</td>
                      <td className="px-4 py-2 text-xs text-slate-300">{click.source || "—"}</td>
                      <td className="px-4 py-2 text-xs text-slate-400 max-w-[200px] truncate">
                        {click.page}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-400">{click.layer || "—"}</td>
                      <td className="px-4 py-2 text-xs text-slate-400 whitespace-nowrap">
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
