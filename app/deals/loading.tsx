export default function DealsLoading() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-5xl">
        <div className="animate-pulse">
          {/* Breadcrumb */}
          <div className="h-3 bg-slate-200 rounded w-24 mb-6" />

          {/* Title */}
          <div className="h-9 bg-slate-200 rounded w-64 mb-2" />
          <div className="h-4 bg-slate-100 rounded w-80 mb-6" />

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-200 rounded-full w-24" />
            ))}
          </div>

          {/* Deal cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-28 mb-1.5" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded w-full mb-1.5" />
                <div className="h-3 bg-slate-100 rounded w-4/5 mb-4" />
                <div className="h-10 bg-amber-200 rounded-lg w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
