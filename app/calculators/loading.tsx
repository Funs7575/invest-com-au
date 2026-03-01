export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse">
      <div className="container-custom max-w-5xl">
        {/* Header */}
        <div className="h-8 w-56 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-80 bg-slate-100 rounded mb-8" />

        {/* Calculator cards */}
        <div className="grid md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                <div className="h-5 w-40 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-full bg-slate-100 rounded mb-2" />
              <div className="h-4 w-2/3 bg-slate-100 rounded mb-4" />
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
