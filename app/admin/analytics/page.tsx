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

export default function AdminAnalyticsPage() {
  const [recentClicks, setRecentClicks] = useState<ClickRow[]>([]);
  const [brokerStats, setBrokerStats] = useState<BrokerClickStat[]>([]);
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [clicksToday, setClicksToday] = useState(0);
  const [clicksThisMonth, setClicksThisMonth] = useState(0);
  const [emailCaptures, setEmailCaptures] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Batch all queries in parallel
      const [
        recentRes,
        totalRes,
        todayRes,
        monthRes,
        emailRes,
        brokerStatsRes,
        sourceStatsRes,
      ] = await Promise.all([
        // Recent clicks with pagination
        supabase
          .from("affiliate_clicks")
          .select("id, broker_name, broker_slug, source, page, clicked_at")
          .order("clicked_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
        // Total count
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true }),
        // Today count
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .gte("clicked_at", today),
        // This month count
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .gte("clicked_at", monthStart.toISOString()),
        // Email captures
        supabase
          .from("email_captures")
          .select("id", { count: "exact", head: true }),
        // Per-broker stats via DB aggregate (replaces full-table scan)
        supabase.rpc("get_click_stats_by_broker"),
        // Per-source stats via DB aggregate (fixes the page-only bug)
        supabase.rpc("get_click_stats_by_source"),
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

      setLoading(false);
    }

    load();
  }, [page]);

  const totalPages = Math.ceil(totalClicks / PAGE_SIZE);

  // Skeleton card component
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

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-white mb-6">Affiliate Click Analytics</h1>

      {/* Summary Cards */}
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
              <div className="text-3xl font-bold text-blue-400">{clicksThisMonth}</div>
              <div className="text-sm text-slate-400">This Month</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-3xl font-bold text-cyan-400">{emailCaptures}</div>
              <div className="text-sm text-slate-400">Email Captures</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Per-Broker Stats */}
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Broker</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">Clicks</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400 uppercase">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {brokerStats.map((stat) => (
                  <tr key={stat.broker_slug} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-sm text-white">{stat.broker_name}</td>
                    <td className="px-4 py-2 text-sm text-right text-amber-400 font-semibold">{stat.count}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-400">
                      {totalClicks > 0 ? ((stat.count / totalClicks) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Sources (now from DB aggregate, not page-only data) */}
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
                      <span className="text-white font-semibold">{stat.count} ({pct.toFixed(1)}%)</span>
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

      {/* Full Click Log */}
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
              Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ""}
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Broker</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Source</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Page</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {recentClicks.map((click) => (
                  <tr key={click.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-sm text-white">{click.broker_name}</td>
                    <td className="px-4 py-2 text-xs text-slate-300">{click.source || "—"}</td>
                    <td className="px-4 py-2 text-xs text-slate-400 max-w-[200px] truncate">{click.page}</td>
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
    </AdminShell>
  );
}
