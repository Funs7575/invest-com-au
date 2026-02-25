export default function Loading() {
  return (
    <div className="pt-5 pb-8 md:py-12 animate-pulse">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb */}
        <div className="h-3 w-20 md:h-4 md:w-32 bg-slate-200 rounded mb-2 md:mb-6" />
        {/* Title */}
        <div className="h-7 w-56 md:h-10 md:w-72 bg-slate-200 rounded mb-1.5 md:mb-3" />
        {/* Subtitle */}
        <div className="h-3.5 w-64 md:h-5 md:w-96 bg-slate-100 rounded mb-4 md:mb-6" />
        {/* Filter pills */}
        <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 md:h-10 w-20 md:w-28 bg-slate-100 rounded-full md:rounded-lg shrink-0" />
          ))}
        </div>
        {/* Deal card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3.5 md:p-5">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-200 rounded-lg shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-14 md:h-16 bg-amber-50 rounded-lg mb-2" />
              <div className="h-9 md:h-11 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
