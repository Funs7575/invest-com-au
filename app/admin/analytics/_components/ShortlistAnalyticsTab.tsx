"use client";

import SVGBarChart from "@/components/charts/SVGBarChart";

interface ShortlistAnalytics {
  totalShares: number;
  avgSize: number;
  topBrokers: { slug: string; count: number }[];
  totalViews: number;
}

interface ShortlistAnalyticsTabProps {
  shortlistAnalytics: ShortlistAnalytics;
}

export default function ShortlistAnalyticsTab({ shortlistAnalytics }: ShortlistAnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-sm text-slate-500 mb-1">Shared Shortlists</div>
          <div className="text-3xl font-bold text-purple-600">{shortlistAnalytics.totalShares}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-sm text-slate-500 mb-1">Avg Shortlist Size</div>
          <div className="text-3xl font-bold text-blue-600">{shortlistAnalytics.avgSize.toFixed(1)}</div>
          <div className="text-xs text-slate-500 mt-1">brokers per shortlist</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-sm text-slate-500 mb-1">Total Share Views</div>
          <div className="text-3xl font-bold text-amber-600">{shortlistAnalytics.totalViews}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-sm text-slate-500 mb-1">Share Rate</div>
          <div className="text-3xl font-bold text-emerald-600">
            {shortlistAnalytics.totalShares > 0 && shortlistAnalytics.totalViews > 0
              ? ((shortlistAnalytics.totalViews / shortlistAnalytics.totalShares)).toFixed(1)
              : "0"}
          </div>
          <div className="text-xs text-slate-500 mt-1">avg views per share</div>
        </div>
      </div>

      {/* Most Shortlisted Brokers */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Most Shortlisted Brokers</h2>
          <p className="text-xs text-slate-500">Brokers that appear most frequently in shared shortlists.</p>
        </div>
        {shortlistAnalytics.topBrokers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No shared shortlists yet. Data will appear once users share their shortlists.</div>
        ) : (
          <div className="p-4">
            <SVGBarChart
              data={shortlistAnalytics.topBrokers.map((b) => ({
                label: b.slug,
                value: b.count,
              }))}
              color="#7c3aed"
              formatValue={(v) => `${v} times`}
              width={600}
            />
          </div>
        )}
      </div>
    </div>
  );
}
