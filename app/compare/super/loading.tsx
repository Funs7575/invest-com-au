export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading super fund comparison...">
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
        <div className="h-8 w-72 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-[30rem] bg-slate-100 rounded mb-6" />

        {/* Filter row */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-28 bg-slate-100 rounded-full" />
          ))}
          <div className="ml-auto h-9 w-44 bg-slate-100 rounded-full" />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-6 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="h-3.5 w-28 bg-slate-200 rounded flex-1" />
            <div className="h-3.5 w-20 bg-slate-200 rounded" />
            <div className="h-3.5 w-20 bg-slate-200 rounded" />
            <div className="h-3.5 w-20 bg-slate-200 rounded" />
            <div className="h-3.5 w-16 bg-slate-200 rounded" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 bg-slate-200 rounded-lg" />
                <div>
                  <div className="h-4 w-36 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-3.5 w-20 bg-slate-100 rounded" />
              <div className="h-3.5 w-20 bg-slate-100 rounded" />
              <div className="h-3.5 w-20 bg-slate-100 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 bg-slate-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-10 bg-slate-50 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Compliance footer placeholder */}
        <div className="h-10 bg-slate-50 rounded-lg mt-8" />
      </div>
    </div>
  );
}
