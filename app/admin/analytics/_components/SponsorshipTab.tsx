"use client";

import { TIER_PRICING } from "@/lib/sponsorship";
import { SkeletonRows } from "./AnalyticsSkeletons";
import type { Broker } from "@/lib/types";

interface BrokerClickStat {
  broker_name: string;
  broker_slug: string;
  count: number;
}

interface SponsorshipTabProps {
  loading: boolean;
  sponsoredBrokers: Broker[];
  sponsorClickStats: Record<string, number>;
  brokerStats: BrokerClickStat[];
  totalClicks: number;
}

export default function SponsorshipTab({
  loading,
  sponsoredBrokers,
  sponsorClickStats,
  brokerStats,
  totalClicks,
}: SponsorshipTabProps) {
  return (
    <div className="space-y-6">
      {(() => {
        const monthlyRevenue = sponsoredBrokers.reduce((sum, b) => {
          const tier = b.sponsorship_tier;
          return sum + (tier && TIER_PRICING[tier] ? TIER_PRICING[tier].monthly : 0);
        }, 0);
        const annualProjection = monthlyRevenue * 12;
        const expiringIn30 = sponsoredBrokers.filter((b) => {
          if (!b.sponsorship_end) return false;
          const end = new Date(b.sponsorship_end);
          const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysLeft >= 0 && daysLeft <= 30;
        });
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-sm text-slate-500 mb-1">Active Sponsorships</div>
              <div className="text-3xl font-bold text-blue-600">{sponsoredBrokers.length}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-sm text-slate-500 mb-1">Monthly Revenue</div>
              <div className="text-3xl font-bold text-emerald-600">${monthlyRevenue.toLocaleString()}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-sm text-slate-500 mb-1">Annual Projection</div>
              <div className="text-3xl font-bold text-emerald-600">${annualProjection.toLocaleString()}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-sm text-slate-500 mb-1">Expiring Soon</div>
              <div className={`text-3xl font-bold ${expiringIn30.length > 0 ? "text-amber-600" : "text-slate-400"}`}>{expiringIn30.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">within 30 days</div>
            </div>
          </div>
        );
      })()}

      {/* Active Sponsorships Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Active Sponsorships</h2>
        </div>
        {loading ? (
          <SkeletonRows count={4} />
        ) : sponsoredBrokers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="font-medium mb-1">No Active Sponsorships</p>
            <p className="text-sm">Set a broker&apos;s <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">sponsorship_tier</code> in the broker editor to activate.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Broker</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Tier</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Monthly</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Start</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">End</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Days Left</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sponsoredBrokers.map((b) => {
                const tier = b.sponsorship_tier;
                const pricing = tier && TIER_PRICING[tier] ? TIER_PRICING[tier] : null;
                const endDate = b.sponsorship_end ? new Date(b.sponsorship_end) : null;
                const daysLeft = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const clicks = sponsorClickStats[b.slug] || 0;
                const daysColor = daysLeft === null ? "text-slate-400" : daysLeft < 3 ? "text-red-600 font-bold" : daysLeft < 14 ? "text-amber-600 font-semibold" : "text-emerald-600";
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{b.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        tier === "featured_partner" ? "bg-blue-50 text-blue-700" :
                        tier === "editors_pick" ? "bg-emerald-50 text-emerald-700" :
                        "bg-amber-50 text-amber-700"
                      }`}>{pricing?.label || tier}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-600 font-semibold">${pricing?.monthly.toLocaleString() || "\u2014"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {b.sponsorship_start ? new Date(b.sponsorship_start).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {endDate ? endDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "Ongoing"}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${daysColor}`}>
                      {daysLeft !== null ? (daysLeft < 0 ? "Expired" : `${daysLeft}d`) : "\u221E"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-amber-600 font-semibold">{clicks}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100">
              <tr>
                <td className="px-4 py-2 text-sm font-semibold text-slate-900">Total</td>
                <td className="px-4 py-2 text-xs text-slate-500">{sponsoredBrokers.length} active</td>
                <td className="px-4 py-2 text-sm text-right text-emerald-600 font-bold">
                  ${sponsoredBrokers.reduce((s, b) => s + (b.sponsorship_tier && TIER_PRICING[b.sponsorship_tier] ? TIER_PRICING[b.sponsorship_tier].monthly : 0), 0).toLocaleString()}
                </td>
                <td colSpan={2} />
                <td />
                <td className="px-4 py-2 text-sm text-right text-amber-600 font-bold">
                  {Object.values(sponsorClickStats).reduce((s, c) => s + c, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Sponsored vs Organic Click Share */}
      {sponsoredBrokers.length > 0 && brokerStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Sponsored vs Organic Click Share</h2>
          </div>
          <div className="p-4">
            {(() => {
              const sponsoredSlugs = new Set(sponsoredBrokers.map((b) => b.slug));
              const sponsoredClicks = brokerStats.filter((s) => sponsoredSlugs.has(s.broker_slug)).reduce((sum, s) => sum + s.count, 0);
              const organicClicks = totalClicks - sponsoredClicks;
              const sponsoredPct = totalClicks > 0 ? (sponsoredClicks / totalClicks) * 100 : 0;
              const organicPct = 100 - sponsoredPct;
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-500 rounded-l-full transition-all" style={{ width: `${sponsoredPct}%` }} />
                      <div className="h-full bg-slate-300 rounded-r-full transition-all" style={{ width: `${organicPct}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span className="text-slate-700">Sponsored: <strong>{sponsoredClicks}</strong> ({sponsoredPct.toFixed(1)}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-slate-300" />
                      <span className="text-slate-700">Organic: <strong>{organicClicks}</strong> ({organicPct.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Upcoming Expirations */}
      {(() => {
        const expiring = sponsoredBrokers
          .filter((b) => b.sponsorship_end)
          .map((b) => {
            const end = new Date(b.sponsorship_end!);
            const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return { ...b, daysLeft, endDate: end };
          })
          .filter((b) => b.daysLeft >= 0 && b.daysLeft <= 30)
          .sort((a, b) => a.daysLeft - b.daysLeft);
        if (expiring.length === 0) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-200">
              <h2 className="text-lg font-semibold text-amber-900">Upcoming Expirations</h2>
              <p className="text-xs text-amber-700">Sponsorships expiring in the next 30 days.</p>
            </div>
            <div className="p-4 space-y-3">
              {expiring.map((b) => (
                <div key={b.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                  <div>
                    <span className="font-semibold text-sm text-slate-900">{b.name}</span>
                    <span className="text-xs text-slate-500 ml-2">{b.sponsorship_tier && TIER_PRICING[b.sponsorship_tier]?.label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${b.daysLeft < 3 ? "text-red-600" : b.daysLeft < 14 ? "text-amber-600" : "text-amber-500"}`}>
                      {b.daysLeft === 0 ? "Expires today" : `${b.daysLeft} day${b.daysLeft !== 1 ? "s" : ""} left`}
                    </span>
                    <div className="text-xs text-slate-400">
                      {b.endDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
