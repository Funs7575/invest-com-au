export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading dashboard">
      {/* Header */}
      <div className="h-8 w-48 bg-slate-200 rounded" />

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-2">
            <div className="h-3.5 w-20 bg-slate-100 rounded" />
            <div className="h-8 w-28 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* 2 chart areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-3">
            <div className="h-5 w-32 bg-slate-200 rounded" />
            <div className="flex items-end gap-2 h-36">
              {Array.from({ length: 8 }).map((_, j) => (
                <div
                  key={j}
                  className="flex-1 bg-slate-200 rounded-t"
                  style={{ height: `${35 + (j * 17 + 13) % 65}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity list */}
      <div className="p-4 border border-slate-100 rounded-xl space-y-3">
        <div className="h-5 w-36 bg-slate-200 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
            <div className="h-8 w-8 bg-slate-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
            <div className="h-3.5 w-16 bg-slate-100 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
