export default function PropertyListingsLoading() {
  return (
    <div className="bg-white min-h-screen animate-pulse">
      {/* Header skeleton */}
      <div className="bg-slate-900 py-8 md:py-12">
        <div className="container-custom">
          <div className="h-3 w-32 bg-slate-700 rounded mb-4" />
          <div className="h-8 w-72 bg-slate-700 rounded mb-2" />
          <div className="h-4 w-96 bg-slate-800 rounded" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="container-custom space-y-2.5">
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 w-20 bg-slate-100 rounded-lg" />
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-7 w-24 bg-slate-100 rounded-lg" />
            ))}
            <div className="h-7 w-px bg-slate-200" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 w-10 bg-slate-100 rounded-lg" />
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 w-28 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Listings grid skeleton */}
      <div className="py-6 md:py-8">
        <div className="container-custom space-y-4">
          {/* Hero skeleton */}
          <div className="rounded-2xl overflow-hidden border border-slate-200">
            <div className="aspect-[3/1] bg-slate-100" />
          </div>
          {/* Grid skeleton */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="pt-2 border-t border-slate-100 flex justify-between">
                    <div className="h-5 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
