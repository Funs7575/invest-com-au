export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse" aria-busy="true" aria-label="Loading debt calculator">
      <div className="container-custom max-w-5xl">
        <div className="h-8 w-48 bg-slate-200 rounded mb-2 mx-auto" />
        <div className="h-4 w-64 bg-slate-100 rounded mb-8 mx-auto" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 border border-slate-100 rounded-2xl bg-white">
            <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 mb-3 border border-slate-100 rounded-xl">
                <div className="h-4 w-28 bg-slate-200 rounded mb-3" />
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-9 bg-slate-100 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 border border-slate-100 rounded-2xl bg-white space-y-4">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-14 w-40 bg-slate-200 rounded" />
            <div className="h-48 w-full bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
