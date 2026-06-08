export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading sponsored slots...">
      {/* Page title */}
      <div>
        <div className="h-7 w-40 bg-slate-200 rounded mb-1.5" />
        <div className="h-4 w-80 bg-slate-100 rounded" />
      </div>

      {/* Book new slot CTA */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
        <div>
          <div className="h-4 w-48 bg-slate-200 rounded mb-1.5" />
          <div className="h-3.5 w-64 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-lg shrink-0" />
      </div>

      {/* Booking rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="h-5 w-28 bg-slate-200 rounded mb-1.5" />
              <div className="h-3.5 w-44 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>

          {/* Date + stats row */}
          <div className="flex items-center gap-6">
            <div>
              <div className="h-3 w-16 bg-slate-100 rounded mb-1" />
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </div>
            <div>
              <div className="h-3 w-16 bg-slate-100 rounded mb-1" />
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </div>
            <div>
              <div className="h-3 w-16 bg-slate-100 rounded mb-1" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
            <div className="ml-auto h-8 w-24 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
