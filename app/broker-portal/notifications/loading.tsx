export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading notifications...">
      {/* Page title */}
      <div>
        <div className="h-7 w-36 bg-slate-200 rounded mb-1.5" />
        <div className="h-4 w-64 bg-slate-100 rounded" />
      </div>

      {/* Notification items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3.5">
          {/* Icon circle */}
          <div className="w-9 h-9 bg-slate-100 rounded-full shrink-0 mt-0.5" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="h-4 w-52 bg-slate-200 rounded" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>
            <div className="h-3.5 w-full bg-slate-100 rounded mb-1" />
            <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
