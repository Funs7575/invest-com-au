export default function Loading() {
  return (
    <div className="pt-5 pb-8 md:py-12 animate-pulse">
      <div className="container-custom">
        <div className="h-7 w-48 md:h-10 md:w-80 bg-slate-200 rounded mb-1.5 md:mb-2" />
        <div className="h-3.5 w-56 md:h-5 md:w-96 bg-slate-100 rounded mb-3 md:mb-6" />
        {/* Mobile: filter + search inline */}
        <div className="md:hidden flex gap-2 mb-3">
          <div className="h-8 w-16 bg-slate-100 rounded-full" />
          <div className="h-8 flex-1 bg-slate-100 rounded-full" />
        </div>
        {/* Desktop: filter pills */}
        <div className="hidden md:flex gap-2 mb-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-slate-200 rounded-full" />
          ))}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 h-12" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 border-t border-slate-100 flex items-center px-4 gap-8">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-8 w-24 bg-slate-200 rounded-lg ml-auto" />
            </div>
          ))}
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 bg-slate-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-10 bg-slate-50 rounded-md" />
                ))}
              </div>
              <div className="h-9 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
