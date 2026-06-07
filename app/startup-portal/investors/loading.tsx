export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading investors">
      {/* Header */}
      <div className="h-7 w-36 bg-slate-200 rounded" />

      {/* Investor card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 border border-slate-100 rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-slate-200 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <div className="h-5 w-32 bg-slate-200 rounded" />
                <div className="h-3.5 w-24 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-3/4 bg-slate-100 rounded" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, t) => (
                <div key={t} className="h-5 w-14 bg-slate-200 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
