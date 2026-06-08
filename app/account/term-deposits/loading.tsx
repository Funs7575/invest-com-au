export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading term deposits">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-40 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-60 bg-slate-100 rounded" />
        </div>
        {/* summary stat strip */}
        <div className="flex gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 p-4 border border-slate-100 rounded-xl bg-white">
              <div className="h-3 w-20 bg-slate-100 rounded mb-2" />
              <div className="h-6 w-24 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        {/* deposit rows */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-4 border-b border-slate-100">
            <div>
              <div className="h-4 w-44 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
            <div className="text-right">
              <div className="h-4 w-20 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
