export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading net worth">
      <div className="container-custom max-w-4xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-28 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-48 bg-slate-100 rounded" />
        </div>
        {/* big total card */}
        <div className="p-6 mb-6 border border-slate-100 rounded-2xl bg-white">
          <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
          <div className="h-12 w-44 bg-slate-200 rounded mb-3" />
          <div className="h-2.5 w-full bg-slate-100 rounded-full" />
        </div>
        {/* asset / liability grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {["Assets", "Liabilities"].map((label) => (
            <div key={label} className="p-5 border border-slate-100 rounded-xl bg-white">
              <div className="h-4 w-20 bg-slate-200 rounded mb-4" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between mb-3">
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
