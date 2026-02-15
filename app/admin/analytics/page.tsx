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
  layer: string | null;
  clicked_at: string;
}

interface BrokerClickStat {
  broker_name: string;
  broker_slug: string;
  count: number;
}

interface LayerStat {
  layer: string;
  count: number;
}

export default function AdminAnalyticsPage() {
  const [recentClicks, setRecentClicks] = useState<ClickRow[]>([]);
  const [brokerStats, setBrokerStats] = useState<BrokerClickStat[]>([]);
  const [layerStats, setLayerStats] = useState<LayerStat[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [clicksToday, setClicksToday] = useState(0);
  const [clicksThisMonth, setClicksThisMonth] = useState(0);
  const [emailCaptures, setEmailCaptures] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // Recent clicks with pagination
      const { data: recent } = await supabase
        .from("affiliate_clicks")
        .select("id, broker_name, broker_slug, source, page, layer, clicked_at")
        .order("clicked_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (recent) setRecentClicks(recent);

      // Total count
      const { count: total } = await supabase
        .from("affiliate_clicks")
        .select("id", { count: "exact", head: true });
      setTotalClicks(total || 0);

      // Today
      const today = new Date().toISOString().split("T")[0];
      const { count: todayCount } = await supabase
        .from("affiliate_clicks")
        .select("id", { count: "exact", head: true })
        .gte("clicked_at", today);
      setClicksToday(todayCount || 0);

      // This month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count: monthCount } = await supabase
        .from("affiliate_clicks")
        .select("id", { count: "exact", head: true })
        .gte("clicked_at", monthStart.toISOString());
      setClicksThisMonth(monthCount || 0);

      // Email captures
      const { count: emailCount } = await supabase
        .from("email_captures")
        .select("id", { count: "exact", head: true });
      setEmailCaptures(emailCount || 0);

      // Per-broker and layer stats
      const { data: allClicks } = await supabase
        .from("affiliate_clicks")
        .select("broker_name, broker_slug, layer");

      if (allClicks) {
        const counts: Record<string, BrokerClickStat> = {};
        const layers: Record<string, number> = {};

        allClicks.forEach((c) => {
          const key = c.broker_slug || "unknown";
          if (!counts[key]) counts[key] = { broker_name: c.broker_name || key, broker_slug: key, count: 0 };
          counts[key].count++;

          const layerKey = c.layer || "direct";
          layers[layerKey] = (layers[layerKey] || 0) + 1;
        });

        setBrokerStats(Object.values(counts).sort((a, b) => b.count - a.count));
        setLayerStats(
          Object.entries(layers)
            .map(([layer, count]) => ({ layer, count }))
            .sort((a, b) => b.count - a.count)
        );
      }
    }

    load();
  }, [page]);

  const totalPages = Math.ceil(totalClicks / PAGE_SIZE);

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-white mb-6">Affiliate Click Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Per-Broker Stats */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Clicks by Broker</h2>
          </div>
          {brokerStats.length === 0 ? (
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

        {/* Clicks by Layer/Intent */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Clicks by Layer</h2>
          </div>
          {layerStats.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No click data yet.</div>
          ) : (
            <div className="p-4 space-y-3">
              {layerStats.map((stat) => {
                const pct = totalClicks > 0 ? (stat.count / totalClicks) * 100 : 0;
                return (
                  <div key={stat.layer}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 capitalize">{stat.layer}</span>
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

        {/* Source Breakdown */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Top Sources</h2>
          </div>
          {recentClicks.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No click data yet.</div>
          ) : (
            <div className="p-4">
              {(() => {
                const sources: Record<string, number> = {};
                recentClicks.forEach((c) => {
                  const s = c.source || "unknown";
                  sources[s] = (sources[s] || 0) + 1;
                });
                const sorted = Object.entries(sources).sort(([, a], [, b]) => b - a);
                return (
                  <div className="space-y-2">
                    {sorted.map(([source, count]) => (
                      <div key={source} className="flex justify-between text-sm">
                        <span className="text-slate-300">{source}</span>
                        <span className="text-white font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
        {recentClicks.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No clicks recorded yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Broker</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Source</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Layer</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Page</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {recentClicks.map((click) => (
                  <tr key={click.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-sm text-white">{click.broker_name}</td>
                    <td className="px-4 py-2 text-xs text-slate-300">{click.source || "—"}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                        {click.layer || "direct"}
                      </span>
                    </td>
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
