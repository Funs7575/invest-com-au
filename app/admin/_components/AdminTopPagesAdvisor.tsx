"use client";

import Link from "next/link";

interface Props {
  topPages: { page: string; count: number }[];
  advisorFunnel: { views: number; leads: number };
}

export default function AdminTopPagesAdvisor({ topPages, advisorFunnel }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Pages (30d Clicks)</h2>
        {topPages.length === 0 ? (
          <p className="text-sm text-slate-500">No click data yet.</p>
        ) : (
          <div className="space-y-1.5">
            {topPages.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-slate-50">
                <span className="text-slate-700 truncate text-xs flex-1 min-w-0 mr-2">{p.page}</span>
                <span className="text-xs font-bold text-slate-900 shrink-0">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Advisor Funnel (30d)</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Profile Views</span>
            <span className="text-sm font-bold text-slate-900">{advisorFunnel.views}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: "100%" }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Enquiries Submitted</span>
            <span className="text-sm font-bold text-slate-900">{advisorFunnel.leads}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: advisorFunnel.views > 0 ? `${Math.max(5, (advisorFunnel.leads / advisorFunnel.views) * 100)}%` : "0%" }} />
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            Conversion: <span className="font-bold text-slate-700">{advisorFunnel.views > 0 ? `${((advisorFunnel.leads / advisorFunnel.views) * 100).toFixed(1)}%` : "N/A"}</span>
          </div>
          <Link href="/admin/advisors" className="block text-xs text-amber-600 hover:text-amber-700 font-semibold">Manage Advisors →</Link>
        </div>
      </div>
    </div>
  );
}
