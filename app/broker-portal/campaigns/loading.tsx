export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading campaigns...">
      {/* Page title */}
      <div>
        <div className="h-7 w-36 bg-slate-200 rounded mb-1.5" />
        <div className="h-4 w-80 bg-slate-100 rounded" />
      </div>

      {/* Filter tabs + bulk action row */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-slate-100 rounded-full" />
        ))}
        <div className="ml-auto h-9 w-36 bg-slate-200 rounded-lg" />
      </div>

      {/* Campaign cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4">
          {/* Checkbox */}
          <div className="w-4 h-4 bg-slate-200 rounded mt-0.5 shrink-0" />

          {/* Icon */}
          <div className="w-9 h-9 bg-slate-100 rounded-lg shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3.5 w-56 bg-slate-100 rounded mb-2" />
            <div className="flex gap-4">
              <div className="h-3 w-24 bg-slate-100 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          </div>

          {/* CTA */}
          <div className="h-8 w-20 bg-slate-100 rounded-lg shrink-0 self-start mt-0.5" />
        </div>
      ))}
    </div>
  );
}
