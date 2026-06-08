export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6" aria-busy="true" aria-label="Loading reviews">
      {/* Header */}
      <div className="h-7 w-36 bg-slate-200 rounded" />

      {/* Review items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, s) => (
                <div key={s} className="h-4 w-4 bg-slate-200 rounded-sm" />
              ))}
            </div>
            <div className="h-3.5 w-20 bg-slate-100 rounded" />
          </div>
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-full bg-slate-100 rounded" />
          <div className="h-4 w-4/5 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}
