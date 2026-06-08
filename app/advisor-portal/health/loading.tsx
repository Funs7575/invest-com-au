export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading health score">
      {/* Header */}
      <div className="h-7 w-48 bg-slate-200 rounded" />

      {/* Score cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-3">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded-full">
              <div className="h-3 w-3/5 bg-slate-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart area */}
      <div className="p-4 border border-slate-100 rounded-xl space-y-3">
        <div className="h-5 w-36 bg-slate-200 rounded" />
        <div className="flex items-end gap-3 h-40 pt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-200 rounded-t"
              style={{ height: `${40 + Math.round((i * 17 + 23) % 80)}%` }}
            />
          ))}
        </div>
        <div className="flex gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 h-3 bg-slate-100 rounded" />
          ))}
        </div>
      </div>

      {/* Secondary bar charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-3">
            <div className="h-5 w-32 bg-slate-200 rounded" />
            <div className="flex items-end gap-2 h-28">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex-1 bg-slate-100 rounded-t" style={{ height: `${50 + (j * 13) % 50}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
