export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading upgrade plans">
      {/* Header */}
      <div className="h-7 w-40 bg-slate-200 rounded" />
      <div className="h-4 w-64 bg-slate-100 rounded" />

      {/* 2 plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-6 border border-slate-100 rounded-xl space-y-4">
            <div className="h-5 w-24 bg-slate-200 rounded" />
            <div className="h-9 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-slate-200 rounded-full shrink-0" />
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
            <div className="h-10 w-full bg-slate-200 rounded-lg mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
