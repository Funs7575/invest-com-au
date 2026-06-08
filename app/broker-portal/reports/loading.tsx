export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading reports...">
      {/* Page title */}
      <div>
        <div className="h-7 w-28 bg-slate-200 rounded mb-1.5" />
        <div className="h-4 w-72 bg-slate-100 rounded" />
      </div>

      {/* Date range controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-20 bg-slate-100 rounded-lg" />
        ))}
        <div className="ml-auto h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="h-3 w-20 bg-slate-100 rounded mb-2" />
            <div className="h-6 w-24 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
        <div className="h-48 bg-slate-50 rounded-lg" />
      </div>

      {/* Campaign breakdown table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="h-5 w-44 bg-slate-200 rounded" />
        </div>
        <div className="flex items-center gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-16 bg-slate-200 rounded" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50">
            <div className="h-4 w-40 bg-slate-200 rounded flex-1" />
            <div className="h-3.5 w-16 bg-slate-100 rounded" />
            <div className="h-3.5 w-16 bg-slate-100 rounded" />
            <div className="h-3.5 w-16 bg-slate-100 rounded" />
            <div className="h-3.5 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
