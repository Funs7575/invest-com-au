"use client";

import { SkeletonRows } from "./AnalyticsSkeletons";

interface DailyClickStat {
  day: string;
  clicks: number;
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

interface PageStat {
  page: string;
  count: number;
}

interface OverviewTabProps {
  loading: boolean;
  dailyStats: DailyClickStat[];
  brokerStats: BrokerClickStat[];
  sourceStats: SourceStat[];
  pageStats: PageStat[];
  totalClicks: number;
  maxDailyClicks: number;
  dateRange: string;
}

export default function OverviewTab({
  loading,
  dailyStats,
  brokerStats,
  sourceStats,
  pageStats,
  totalClicks,
  maxDailyClicks,
  dateRange,
}: OverviewTabProps) {
  return (
    <>
      {/* Daily Click Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Click Trend ({dateRange === "7d" ? "Last 7 Days" : dateRange === "90d" ? "Last 90 Days" : dateRange === "custom" ? "Custom Range" : "Last 30 Days"})</h2>
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
                  <div key={d.day} className="flex-1 group relative" title={`${d.day}: ${d.clicks} clicks`}>
                    <div className="flex flex-col items-center justify-end h-40">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {new Date(d.day + "T00:00:00").toLocaleDateString("en-AU", { month: "short", day: "numeric" })}: {d.clicks}
                      </div>
                      <div
                        className="w-full bg-emerald-600 rounded-t transition-all hover:bg-emerald-500"
                        style={{ height: `${Math.max(heightPct, 2)}%`, minHeight: d.clicks > 0 ? "4px" : "2px" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{dailyStats.length > 0 && new Date(dailyStats[0].day + "T00:00:00").toLocaleDateString("en-AU", { month: "short", day: "numeric" })}</span>
              <span>{dailyStats.length > 0 && new Date(dailyStats[dailyStats.length - 1].day + "T00:00:00").toLocaleDateString("en-AU", { month: "short", day: "numeric" })}</span>
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Broker</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Clicks</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {brokerStats.map((stat) => (
                  <tr key={stat.broker_slug} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-900">{stat.broker_name}</td>
                    <td className="px-4 py-2 text-sm text-right text-amber-600 font-semibold">{stat.count}</td>
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
                      <span className="text-slate-900 font-semibold">{stat.count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Page</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Clicks</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Share</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pageStats.slice(0, 15).map((stat) => {
                const pct = totalClicks > 0 ? (stat.count / totalClicks) * 100 : 0;
                return (
                  <tr key={stat.page} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-900 max-w-xs truncate">{stat.page}</td>
                    <td className="px-4 py-2 text-sm text-right text-amber-600 font-semibold">{stat.count}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-500">{pct.toFixed(1)}%</td>
                    <td className="px-4 py-2 w-32">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
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
  );
}
