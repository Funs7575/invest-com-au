export default function ReviewsLoading() {
  return (
    <div className="py-12">
      <div className="container-custom max-w-4xl">
        <div className="animate-pulse">
          {/* Title */}
          <div className="h-9 bg-slate-200 rounded w-56 mb-3" />
          <div className="h-4 bg-slate-100 rounded w-96 mb-8" />

          {/* Review cards */}
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-32 mb-1.5" />
                    <div className="h-3 bg-amber-200 rounded w-20" />
                  </div>
                  <div className="h-6 bg-slate-200 rounded-full w-16" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-full mb-1.5" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
