export default function Loading() {
  return (
    <div className="pt-5 pb-8 md:py-12 animate-pulse">
      <div className="container-custom">
        {/* Header */}
        <div className="h-6 md:h-10 w-48 md:w-72 bg-slate-200 rounded mb-1 md:mb-3" />
        <div className="h-3.5 md:h-5 w-56 md:w-96 bg-slate-100 rounded mb-2.5 md:mb-10" />
        {/* Search bar */}
        <div className="h-9 md:h-11 bg-slate-100 rounded-lg mb-2 md:mb-4" />
        {/* Category pills */}
        <div className="flex gap-1.5 md:gap-2 mb-3 md:mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 md:h-9 w-14 md:w-20 bg-slate-200 rounded-full" />
          ))}
        </div>
        {/* Article grid — 2 col mobile, 3 col desktop */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-lg md:rounded-xl overflow-hidden">
              <div className="aspect-[16/9] bg-slate-100" />
              <div className="p-2.5 md:p-6">
                <div className="flex gap-1 md:gap-2 mb-1 md:mb-3">
                  <div className="h-4 md:h-5 w-12 md:w-16 bg-slate-200 rounded-full" />
                  <div className="h-4 md:h-5 w-8 md:w-12 bg-slate-100 rounded-full" />
                </div>
                <div className="h-3.5 md:h-6 w-full bg-slate-200 rounded mb-1 md:mb-2" />
                <div className="h-3 md:h-4 w-3/4 bg-slate-100 rounded hidden md:block mb-4" />
                <div className="h-3 md:h-4 w-12 md:w-24 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
