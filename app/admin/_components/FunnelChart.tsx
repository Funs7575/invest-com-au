"use client";

interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface FunnelChartProps {
  title: string;
  description?: string;
  stages: FunnelStage[];
  loading?: boolean;
}

const DEFAULT_COLORS = [
  "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe",
  "#6366f1", "#818cf8", "#a5b4fc",
];

export default function FunnelChart({ title, description, stages, loading }: FunnelChartProps) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" style={{ width: `${100 - i * 15}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const maxValue = stages[0]?.value || 1;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-4 md:p-6">
        {stages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No data available yet.</p>
        ) : (
          <div className="space-y-2">
            {stages.map((stage, i) => {
              const widthPct = Math.max(8, (stage.value / maxValue) * 100);
              const prevValue = i > 0 ? (stages[i - 1]?.value ?? stage.value) : stage.value;
              const conversionRate = i > 0 && prevValue > 0
                ? ((stage.value / prevValue) * 100).toFixed(1)
                : null;
              const totalRate = ((stage.value / maxValue) * 100).toFixed(1);
              const color = stage.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] || "#64748b";

              return (
                <div key={stage.label} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">{stage.label}</span>
                      {conversionRate && (
                        <span className="text-[0.62rem] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {conversionRate}% conv.
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{stage.value.toLocaleString()}</span>
                      <span className="text-[0.62rem] text-slate-400">{totalRate}%</span>
                    </div>
                  </div>
                  <div className="h-8 bg-slate-50 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500 relative flex items-center justify-end pr-2"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: color,
                        opacity: 0.85,
                      }}
                    >
                      {widthPct > 20 && (
                        <span className="text-[0.62rem] font-bold text-white/90">
                          {stage.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <div className="flex items-center gap-1 text-[0.56rem] text-slate-400">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        {stages[i + 1] !== undefined && prevValue > 0 && stage.value > 0 && (
                          <span className="text-red-400 font-medium">
                            -{((1 - (stages[i + 1]?.value ?? 0) / stage.value) * 100).toFixed(1)}% drop
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
