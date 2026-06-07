export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading round details">
      {/* Header */}
      <div className="h-7 w-40 bg-slate-200 rounded" />

      {/* Fundraise stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-2">
            <div className="h-3.5 w-20 bg-slate-100 rounded" />
            <div className="h-7 w-28 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="p-4 border border-slate-100 rounded-xl space-y-3">
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
        </div>
        <div className="h-4 w-full bg-slate-100 rounded-full">
          <div className="h-4 w-3/5 bg-slate-200 rounded-full" />
        </div>
        <div className="h-3 w-32 bg-slate-100 rounded" />
      </div>

      {/* Investor table */}
      <div className="h-5 w-32 bg-slate-200 rounded" />
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <div className="flex gap-4 p-3 bg-slate-50 border-b border-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-4 bg-slate-200 rounded" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
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
