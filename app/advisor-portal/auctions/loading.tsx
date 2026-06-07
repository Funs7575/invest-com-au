export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading auctions">
      <div className="container-custom max-w-4xl">
        <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-64 bg-slate-100 rounded mb-6" />
        {/* stat strip */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border border-slate-100 rounded-xl bg-white">
              <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
              <div className="h-7 w-12 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        {/* auction cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 mb-3 border border-slate-100 rounded-xl bg-white">
            <div className="flex justify-between mb-3">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3 w-72 bg-slate-100 rounded mb-4" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-32 bg-slate-200 rounded-lg" />
              <div className="h-9 w-24 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
