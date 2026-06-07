export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse" aria-busy="true" aria-label="Loading tax optimizer">
      <div className="container-custom max-w-5xl">
        <div className="h-8 w-48 bg-slate-200 rounded mb-2 mx-auto" />
        <div className="h-4 w-64 bg-slate-100 rounded mb-8 mx-auto" />
        <div className="grid md:grid-cols-5 gap-6">
          {/* holdings input panel */}
          <div className="md:col-span-3 p-6 border border-slate-100 rounded-2xl bg-white">
            <div className="h-4 w-28 bg-slate-200 rounded mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2 mb-3">
                {[40, 36, 28, 28, 24].map((w, j) => (
                  <div key={j} className={`h-10 bg-slate-100 rounded-lg`} style={{ width: `${w}%` }} />
                ))}
              </div>
            ))}
            <div className="h-10 w-full bg-slate-100 rounded-lg mt-2" />
          </div>
          {/* results */}
          <div className="md:col-span-2 p-6 border border-slate-100 rounded-2xl bg-white space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                <div className="h-6 w-28 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
