export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6" aria-busy="true" aria-label="Loading conversions">
      {/* Header */}
      <div className="h-7 w-40 bg-slate-200 rounded" />

      {/* Table */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 p-3 bg-slate-50 border-b border-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-4 bg-slate-200 rounded" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b border-slate-100 last:border-0">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex-1 h-4 bg-slate-100 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
