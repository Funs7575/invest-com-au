export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse">
      <div className="container-custom max-w-6xl">
        {/* Breadcrumb */}
        <div className="h-3 w-32 bg-slate-100 rounded mb-6" />

        {/* Header */}
        <div className="h-8 w-80 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-full max-w-lg bg-slate-100 rounded mb-8" />

        {/* Score cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="h-2 flex-1 bg-slate-100 rounded-full" />
                    <div className="h-3 w-8 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
