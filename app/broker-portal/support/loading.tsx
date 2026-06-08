export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading support...">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 bg-slate-200 rounded mb-1.5" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-36 bg-slate-200 rounded-lg" />
      </div>

      {/* Ticket list */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3.5">
          {/* Status icon */}
          <div className="w-9 h-9 bg-slate-100 rounded-full shrink-0 mt-0.5" />

          {/* Ticket content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="h-4 w-56 bg-slate-200 rounded" />
              <div className="flex gap-2 shrink-0">
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
                <div className="h-5 w-14 bg-slate-100 rounded-full" />
              </div>
            </div>
            <div className="h-3.5 w-full bg-slate-100 rounded mb-1" />
            <div className="h-3.5 w-2/3 bg-slate-100 rounded mb-2" />
            <div className="flex gap-4">
              <div className="h-3 w-20 bg-slate-50 rounded" />
              <div className="h-3 w-20 bg-slate-50 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
