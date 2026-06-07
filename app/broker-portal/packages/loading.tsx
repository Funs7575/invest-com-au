export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading packages">
      {/* Header */}
      <div className="h-7 w-36 bg-slate-200 rounded" />
      <div className="h-4 w-60 bg-slate-100 rounded" />

      {/* 3 pricing tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 border border-slate-100 rounded-xl space-y-4">
            <div className="h-5 w-20 bg-slate-200 rounded" />
            <div className="h-9 w-28 bg-slate-200 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-slate-200 rounded-full shrink-0" />
                  <div className="h-4 w-44 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
            <div className="h-10 w-full bg-slate-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
