export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading alerts">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-28 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* channel toggles */}
        <div className="p-5 border border-slate-100 rounded-xl bg-white mb-5">
          <div className="h-4 w-36 bg-slate-200 rounded mb-4" />
          {["Email", "Push", "SMS"].map((ch) => (
            <div key={ch} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
              <div>
                <div className="h-4 w-24 bg-slate-200 rounded mb-1" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-11 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
        {/* alert rule rows */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-4 border-b border-slate-100">
            <div>
              <div className="h-4 w-44 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-11 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
