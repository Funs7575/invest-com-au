export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading A/B tests...">
      {/* Page title */}
      <div>
        <div className="h-7 w-32 bg-slate-200 rounded mb-1.5" />
        <div className="h-4 w-72 bg-slate-100 rounded" />
      </div>

      {/* Create button row */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-slate-100 rounded" />
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Test cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="h-5 w-48 bg-slate-200 rounded mb-1.5" />
              <div className="h-3.5 w-64 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full shrink-0 ml-4" />
          </div>

          {/* Variant A vs B */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-slate-100 rounded-lg p-3">
              <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
              <div className="h-4 w-40 bg-slate-200 rounded mb-2" />
              <div className="flex gap-4">
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="border border-slate-100 rounded-lg p-3">
              <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
              <div className="h-4 w-40 bg-slate-200 rounded mb-2" />
              <div className="flex gap-4">
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            </div>
          </div>

          {/* Confidence bar + actions */}
          <div className="flex items-center justify-between">
            <div className="h-3 w-40 bg-slate-100 rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-slate-100 rounded-lg" />
              <div className="h-8 w-20 bg-slate-100 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
