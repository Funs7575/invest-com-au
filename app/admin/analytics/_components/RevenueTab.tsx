"use client";

import Sparkline from "@/components/Sparkline";
import SVGBarChart from "@/components/charts/SVGBarChart";
import SVGLineChart from "@/components/charts/SVGLineChart";
import { SkeletonCard, SkeletonRows } from "./AnalyticsSkeletons";

interface RevenueByBroker {
  broker_name: string;
  broker_slug: string;
  clicks: number;
  estimated_epc: number;
  estimated_revenue: number;
}

interface Projections {
  daily: { clicks30d: number; clicks7d: number; rev30d: number; rev7d: number };
  weekly: { clicks30d: number; clicks7d: number; rev30d: number; rev7d: number };
  monthly: { clicks30d: number; clicks7d: number; rev30d: number; rev7d: number };
  annual: { clicks30d: number; clicks7d: number; rev30d: number; rev7d: number };
}

interface RevenueTabProps {
  loading: boolean;
  revenueStats: RevenueByBroker[];
  totalRevenue: number;
  topRevenueBroker: RevenueByBroker | null;
  avgEpc: number;
  campaignRevenue: {
    total: number;
    byPlacement: { name: string; amount: number }[];
    topSpenders: { slug: string; name: string; spend: number; trend: number[] }[];
  };
  monthlyRevenueTrend: { month: string; revenue: number }[];
  projections: Projections;
  avgDailyClicks: number;
  avgDailyClicksRecent: number;
  dailyStatsLength: number;
  formatCurrency: (val: number) => string;
}

export default function RevenueTab({
  loading,
  revenueStats,
  totalRevenue,
  topRevenueBroker,
  avgEpc,
  campaignRevenue,
  monthlyRevenueTrend,
  projections,
  avgDailyClicks,
  avgDailyClicksRecent,
  dailyStatsLength,
  formatCurrency,
}: RevenueTabProps) {
  return (
    <>
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-sm text-slate-500 mb-1">Total Est. Revenue</div>
              <div className="text-3xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</div>
              <div className="text-xs text-slate-500 mt-1">Affiliate EPC x clicks</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-sm text-slate-500 mb-1">Marketplace Revenue</div>
              <div className="text-3xl font-bold text-blue-600">{formatCurrency(campaignRevenue.total)}</div>
              <div className="text-xs text-slate-500 mt-1">Campaign spend total</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-sm text-slate-500 mb-1">Top Revenue Broker</div>
              <div className="text-xl font-bold text-slate-900">{topRevenueBroker ? topRevenueBroker.broker_name : "\u2014"}</div>
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

      {/* Monthly Revenue Trend Line Chart */}
      {!loading && monthlyRevenueTrend.length >= 2 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Monthly Revenue Trend</h2>
            <p className="text-xs text-slate-500">Last {monthlyRevenueTrend.length} months of marketplace campaign revenue.</p>
          </div>
          <div className="p-4">
            <SVGLineChart
              data={monthlyRevenueTrend.map((m) => ({ label: m.month, value: m.revenue }))}
              color="#2563eb"
              formatValue={(v) => `$${v.toFixed(0)}`}
              width={600}
              height={220}
            />
          </div>
        </div>
      )}

      {/* Revenue by Placement Type */}
      {!loading && campaignRevenue.byPlacement.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Revenue by Placement</h2>
          </div>
          <div className="p-4">
            <SVGBarChart
              data={campaignRevenue.byPlacement.map((p) => ({
                label: p.name,
                value: p.amount,
                color: "#2563eb",
              }))}
              formatValue={(v) => `$${v.toFixed(0)}`}
              width={600}
            />
          </div>
        </div>
      )}

      {/* Top Spending Brokers with Sparklines */}
      {!loading && campaignRevenue.topSpenders.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Top Spending Brokers</h2>
            <p className="text-xs text-slate-500">Marketplace campaign spend with 6-month trends.</p>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Broker</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Total Spend</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Trend (6mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {campaignRevenue.topSpenders.map((b) => (
                <tr key={b.slug} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{b.name}</td>
                  <td className="px-4 py-3 text-sm text-right text-emerald-600 font-semibold">${b.spend.toFixed(0)}</td>
                  <td className="px-4 py-3 text-center">
                    <Sparkline data={b.trend} color="#2563eb" width={80} height={20} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Revenue Projections */}
      {!loading && dailyStatsLength > 0 && (
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
                  <tr key={period} className={`hover:bg-slate-50 ${period === "monthly" ? "bg-emerald-50/50" : ""}`}>
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
            <div className="text-4xl mb-3">&#128176;</div>
            <div className="font-medium text-slate-500 mb-1">No revenue data yet</div>
            <div className="text-sm">
              Set EPC values in{" "}
              <a href="/admin/affiliate-links" className="text-amber-600 hover:underline">Affiliate Links</a>{" "}
              and track clicks to see estimated revenue.
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Broker</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Clicks</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">EPC</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Est. Revenue</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {revenueStats.map((stat) => {
                const revPct = totalRevenue > 0 ? (stat.estimated_revenue / totalRevenue) * 100 : 0;
                return (
                  <tr key={stat.broker_slug} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-900">{stat.broker_name}</td>
                    <td className="px-4 py-2 text-sm text-right text-amber-600 font-semibold">{stat.clicks}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-600">${stat.estimated_epc.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right text-emerald-600 font-semibold">{formatCurrency(stat.estimated_revenue)}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${revPct}%` }} />
                        </div>
                        <span className="text-slate-500 text-xs w-10 text-right">{revPct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100">
              <tr>
                <td className="px-4 py-2 text-sm font-semibold text-slate-900">Total</td>
                <td className="px-4 py-2 text-sm text-right text-amber-600 font-bold">{revenueStats.reduce((s, r) => s + r.clicks, 0)}</td>
                <td className="px-4 py-2 text-sm text-right text-slate-600">{"\u2014"}</td>
                <td className="px-4 py-2 text-sm text-right text-emerald-600 font-bold">{formatCurrency(totalRevenue)}</td>
                <td className="px-4 py-2 text-sm text-right text-slate-500">100%</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}
