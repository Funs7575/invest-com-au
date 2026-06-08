export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading non-resident brokers...">
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
        {/* Page heading */}
        <div className="h-8 w-80 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-[32rem] bg-slate-100 rounded mb-2" />
        <div className="h-4 w-[26rem] bg-slate-100 rounded mb-6" />

        {/* Intro blurb */}
        <div className="h-14 bg-slate-50 rounded-xl border border-slate-100 mb-6" />

        {/* Desktop broker table */}
        <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="flex items-center gap-6 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="h-3.5 w-28 bg-slate-200 rounded flex-1" />
            <div className="h-3.5 w-16 bg-slate-200 rounded" />
            <div className="h-3.5 w-16 bg-slate-200 rounded" />
            <div className="h-3.5 w-16 bg-slate-200 rounded" />
            <div className="h-3.5 w-20 bg-slate-200 rounded" />
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                <div>
                  <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-3.5 w-16 bg-slate-100 rounded" />
              <div className="h-3.5 w-16 bg-slate-100 rounded" />
              <div className="h-3.5 w-16 bg-slate-100 rounded" />
              <div className="h-5 w-20 bg-slate-100 rounded-full" />
              <div className="h-9 w-24 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-12 bg-slate-50 rounded-lg" />
                ))}
              </div>
              <div className="h-9 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Compliance footer placeholder */}
        <div className="h-10 bg-slate-50 rounded-lg" />
      </div>
    </div>
  );
}
