"use client";

import Link from "next/link";
import CountUp from "@/components/CountUp";

interface HealthIssue {
  type: "success" | "warning" | "error";
  message: string;
  link?: string;
}

interface RecentClick {
  id: number;
  broker_name: string;
  source: string;
  page: string;
  clicked_at: string;
}

interface RevenueByBroker {
  broker_name: string;
  broker_slug: string;
  clicks: number;
  estimated_epc: number;
  estimated_revenue: number;
}

interface Props {
  loading: boolean;
  health: HealthIssue[];
  recentClicks: RecentClick[];
  revenueStats: RevenueByBroker[];
  totalClicks: number;
  marketplaceRevenue: number;
  activeMarketplaceCampaigns: number;
}

export default function AdminBottomGrid({
  loading,
  health,
  recentClicks,
  revenueStats,
  totalClicks,
  marketplaceRevenue,
  activeMarketplaceCampaigns,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Content Health Check */}
      <div id="admin-health" className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Content Health</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-2">
                <div className="h-3 w-3 bg-slate-100 rounded-full mt-1 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-full bg-slate-200 rounded" />
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {health.map((issue, i) => (
              <div key={i} className={`flex items-start gap-2 rounded-md px-2.5 py-2 ${
                issue.type === "error" ? "bg-red-50" :
                issue.type === "success" ? "bg-emerald-50" : "bg-amber-50"
              }`}>
                <span className={`shrink-0 mt-0.5 text-xs ${
                  issue.type === "error" ? "text-red-500" :
                  issue.type === "success" ? "text-emerald-500" : "text-amber-500"
                }`}>
                  {issue.type === "error" ? "●" : issue.type === "success" ? "✓" : "▲"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    issue.type === "error" ? "text-red-800" :
                    issue.type === "success" ? "text-emerald-800" : "text-amber-800"
                  }`}>{issue.message}</p>
                  {issue.link && (
                    <Link href={issue.link} className={`text-xs font-medium ${
                      issue.type === "error" ? "text-red-600 hover:text-red-700" : "text-amber-600 hover:text-amber-700"
                    }`}>
                      Fix →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Clicks */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Clicks</h2>
          <Link href="/admin/analytics" className="text-xs text-amber-600 hover:text-amber-700">View All →</Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-3 w-36 bg-slate-200 rounded" />
                </div>
                <div className="h-3 w-12 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : recentClicks.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🖱️</div>
            <p className="text-sm text-slate-500">No clicks recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">Clicks will appear here once your site gets traffic.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentClicks.map((click) => (
              <div key={click.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <div className="text-slate-900 font-medium truncate">{click.broker_name}</div>
                  <div className="text-xs text-slate-500 truncate">{click.source} · {click.page}</div>
                </div>
                <div className="text-xs text-slate-400 shrink-0 ml-2">
                  {new Date(click.clicked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue Overview */}
      <div id="admin-revenue" className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Revenue</h2>
          <Link href="/admin/analytics" className="text-xs text-amber-600 hover:text-amber-700">Details →</Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 w-full bg-slate-200 rounded mb-1" />
                <div className="h-3 w-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Affiliate Revenue */}
            <div className="bg-emerald-50 rounded-lg p-4 mb-3">
              <div className="text-xs text-emerald-700 font-medium mb-0.5">Affiliate Revenue (Est.)</div>
              <div className="text-2xl font-bold text-emerald-600">
                <CountUp
                  end={revenueStats.reduce((s, r) => s + r.estimated_revenue, 0)}
                  prefix="$"
                  decimals={2}
                  duration={1400}
                />
              </div>
              {totalClicks > 0 && revenueStats.length > 0 && (() => {
                const totalRev = revenueStats.reduce((s, r) => s + r.estimated_revenue, 0);
                const epcAvg = totalRev / revenueStats.reduce((s, r) => s + r.clicks, 0) || 0;
                const dailyClicksAvg = totalClicks / 30;
                return (
                  <div className="mt-2 pt-2 border-t border-emerald-200 space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-600">Monthly proj.</span>
                      <span className="text-emerald-700 font-semibold">
                        ${(dailyClicksAvg * 30 * epcAvg).toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-600">Annual proj.</span>
                      <span className="text-emerald-700 font-semibold">
                        ${(dailyClicksAvg * 365 * epcAvg).toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Marketplace Revenue */}
            <div className="bg-indigo-50 rounded-lg p-4 mb-3">
              <div className="text-xs text-indigo-700 font-medium mb-0.5">Marketplace CPC Revenue</div>
              <div className="text-2xl font-bold text-indigo-600">
                <CountUp
                  end={marketplaceRevenue}
                  prefix="$"
                  decimals={2}
                  duration={1400}
                />
              </div>
              <div className="text-xs text-indigo-500 mt-1">
                {activeMarketplaceCampaigns} active campaign{activeMarketplaceCampaigns !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Top brokers */}
            {revenueStats.length > 0 ? (
              <div className="space-y-1.5 mb-3">
                <div className="text-xs text-slate-500 uppercase font-medium">Top by Affiliate Revenue</div>
                {revenueStats.slice(0, 3).map((r) => {
                  const maxRev = revenueStats[0]?.estimated_revenue || 1;
                  return (
                    <div key={r.broker_slug} className="relative">
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-50 rounded"
                        style={{ width: `${(r.estimated_revenue / maxRev) * 100}%` }}
                      />
                      <div className="relative flex items-center justify-between text-sm py-1 px-2">
                        <span className="text-slate-700 truncate">{r.broker_name}</span>
                        <span className="text-emerald-600 font-semibold ml-2 shrink-0">
                          ${r.estimated_revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-3">No revenue data yet. Set EPC values in Affiliate Links.</p>
            )}

            <div id="admin-shortcuts" className="pt-3 border-t border-slate-200 space-y-1.5">
              <Link href="/admin/bd-pipeline" className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded text-violet-700 hover:bg-violet-100 transition-colors text-sm font-semibold">
                <span>🤝</span> BD Pipeline
              </Link>
              <Link href="/admin/fee-queue" className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                <span>💰</span> Fee Queue
              </Link>
              <Link href="/admin/affiliate-links" className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                <span>🔗</span> Affiliate Links
              </Link>
              <Link href="/admin/marketplace" className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                <span>🏪</span> Marketplace
              </Link>
              <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                <span>🌐</span> View Live Site
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
