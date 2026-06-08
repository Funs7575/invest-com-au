export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading placements...">
      {/* Page title */}
      <div>
        <div className="h-7 w-36 bg-slate-200 rounded mb-1.5" />
        <div className="h-4 w-80 bg-slate-100 rounded" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {["All", "Available", "Full"].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-slate-100 rounded-full" />
        ))}
      </div>

      {/* Placement cards */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-3">
            {/* Icon + name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl" />
              <div>
                <div className="h-4 w-40 bg-slate-200 rounded mb-1.5" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            </div>
            {/* Availability badge */}
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>

          {/* Availability bar */}
          <div className="h-2 w-full bg-slate-100 rounded-full mb-3" />

          {/* Stats row */}
          <div className="flex gap-6">
            <div>
              <div className="h-3 w-20 bg-slate-100 rounded mb-1" />
              <div className="h-4 w-12 bg-slate-200 rounded" />
            </div>
            <div>
              <div className="h-3 w-20 bg-slate-100 rounded mb-1" />
              <div className="h-4 w-12 bg-slate-200 rounded" />
            </div>
            <div>
              <div className="h-3 w-20 bg-slate-100 rounded mb-1" />
              <div className="h-4 w-12 bg-slate-200 rounded" />
            </div>
            <div className="ml-auto">
              <div className="h-9 w-28 bg-slate-200 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
