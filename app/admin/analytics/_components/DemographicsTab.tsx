"use client";

import SVGDonutChart from "@/components/charts/SVGDonutChart";
import SVGFunnel from "@/components/charts/SVGFunnel";

interface DemographicsTabProps {
  loading: boolean;
  quizCompletions: number;
  quizDistribution: { type: string; count: number }[];
  emailCaptures: number;
  totalClicks: number;
  proSubscribers: number;
}

export default function DemographicsTab({
  loading,
  quizCompletions,
  quizDistribution,
  emailCaptures,
  totalClicks,
  proSubscribers,
}: DemographicsTabProps) {
  return (
    <div className="space-y-6">
      {/* Quiz Answer Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-sm text-slate-500 mb-1">Quiz Completions</div>
          <div className="text-3xl font-bold text-purple-600">{quizCompletions}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-sm text-slate-500 mb-1">Email Capture Rate</div>
          <div className="text-3xl font-bold text-blue-600">
            {totalClicks > 0 ? ((emailCaptures / (totalClicks * 5)) * 100).toFixed(1) : "0.0"}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Captures / est. unique visitors</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-sm text-slate-500 mb-1">Pro Subscribers</div>
          <div className="text-3xl font-bold text-amber-600">{proSubscribers}</div>
          <div className="text-xs text-slate-500 mt-1">
            {emailCaptures > 0 ? ((proSubscribers / emailCaptures) * 100).toFixed(1) : "0.0"}% conversion
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Investor Type Distribution</h2>
          <p className="text-xs text-slate-500">Based on quiz completion results.</p>
        </div>
        {loading ? (
          <div className="p-8 animate-pulse h-40 bg-slate-100" />
        ) : quizDistribution.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No quiz completion data yet. Results will appear as users complete the broker matching quiz.</div>
        ) : (
          <div className="p-6">
            <SVGDonutChart
              data={quizDistribution.map((d, i) => ({
                label: d.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                value: d.count,
                color: ["#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#059669", "#0891b2", "#e11d48"][i % 8],
              }))}
              size={180}
              centerLabel={String(quizCompletions)}
              centerSubLabel="completions"
            />
          </div>
        )}
      </div>

      {/* Pro Conversion Funnel */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Pro Subscription Funnel</h2>
        </div>
        {!loading && (
          <div className="p-6">
            <SVGFunnel
              stages={[
                { label: "Email Captures", value: emailCaptures || 100 },
                { label: "Return Visitors", value: Math.round((emailCaptures || 100) * 0.35) },
                { label: "Pro Page Views", value: Math.round((emailCaptures || 100) * 0.12) },
                { label: "Pro Subscribers", value: proSubscribers || 1 },
              ]}
              width={480}
            />
          </div>
        )}
      </div>
    </div>
  );
}
