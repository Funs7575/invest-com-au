export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading analytics">
      {/* Header */}
      <div className="h-7 w-36 bg-slate-200 rounded" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-2">
            <div className="h-3.5 w-20 bg-slate-100 rounded" />
            <div className="h-8 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main chart area */}
      <div className="p-4 border border-slate-100 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-8 w-28 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex items-end gap-2 h-48">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-200 rounded-t"
              style={{ height: `${30 + (i * 19 + 11) % 70}%` }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 h-3 bg-slate-100 rounded" />
          ))}
        </div>
      </div>

      {/* Secondary chart */}
      <div className="p-4 border border-slate-100 rounded-xl space-y-3">
        <div className="h-5 w-36 bg-slate-200 rounded" />
        <div className="h-32 w-full bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}
