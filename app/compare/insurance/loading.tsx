export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading insurance comparison...">
      {/* CompareNav placeholder */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container-custom">
          <div className="flex gap-1 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-24 bg-slate-100 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="container-custom pt-5 pb-8">
        {/* Banner placeholder */}
        <div className="h-14 bg-slate-100 rounded-xl mb-5" />

        {/* Page heading */}
        <div className="h-8 w-80 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-[28rem] bg-slate-100 rounded mb-6" />

        {/* Insurance type tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {["Life", "Income Protection", "Home & Contents", "Health"].map((_, i) => (
            <div key={i} className="h-10 w-36 bg-slate-100 rounded-xl shrink-0" />
          ))}
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="h-3.5 w-full bg-slate-100 rounded" />
                <div className="h-3.5 w-5/6 bg-slate-100 rounded" />
              </div>
              <div className="h-9 w-full bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Compliance footer placeholder */}
        <div className="h-10 bg-slate-50 rounded-lg" />
      </div>
    </div>
  );
}
