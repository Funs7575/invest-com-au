export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading upgrade options">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-36 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* plan cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={`p-6 border-2 rounded-2xl ${i === 1 ? "border-violet-200 bg-violet-50" : "border-slate-100 bg-white"}`}>
              <div className="h-5 w-16 bg-slate-200 rounded mb-3" />
              <div className="h-10 w-24 bg-slate-200 rounded mb-4" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-slate-200 rounded-full shrink-0" />
                  <div className="h-3.5 w-40 bg-slate-100 rounded" />
                </div>
              ))}
              <div className="h-11 w-full bg-slate-200 rounded-xl mt-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
