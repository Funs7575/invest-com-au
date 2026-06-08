export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading reviews">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-56 bg-slate-100 rounded" />
        </div>
        {/* review cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 mb-4 border border-slate-100 rounded-xl bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-slate-200 rounded-full" />
              <div>
                <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="flex gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, s) => (
                <div key={s} className="h-4 w-4 bg-slate-200 rounded" />
              ))}
            </div>
            <div className="h-3 w-full bg-slate-100 rounded mb-1" />
            <div className="h-3 w-4/5 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
