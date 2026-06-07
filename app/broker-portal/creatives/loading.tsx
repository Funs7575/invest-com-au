export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6" aria-busy="true" aria-label="Loading creatives">
      {/* Header + upload button */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-slate-200 rounded" />
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* 4-col grid of creative thumbnail cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border border-slate-100 rounded-xl overflow-hidden space-y-2">
            <div className="h-28 w-full bg-slate-200" />
            <div className="p-2 space-y-1.5">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
