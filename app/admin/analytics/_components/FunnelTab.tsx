"use client";

import SVGFunnel from "@/components/charts/SVGFunnel";

interface FunnelStage {
  label: string;
  value: number;
}

interface FunnelTabProps {
  loading: boolean;
  funnelData: FunnelStage[];
}

export default function FunnelTab({ loading, funnelData }: FunnelTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Conversion Funnel</h2>
          <p className="text-xs text-slate-500">Visual representation of user journey from homepage to signup.</p>
        </div>
        {loading ? (
          <div className="p-8 animate-pulse h-60 bg-slate-100" />
        ) : (
          <div className="p-6">
            <SVGFunnel
              stages={funnelData}
              width={520}
              stageHeight={56}
              gap={6}
            />
          </div>
        )}
      </div>

      {/* Funnel Stage Details */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stage-by-Stage Breakdown</h2>
        </div>
        {!loading && (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stage</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Count</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">% of Total</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Drop-off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {funnelData.map((stage, i, arr) => {
                const total = arr[0]?.value || 1;
                const prev = i > 0 ? arr[i - 1].value : stage.value;
                const dropOff = i > 0 ? (((prev - stage.value) / prev) * 100).toFixed(1) : "---";
                return (
                  <tr key={stage.label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{stage.label}</td>
                    <td className="px-4 py-3 text-sm text-right text-amber-600 font-semibold">{stage.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{((stage.value / total) * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {i > 0 ? (
                        <span className="text-red-500 font-semibold">-{dropOff}%</span>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
