export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6" aria-busy="true" aria-label="Loading briefs">
      {/* Header */}
      <div className="h-7 w-32 bg-slate-200 rounded" />

      {/* Brief items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="h-5 w-56 bg-slate-200 rounded" />
            <div className="h-3.5 w-16 bg-slate-100 rounded shrink-0" />
          </div>
          <div className="h-4 w-full bg-slate-100 rounded" />
          <div className="h-4 w-3/4 bg-slate-100 rounded" />
          <div className="flex gap-2 mt-1">
            {Array.from({ length: 3 }).map((_, t) => (
              <div key={t} className="h-5 w-16 bg-slate-200 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
