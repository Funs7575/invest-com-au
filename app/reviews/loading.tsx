export default function Loading() {
  return (
    <div className="pt-5 pb-8 md:py-12 animate-pulse">
      <div className="container-custom">
        {/* Breadcrumb */}
        <div className="h-3 w-20 md:h-4 md:w-32 bg-slate-200 rounded mb-2 md:mb-6" />
        {/* Title */}
        <div className="h-7 w-44 md:h-10 md:w-56 bg-slate-200 rounded mb-1 md:mb-2" />
        {/* Subtitle */}
        <div className="h-3.5 w-48 md:h-5 md:w-80 bg-slate-100 rounded mb-4 md:mb-8" />
        {/* Section heading */}
        <div className="h-5 w-40 md:h-7 md:w-52 bg-slate-200 rounded mb-2.5 md:mb-4" />
        {/* Review cards grid — 2-col on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6 mb-8 md:mb-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 md:p-5">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-200 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 w-20 md:h-5 md:w-36 bg-slate-200 rounded mb-1" />
                    <div className="h-3 w-14 md:w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 md:h-4 w-12 md:w-16 bg-slate-100 rounded" />
                    <div className="h-3 md:h-4 w-10 md:w-12 bg-slate-200 rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 md:h-4 w-12 md:w-16 bg-slate-100 rounded" />
                    <div className="h-3 md:h-4 w-10 md:w-12 bg-slate-200 rounded" />
                  </div>
                </div>
              </div>
              <div className="px-3 md:px-5 py-2 md:py-3 bg-slate-50 border-t border-slate-200">
                <div className="h-3.5 md:h-4 w-20 md:w-28 bg-slate-200 rounded mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
