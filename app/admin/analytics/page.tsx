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

export default function AdminAnalyticsPage() {
  const [recentClicks, setRecentClicks] = useState<ClickRow[]>([]);
  const [brokerStats, setBrokerStats] = useState<BrokerClickStat[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [clicksToday, setClicksToday] = useState(0);
  const [clicksThisMonth, setClicksThisMonth] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // Recent clicks
      const { data: recent } = await supabase
        .from("affiliate_clicks")
        .select("id, broker_name, broker_slug, source, page, clicked_at")
        .order("clicked_at", { ascending: false })
        .limit(50);
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

      // Per-broker stats
      const { data: allClicks } = await supabase
        .from("affiliate_clicks")
        .select("broker_name, broker_slug");

      if (allClicks) {
        const counts: Record<string, BrokerClickStat> = {};
        allClicks.forEach((c) => {
          const key = c.broker_slug || "unknown";
          if (!counts[key]) counts[key] = { broker_name: c.broker_name || key, broker_slug: key, count: 0 };
          counts[key].count++;
        });
        const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
        setBrokerStats(sorted);
      }
    }

    load();
  }, []);

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-white mb-6">Affiliate Click Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {brokerStats.map((stat) => (
                  <tr key={stat.broker_slug} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-sm text-white">{stat.broker_name}</td>
                    <td className="px-4 py-2 text-sm text-right text-amber-400 font-semibold">{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Clicks */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Recent Clicks</h2>
          </div>
          {recentClicks.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No clicks recorded yet.</div>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Broker</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Page</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {recentClicks.map((click) => (
                    <tr key={click.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-2 text-sm text-white">{click.broker_name}</td>
                      <td className="px-4 py-2 text-xs text-slate-400 max-w-[150px] truncate">{click.page}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">
                        {new Date(click.clicked_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
